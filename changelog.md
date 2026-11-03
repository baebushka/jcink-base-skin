# Changelog

Every notable change to this project is listed here, newest first.

Each version is listed as **🆕** (added new features, extended support, further tools), **🔁** (changes and things that work differently now) or **⏺️** (bug fixes, things that were broken). The version number is also in `package.json`, so you can cross-check which version you are on.

## How the Changelog Works

Version numbers go up like this:
- **Small fixes** raise the last number (1.1.0 → 1.1.1).
- **New features** raise the middle number (1.1.1 → 1.2.0).
- **Changes that need people to redo their setup** raise the first number (1.2.0 → 2.0.0).

---

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