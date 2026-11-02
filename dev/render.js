// Builds board pages the way Jcink does: data -> HTML templates -> wrapper -> macros.
const { loadSkin, loadData } = require("./skin");

const stripTags = (html) => String(html).replace(/<[^>]*>/g, "");
const nl2br = (text) => String(text).replace(/\r?\n/g, "<br />");

function createRenderer(query, cookies = {}) {
  const skin = loadSkin();
  const data = loadData();
  const { board, fields, members, categories } = data;
  const warnings = new Set();

  // ---------- template filling ----------

  // <!-- |var| --> -> value. Jcink prints nothing for unknown variables; we do the same but warn.
  function fill(tpl, vars, where) {
    return tpl.replace(/<!--\s*\|([a-zA-Z0-9_]+)\|\s*-->/g, (_, key) => {
      if (key in vars) return vars[key] ?? "";
      if (/^field_\d+$/.test(key)) warnings.add(`${where}: <!-- |${key}| --> isn't in data/custom-fields.json`);
      else warnings.add(`${where}: <!-- |${key}| --> isn't simulated locally`);
      return "";
    });
  }

  // <% CORE %> -> value
  const core = (tpl, parts) =>
    tpl.replace(/<%\s*([A-Z_ ]+?)\s*%>/g, (tag, key) => (key in parts ? parts[key] : tag));

  const template = (name, vars, parts = {}) => core(fill(skin.templates[name], vars, name), parts);

  function applyMacros(html) {
    // Macros can contain other macros (e.g. AVATAR), so run a couple of passes.
    for (let i = 0; i < 3; i++) {
      html = html.replace(/<\{([A-Za-z0-9_]+)\}>/g, (_, key) => {
        if (key in skin.macros) return skin.macros[key];
        if (key in data.fallbackMacros) return data.fallbackMacros[key];
        warnings.add(`Macro <{${key}}> isn't in skin/macros.json`);
        return `<span class="dev-missing">&lt;{${key}}&gt;</span>`;
      });
    }
    return html;
  }

  // ---------- data lookups ----------

  const memberById = new Map(members.map((m) => [m.id, m]));
  const group = (id) => board.groups[id] || { title: "Members", prefix: "", suffix: "", icon: "" };
  const viewer = query.guest ? null : memberById.get(board.viewer) || null;

  const allForums = [];
  for (const cat of categories) {
    for (const f of cat.forums || []) {
      allForums.push({ ...f, cat });
      for (const sub of f.subforums || []) allForums.push({ ...sub, cat, parent: f });
    }
  }
  const forumById = (id) => allForums.find((f) => f.id === Number(id));
  const allTopics = allForums.flatMap((f) => (f.topics || []).map((t) => ({ ...t, forum: f })));

  // Custom fields: values from members.json, falling back to the defaults in custom-fields.json.
  function fieldVars(member) {
    const vars = {};
    for (const [key, def] of Object.entries(fields)) {
      let value = member?.fields?.[key] ?? def.default ?? "";
      if (def.type === "dropdown" && value && def.options && !def.options.includes(value)) {
        warnings.add(`${member.name}: "${value}" isn't one of the options for ${key} (${def.label})`);
      }
      vars[key] = def.type === "textarea" ? nl2br(value) : value;
    }
    for (const key of Object.keys(member?.fields || {})) {
      if (!(key in fields)) warnings.add(`${member.name} has ${key}, but it isn't defined in data/custom-fields.json`);
    }
    return vars;
  }

  const profileUrl = (m) => `index.php?showuser=${m.id}`;
  const memberLink = (m) => {
    const g = group(m.group);
    return `<a href='${profileUrl(m)}'>${g.prefix}${m.name}${g.suffix}</a>`;
  };

  // Variables every member-based template shares (mini profile, post row, profile, member list).
  function memberVars(m) {
    const g = group(m.group);
    const avatarUrl = m.avatar || "<{AVATAR_URL}>";
    return {
      id: m.id,
      parent_id: m.parent_id || 0,
      name: memberLink(m),
      author_name: m.name,
      member_name: m.name,
      avatar: m.avatar ? `<img src='${m.avatar}' border='0' alt='' />` : "<{AVATAR}>",
      avatar_url: avatarUrl,
      posts: m.posts,
      points: m.points,
      title: m.title,
      g_id: m.group,
      g_title: g.title,
      group: g.title,
      member_group: g.title,
      prefix: g.prefix,
      suffix: g.suffix,
      g_icon: g.icon,
      member_rank_img: g.icon ? `<img src='${g.icon}' alt='' />` : "",
      member_joined: m.joined,
      joined: m.joined,
      age: m.age,
      birthday: m.birthday,
      location: m.location,
      interests: m.interests,
      website: m.website ? `<a href='${m.website}' target='_blank'><{P_WEBSITE}></a>` : "",
      website_url: m.website,
      status: m.online ? "Online" : "Offline",
      last_activity: m.last_activity,
      last_post: m.last_activity,
      signature: m.signature,
      pm: `index.php?act=Msg&amp;CODE=04&amp;MID=${m.id}`,
      email: "",
      photo: "",
      photo_url: "",
      reputation: "",
      rep: "",
      awards: "",
      awards_total: "",
      name_prefix: "",
      name_suffix: "",
      warn_text: "",
      warn_minus: "",
      warn_img: "",
      warn_add: "",
      member_inventory: "",
      ...fieldVars(m),
    };
  }

  // ---------- forums & topics ----------

  const lastPost = (t) => t.posts[t.posts.length - 1];
  const topicUrl = (t) => `index.php?showtopic=${t.id}`;

  // Topics are listed newest-activity first, so the forum's "last post" is its first topic.
  function forumRowVars(f) {
    const topics = f.topics || [];
    const last = topics[0];
    const lp = last && lastPost(last);
    const poster = lp && memberById.get(lp.author);
    const subs = f.subforums || [];
    const subList = subs
      .map((s) => `${s.new_posts ? "<{SUBLINKS_NEW}>" : ""}<a href='index.php?showforum=${s.id}'>${s.name}</a>`)
      .join("<{SUB_SEPCHAR}>");
    const replies = topics.reduce((n, t) => n + t.posts.length - 1, 0);
    return {
      img_new_post: f.locked ? "<{C_LOCKED}>" : f.new_posts ? "<{C_ON}>" : "<{C_OFF}>",
      class_new_post: f.new_posts ? "forum-new-post" : "",
      name: `<a href='index.php?showforum=${f.id}'>${f.name}</a>`,
      name_text: f.name,
      forum_url: `index.php?showforum=${f.id}`,
      forum_id: f.id,
      cat_id: f.cat.id,
      description: f.description || "",
      description_clean: stripTags(f.description || ""),
      topics: topics.length,
      replies,
      total_posts: topics.length + replies,
      last_post: lp ? lp.date : "--",
      last_topic: last ? `<a href='${topicUrl(last)}&amp;view=getnewpost' title='${last.title}'>${last.title}</a>` : "N/A",
      last_topic_text: last ? last.title : "",
      last_topic_fulltext: last ? last.title : "",
      last_topic_url: last ? topicUrl(last) : "",
      last_topic_id: last ? last.id : "",
      last_poster: poster ? memberLink(poster) : "",
      last_poster_text: poster ? poster.name : "",
      last_poster_avatar: poster ? memberVars(poster).avatar : "",
      last_poster_avatar_url: poster ? memberVars(poster).avatar_url : "",
      last_poster_url: poster ? profileUrl(poster) : "",
      last_poster_id: poster ? poster.id : "",
      last_poster_g_id: poster ? poster.group : "",
      last_poster_prefix: poster ? group(poster.group).prefix : "",
      last_poster_suffix: poster ? group(poster.group).suffix : "",
      last_unread: last ? `<a href='${topicUrl(last)}&amp;view=getlastpost'><{LAST_POST}></a>` : "",
      subforums: subs.length ? `<br /><i>Subforums:</i> ${subList}` : "",
      subforums_list: subList,
      moderators: "",
      viewing: "",
      redirect_on: f.redirect_url ? 1 : 0,
      redirect_url: f.redirect_url || "",
      redirect_hits: f.redirect_hits || 0,
    };
  }

  const forumRows = (forums, cat) =>
    forums.map((f) => ({ cat, ...f })).map((f) => template(f.redirect_url ? "redirect_row" : "forum_row", forumRowVars(f))).join("\n");

  function topicRowVars(t) {
    const first = t.posts[0];
    const lp = lastPost(t);
    const starter = memberById.get(first.author);
    const poster = memberById.get(lp.author);
    const marker = t.locked ? "<{B_LOCKED}>" : t.type === "pinned" ? "<{B_PIN}>" : t.hot ? "<{B_HOT}>" : t.new_posts ? "<{B_NEW}>" : "<{B_NORM}>";
    return {
      tid: t.id,
      macro_img: marker,
      posticon: "",
      topic: `<a href='${topicUrl(t)}' title='This topic was started: ${first.date}'>${t.title}</a>`,
      topic_text: t.title,
      topic_url: topicUrl(t),
      pages: "",
      topic_desc: t.description || "",
      description: t.description || "",
      starter: memberLink(starter),
      starter_name: starter.name,
      starter_id: starter.id,
      starter_g_id: starter.group,
      starter_avatar: memberVars(starter).avatar,
      starter_avatar_url: memberVars(starter).avatar_url,
      start_date: first.date,
      replies: `<a href='javascript:who_posted(${t.id});'>${t.posts.length - 1}</a>`,
      replies_int: t.posts.length - 1,
      views: t.views || 0,
      last_post: lp.date,
      last_poster: memberLink(poster),
      last_poster_text: poster.name,
      last_poster_avatar: memberVars(poster).avatar,
      last_poster_avatar_url: memberVars(poster).avatar_url,
      last_post_url: `${topicUrl(t)}&amp;view=getlastpost`,
      last_poster_id: poster.id,
      last_poster_g_id: poster.group,
      prefix: t.type === "pinned" ? "<b>Pinned:</b>" : "",
      go_new_post: t.new_posts ? `<a href='${topicUrl(t)}&amp;view=getnewpost'><{NEW_POST}></a>` : "",
      class_new_post: t.new_posts ? "topic-new-post" : "",
      mod_checkbox: "",
      type: t.type || "regular",
    };
  }

  // ---------- pages ----------

  const buttons = (inner) =>
    `<table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='left' nowrap='nowrap'>Pages: (1) <b>[1]</b></td><td align='right'>${inner}</td></tr></table><br />`;

  function indexPage(onlyCat) {
    const cats = onlyCat ? categories.filter((c) => c.id === Number(onlyCat)) : categories;
    const html = cats
      .map((cat) =>
        // catcollapse.js stores collapsed categories in a "Cat<id>" cookie, which Jcink reads on page load.
        template(
          "cat_head",
          cookies[`Cat${cat.id}`] === "Collapsed"
            ? { cat_id: cat.id, cat_name: cat.name, collapsed_class: " collapsed", collapse_img: "<{B_PLUS_SHOW}>", collapsed_style: "display: none;" }
            : { cat_id: cat.id, cat_name: cat.name, collapsed_class: "", collapse_img: "<{B_MINUS_HIDE}>", collapsed_style: "" },
          { FORUM_ROWS: forumRows(cat.forums || [], cat) }
        )
      )
      .join("\n");
    return { title: board.board_name, nav: [], board: html + boardStats() };
  }

  function boardStats() {
    const online = members.filter((m) => m.online);
    const s = board.stats;
    return template("board_stats", {
      total_users: online.length + s.total_guests + s.total_anons,
      total_guests: s.total_guests,
      total_anons: s.total_anons,
      total_mems: online.length,
      online_list: online.map(memberLink).join(", "),
      online_legend: "",
      list_links: "",
      events: "",
      events_limit: "",
      birthdays: s.birthdays,
      birthdays_list: s.birthdays_list,
      total_posts: allTopics.reduce((n, t) => n + t.posts.length, 0),
      total_mem_reg: members.length,
      newest_member: memberLink(members[members.length - 1]),
      most_online: s.most_online,
      most_online_date: s.most_online_date,
      online_today: online.length,
      online_today_list: online.map(memberLink).join(", "),
      most_online_oneday: s.most_online_oneday,
      most_online_oneday_date: s.most_online_oneday_date,
      quick_login: "",
      toplinks: "",
      member_groups: JSON.stringify(board.groups),
    });
  }

  function forumPage(id) {
    const f = forumById(id);
    if (!f) return notFound(`Forum ${id} isn't in data/forums.json`);
    let html = "";
    if (f.subforums?.length) {
      html += template("subf_head", { forum_id: f.id }, { FORUM_ROWS: forumRows(f.subforums, f.cat) });
    }
    let lastType = null;
    const rows = (f.topics || [])
      .map((t) => {
        const type = t.type === "pinned" ? "pinned" : "regular";
        const head = type !== lastType ? `<tr><td colspan='8' class='darkrow1'>${type === "pinned" ? "<{T_PIN_SUBHEAD}>" : "<{T_REG_SUBHEAD}>"}</td></tr>` : "";
        lastType = type;
        return head + template("topic_row", topicRowVars(t));
      })
      .join("\n");
    html += buttons(`<a href='#'><{A_POST}></a><a href='#'><{A_POLL}></a>`);
    html += template(
      "topic_list_head",
      { forum_id: f.id, forum_name: f.name, mod_form_end: "", forum_active: "", sort_options: "" },
      { ANNOUNCEMENTS: "", TOPIC_ROWS: rows || "<tr><td colspan='8' class='row4'><{NO_TOPICS}></td></tr>" }
    );
    const nav = f.parent ? [[f.parent.name, `index.php?showforum=${f.parent.id}`], [f.name]] : [[f.name]];
    return { title: `${board.board_name} -> ${f.name}`, nav: [[f.cat.name, `index.php?c=${f.cat.id}`], ...nav], board: html };
  }

  function topicPage(id) {
    const t = allTopics.find((t) => t.id === Number(id));
    if (!t) return notFound(`Topic ${id} isn't in data/forums.json`);
    const posts = t.posts
      .map((p, i) => {
        const m = memberById.get(p.author);
        const pid = t.id * 1000 + i + 1;
        const mv = memberVars(m);
        const mini = template("mini_profile", { ...mv, topic_id: t.id, forum_id: t.forum.id, icon_id: 0 });
        return template("post_row", {
          ...mv,
          pid,
          topic_id: t.id,
          forum_id: t.forum.id,
          poster_id: m.id,
          name_css: "normalname",
          post_class: "post-normal",
          post_css: i % 2 ? "post2" : "post1",
          posticon: "",
          post_icon: "",
          permalink: `index.php?showtopic=${t.id}&amp;view=findpost&amp;p=${pid}`,
          post_date: p.date,
          mod_checkbox: "",
          mini_profile: mini,
          signature: m.signature ? `<{SIG_SEPARATOR}><div class='signature'>${m.signature}</div>` : "",
          attachment: "",
          attachments: "",
          post: p.body,
          ip_address: "",
          report_link: `<a href='#'><{P_REPORT}></a>`,
          delete_button: `<a href='#'><{P_DELETE}></a>`,
          edit_button: `<a href='#'><{P_EDIT}></a>`,
          quote_button: `<a href='#'><{P_QUOTE}></a>`,
          pm: `<a href='${mv.pm}'><{P_MSG}></a>`,
          email: "",
          gtalk: "",
          aim: "",
          yahoo: "",
          msn: "",
          rep_options: "",
        });
      })
      .join("\n");
    const btns = buttons(`<a href='#'><{A_REPLY}></a><a href='#'><{A_POLL}></a><a href='#'><{A_POST}></a>`);
    const html = `<a name='top'></a>${btns}
<div class='tableborder'>
  <div class='maintitle'><{CAT_IMG}>&nbsp;<b>${t.title}</b>${t.description ? `<{TOPIC_DESC_SEPCHAR}>${t.description}` : ""}</div>
  <div class='postlinksbar'><b><a href='#'>Track this topic</a> | <a href='#'>Email this topic</a> | <a href='#'>Print this topic</a></b></div>
  ${posts}
  <div class='activeuserstrip'>1 user(s) are reading this topic (1 Guests and 0 Anonymous Users)</div>
</div>
<br />${btns}`;
    return {
      title: `${board.board_name} -> ${t.title}`,
      nav: [[t.forum.cat.name, `index.php?c=${t.forum.cat.id}`], [t.forum.name, `index.php?showforum=${t.forum.id}`], [t.title]],
      board: html,
    };
  }

  function profilePage(id) {
    const m = memberById.get(Number(id));
    if (!m) return notFound(`Member ${id} isn't in data/members.json`);
    const html = template("profile", {
      ...memberVars(m),
      parent_name: "",
      local_time: "",
      posts_day: "",
      activity: "",
      visitors: "[]",
      comments: "[]",
      comment_form: "",
      friends: "[]",
      subaccounts: "",
    });
    return { title: `${board.board_name} -> Viewing Profile: ${m.name}`, nav: [[`Viewing Profile: ${m.name}`]], board: html };
  }

  function membersPage() {
    const rows = members
      .map((m) => template("member_list_row", { ...memberVars(m), pips: "", email_macro: "", photo_macro: "" }))
      .join("\n");
    const html = template(
      "member_list_head",
      {
        search_input: "<input type='text' size='15' name='name' value='' class='forminput' />",
        group_dropdown: "<select class='forminput'><option>All Groups</option></select>",
        sortby_dropdown: "<select class='forminput'><option>Member Name</option></select>",
        order_dropdown: "<select class='forminput'><option>Ascending Order</option></select>",
        max_dropdown: "<select class='forminput'><option>10</option></select>",
        pages: "Pages: (1) <b>[1]</b>",
        photoonly_checkbox: "<input type='checkbox' value='1' name='photoonly' class='checkbox' />",
        member_groups: JSON.stringify(board.groups),
      },
      { MEMBERLIST_ROWS: rows }
    );
    return { title: `${board.board_name} -> Member List`, nav: [["Member List"]], board: html };
  }

  function notFound(message) {
    return {
      title: board.board_name,
      nav: [["Not simulated"]],
      board: `<div class='tableborder'><div class='maintitle'>Local preview</div><div class='tablepad'>${message}</div></div>`,
    };
  }

  // ---------- wrapper ----------

  function navigation(nav) {
    const links = [`<a href='index.php?act=idx'>${board.board_name}</a>`, ...nav.map(([label, url]) => (url ? `<a href='${url}'>${label}</a>` : label))];
    return `<div id='navstrip' align='left'><{F_NAV}>&nbsp;${links.join("<{F_NAV_SEP}>")}</div>\n<br />\n<br />`;
  }

  function userlinks() {
    if (!viewer) {
      return `<table width="100%" id="userlinks" cellspacing="6"><tr><td>Welcome Guest ( <a href='index.php?act=Login&amp;CODE=00'>Log In</a> | <a href='index.php?act=Reg&amp;CODE=00'>Register</a> )</td><td align='right'><a href='index.php?act=Reg&amp;CODE=reval'>Resend Validation Email</a></td></tr></table>`;
    }
    return `<table width="100%" id="userlinks" cellspacing="6"><tr><td><strong>Logged in as: <a href='${profileUrl(viewer)}'>${viewer.name}</a></strong> ( <a href='index.php?act=Login&amp;CODE=03'>Log Out</a> )</td><td align='right'><b><a href='index.php?act=UserCP&amp;CODE=00' title='User Control Panel'>My Controls</a></b> &middot; <a href='index.php?act=Search&amp;CODE=getnew'>View New Posts</a> &middot; <a href='javascript:buddy_pop();'>My Assistant</a> &middot; <a href='index.php?act=Msg&amp;CODE=01'>0 New Messages</a></td></tr></table>`;
  }

  // Wrapper variables: the logged-in member + board info + <!-- |input_x| --> from the URL.
  function wrapperVars() {
    const vars = {
      board_name: board.board_name,
      new_msg: 0,
      msg_total: 0,
      new_alerts: 0,
      skin_name: skin.info.name,
      skin_id: 1,
      skin_hidden: 0,
      skin_default: 1,
      modcp_issues: 0,
      input_IP_ADDRESS: "127.0.0.1",
    };
    for (const [k, v] of Object.entries(query)) vars[`input_${k}`] = v;
    if (viewer) {
      const g = group(viewer.group);
      Object.assign(vars, fieldVars(viewer), {
        name: viewer.name,
        id: viewer.id,
        parent_id: viewer.parent_id || 0,
        avatar: viewer.avatar || "<{AVATAR_URL}>",
        posts: viewer.posts,
        email: "",
        view_sigs: 1,
        view_avs: 1,
        joined: viewer.joined,
        last_post: viewer.last_activity,
        last_visit: viewer.last_activity,
        last_activity: viewer.last_activity,
        time_offset: 0,
        g_id: viewer.group,
        prefix: g.prefix,
        suffix: g.suffix,
        g_title: g.title,
        g_icon: g.icon,
        g_access_cp: viewer.group === 4 ? 1 : 0,
        g_is_supmod: viewer.group === 4 ? 1 : 0,
        is_mod: 0,
      });
    } else {
      Object.assign(vars, fieldVars(null), { name: "Guest", id: 0, g_id: 2, g_title: "Guests", posts: 0 });
    }
    return vars;
  }

  function page() {
    let p;
    if (query.showforum) p = forumPage(query.showforum);
    else if (query.showtopic) p = topicPage(query.showtopic);
    else if (query.showuser) p = profilePage(query.showuser);
    else if (query.act === "Members") p = membersPage();
    else if (query.act && query.act !== "idx") p = notFound(`The "${query.act}" page isn't simulated locally.`);
    else p = indexPage(query.c);

    const shouts = (board.shouts || [])
      .map((s) => `<div class='row2'><b>${memberLink(memberById.get(s.member))}</b> <span class='desc'>${s.date}</span>: ${s.text}</div>`)
      .join("");

    let html = fill(skin.wrapper, wrapperVars(), "wrapper");
    html = core(html, {
      TITLE: p.title,
      CSS: '<link rel="stylesheet" type="text/css" href="/__skin/stylesheet.css" data-dev-css />',
      "BOARD HEADER": fill(data.jcink.header, { board_name: board.board_name, userlinks: userlinks() }, "board header"),
      NAVIGATION: navigation(p.nav),
      PM: "",
      DSHOUTBOX: fill(data.jcink.shoutbox, { shouts }, "shoutbox"),
      BOARD: p.board,
      SKIN_SELECTOR: `<select class='forminput'><option>${skin.info.name}</option></select>`,
      AFFS: "",
      COPYRIGHT: data.jcink.copyright,
      STATS: "",
      JAVASCRIPT: "",
      GENERATOR: "",
    });
    return { html: applyMacros(html), warnings: [...warnings] };
  }

  return { page };
}

module.exports = { createRenderer };
