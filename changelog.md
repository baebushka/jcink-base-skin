# Changelog

Every notable change to this project is listed here, newest first.

Each version is listed as **🆕** (added new features, extended support, further tools), **🔁** (changes and things that work differently now) or **⏺️** (bug fixes, things that were broken). The version number is also in `package.json`, so you can cross-check which version you are on.

## How the Changelog Works

Version numbers go up like this:
- **Small fixes** raise the last number (1.1.0 → 1.1.1).
- **New features** raise the middle number (1.1.1 → 1.2.0).
- **Changes that need people to redo their setup** raise the first number (1.2.0 → 2.0.0).

---

## 1.4.0 – 2026-11-05

- [ 🆕 ] A **Forums page** (`localhost:3000/__forums`, or **Forums** in the toolbar) showing the whole board as a tree: categories, forums, subforums, topics and posts, with **View** links to each one in the preview.
- [ 🆕 ] Admin CP-style forms on the Forums page to **add and edit** categories, forums (including link forums and subforums), topics (with their first post) and replies. It writes `data/forums.json` for you, in the same layout as the hand-written file.
- [ 🆕 ] **↑ / ↓** to reorder, and **Delete** (click twice to confirm) for every item. Forums and topics can be moved to another category or forum by editing them.
- [ 🆕 ] The Forums page suggests the next free ID and gives an error for a duplicate ID, an unknown post author, an empty post, deleting a topic's only post, a subforum inside a subforum, or turning a forum that still has topics into a link.
- [ 🆕 ] An **Open forums.json** button on the Forums page, and a new "The easy way: the Forums page" section in `documentation/adding-forum-content.md`.
- [ 🔁 ] The helper pages now share their styles and file-opening code (`dev/page-kit.js`). The Fields page looks and works the same.

## 1.3.0 – 2026-11-05

- [ 🆕 ] A **Fields page** (`localhost:3000/__fields`, or **Fields** in the toolbar) listing every custom profile field with its type, settings and a copyable template variable (`<!-- |field_76| -->`).
- [ 🆕 ] An Admin CP-style **Field Settings** form on the Fields page to add a field. It writes `data/custom-fields.json` in Jcink's export format, suggests the next free ID and display order, and previews a dropdown's options as you type them (one `key=Label` per line).
- [ 🆕 ] **Edit** and **Delete** for each field, plus **Show JSON** to copy a single field's code. Errors are shown for a duplicate ID, a missing title, a title or description that's too long, or a dropdown with no options.
- [ 🆕 ] An **Open custom-fields.json** button on the Fields page that opens the file on your computer, in your default app for `.json` files.
- [ 🆕 ] A step-by-step guide to custom profile fields (`documentation/custom-profile-fields.md`): reading and adding fields, the Fields page, field types, sample answers, using fields in your skin, putting them on Jcink, every setting, and fixing common warnings.
- [ 🔁 ] The README's custom profile fields section is now a short summary that links to the new guide.

## 1.2.0 – 2026-11-05

- [ 🆕 ] **Member groups** in `data/groups.json`: each group's `id`, `name`, hex colours (`clr1-hex`, `clr2-hex`, …) and any number of other CSS variables (for example `"radius": "6px"`), plus an optional `icon`. Each colour is also converted to RGB (`--clr1-rgb: 77, 182, 172;`). Starts with Jcink's five default groups: Validating, Guests, Members, Admin and Banned.
- [ 🆕 ] A **Group** dropdown in the toolbar to preview the board as any group. `<!-- |g_id| -->`, the group name, prefix and suffix change everywhere, including the logged-in member's posts. Guests shows the logged-out view.
- [ 🆕 ] A **Groups page** (`localhost:3000/__groups`) listing every group with its number, colours (hex and RGB) and CSS variables, plus a Preview button for each.
- [ 🆕 ] A **Generate** button on the Groups page that builds one CSS rule per group (selectors `#g-3, .g-3, #m-3, .m-3, .gr-3, .group-3, .members, #members`) with its hex colours, RGB colours and other variables. Ticking **Generate gradient?** also builds `--gradient-10` to `--gradient-00` lines to paste into `body`.
- [ 🆕 ] Warnings when two groups share an `id`, a colour isn't a 3- or 6-digit hex code, a CSS variable has an invalid name or contains HTML, or a member's `group` doesn't match any group.
- [ 🆕 ] A step-by-step guide to member groups (`documentation/member-groups.md`): adding groups, colours, previewing as a group, the Groups page and using `<!-- |g_id| -->` in your skin.
- [ 🆕 ] A "Development features" section at the end of the `README`, listing the preview-only tools and linking to their guides.
- [ 🔁 ] Every group's name prefix is now `<span class='g-ID'>` and its suffix `</span>` (for example `g-1`, `g-4`), so names are styled per group in the stylesheet. Admin's name is no longer red by default.
- [ 🔁 ] The starter Post Row's group class is now `g-<!-- |g_id| -->` instead of `group<!-- |g_id| -->-<!-- |post_class| -->`, matching the `g-ID` pattern.
- [ 🔁 ] Member groups moved out of `data/board.json`.
> ⚠️ If you changed `"groups"` in `data/board.json`, copy those groups into `data/groups.json` (`"title"` is now `"name"`). The preview warns you while the old `"groups"` is still there.

## 1.1.1 – 2026-11-03

- [ 🆕 ] A `documentation/` folder, starting with a step-by-step guide to adding categories, forums, topics and posts (`documentation/adding-forum-content.md`).
- [ 🆕 ] Clear error messages in the preview when a topic has no posts or a post's `author` doesn't match a member, plus a warning when two categories, forums or topics share an `id`.

## 1.1.0 – 2026-11-02

- [ 🆕 ] `changelog.md` (this file).
- [ 🆕 ] Custom profile field warnings: a required field left empty, an answer longer than the field's maximum length, and a dropdown answer that isn't one of its options.

### Changed
- [ 🔁 ] **`data/custom-fields.json` now uses Jcink's own export format** (`fid`, `ftitle`, `ftype`, `freq`, `fmaxinput` and so on), so a board's export can be pasted in as it is. Field types are `text`, `area` (multi-line) and `drop` (dropdown).
> ⚠️ If you made your own `custom-fields.json` in version 1.0.0, rewrite it in the new format. `README` section 6 shows how.
- [ 🔁 ] Dropdown answers in `data/members.json` can use either the option's key or its label. The page always shows the label.
- [ 🔁 ] The `README` installation steps are now clearer, and point to Node.js's pre-built installer (`.pkg` on Mac, `.msi` on Windows).
- [ 🔁 ] The starter Main Profile template also shows the pronouns and languages sample fields.

### Fixed
- [ ⏺️ ] Dropdown options exported with a stray `\r` (for example `no=no\r|yes=yes`) are read correctly.

## 1.0.0 – First Release

### 🎨 Housekeeping & Documentation
- [ 🆕 ] A beginner-friendly `README.md` with installation steps, a guide to every file, troubleshooting steps, and a glossary.
- [ 🆕 ] The **MIT license**.

### 💭 Jcink Integration & Feature Support 
- [ 🆕 ] **LIVE LOCAL PREVIEW** of a Jcink board at `localhost:3000`. Stylesheet changes appear instantly without reloading. Other changes reload the page automatically.
- [ 🆕 ] **JCINK'S DEFAULT SKIN INTEGRATION** to start from: the stylesheet, board wrapper and full macro set from Jcink's default skin export, plus Jcink's default HTML templates.
- [ 🆕 ] **JCINK SUPPORT** for wrapper tags (ie. `<% BOARD %>`), template variables (ie. `<!-- |name| -->`) and macros (ie. `<{A_REPLY}>`) all work as they do on Jcink.
- [ 🆕 ] **SUPPORTED PAGES** across the main views of a Jcink forum. See table below. The Board header, shoutbox and footer are copied directly from Jcink.
- [ 🆕 ] **COLLAPSIBLE CATEGORIES** using Jcink's own script, remembered after reloading.

| Page | Address | Templates used |
|---|---|---|
| Board index | `/` or `/index.php?act=idx` | Category List Header, Forum Row, Redirect Row, Board Statistics |
| Single category | `/index.php?c=1` | Category List Header, Forum Row, Redirect Row, Board Statistics |
| Forum (topic list) | `/index.php?showforum=1` | Subforum List Header*, Forum Row*, Topic List Header, Topic Row |
| Subforum | `/index.php?showforum=5` | Topic List Header, Topic Row |
| Topic | `/index.php?showtopic=1` | Post Row, Mini Profile |
| Profile | `/index.php?showuser=1` | Main Profile |
| Member list | `/index.php?act=Members` | Member List Header, Member List Row |
| Guest view | add `&guest=1` to any address above (`?guest=1` on the index) | Same as the page it's added to |

\* Only when the forum has subforums.

### 💻 Development & Technology
- [ 🆕 ] **SAMPLE CONTENT** in `data/`: board settings, member groups, members, forums, topics, posts, and shouts.
- [ 🆕 ] **Custom profile fields:** define fields once and use `<!-- |field_#| -->` in templates.
- [ 🆕 ] **BUILT-IN DEFAULTS** for the macros Jcink fills in when a macro set leaves them out (`dev/jcink/fallback-macros.json`).
- [ 🆕 ] **COPY & EXPORT** page at `localhost:3000/__copy`, with a Copy button for every Admin CP box.
- [ 🆕 ] **TERMINAL COPY** with `npm run copy -- <name>` copies one piece of the skin to the clipboard on Mac, Windows and Linux.
- [ 🆕 ] **IMPORTABLE SKIN FILES VIA** **`npm run build`** in `dist/`: a full skin file laid out like Jcink's own export, and a templates-only file.
- [ 🆕 ] **WARNING BADGE** in the preview's toolbar lists variables and macros that couldn't be filled.