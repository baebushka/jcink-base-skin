# Changelog

Every notable change to this project is listed here, newest first.

Each version is listed as **added** (new things), **changed** (things that work differently now) or **fixed** (things that were broken). The version number is also in `package.json`.

## How to add an entry

When you change something, add a line under **Unreleased** in the matching group. When you're ready to publish a new version:

1. Rename **Unreleased** to the new version number and today's date, for example `## 1.2.0 – 2026-12-01`.
2. Update `"version"` in `package.json` to match.
3. Add a fresh, empty **Unreleased** section at the top.

Version numbers go up like this:
- **Small fixes** raise the last number (1.1.0 → 1.1.1).
- **New features** raise the middle number (1.1.1 → 1.2.0).
- **Changes that need people to redo their setup** raise the first number (1.2.0 → 2.0.0).

---

## Unreleased

*Nothing yet.*

## 1.1.0 – 2026-11-02

### Added
- `changelog.md` (this file).
- The README lists which Jcink pages the preview builds, which parts appear on every page, and which pages aren't covered yet.
- Custom profile field warnings: a required field left empty, an answer longer than the field's maximum length, and a dropdown answer that isn't one of its options.

### Changed
- **`data/custom-fields.json` now uses Jcink's own export format** (`fid`, `ftitle`, `ftype`, `freq`, `fmaxinput` and so on), so a board's export can be pasted in as it is. Field types are `text`, `area` (multi-line) and `drop` (dropdown).
  - ⚠️ If you made your own `custom-fields.json` in version 1.0.0, rewrite it in the new format. README section 6 shows how.
- Dropdown answers in `data/members.json` can use either the option's key or its label. The page always shows the label.
- The README's installation steps now point to Node.js's pre-built installer (`.pkg` on Mac, `.msi` on Windows).
- The starter Main Profile template also shows the pronouns and languages sample fields.

### Fixed
- Dropdown options exported with a stray `\r` (for example `no=no\r|yes=yes`) are read correctly.

## 1.0.0 – 2026-11-02

First release.

### Added
- **Live local preview** of a Jcink board at `localhost:3000`. Stylesheet changes appear instantly without reloading. Other changes reload the page automatically.
- **Jcink's default skin** to start from: the stylesheet, board wrapper and full macro set from Jcink's default skin export, plus Jcink's default HTML templates.
- **Jcink-style rendering:** wrapper tags (`<% BOARD %>`), template variables (`<!-- |name| -->`) and macros (`<{A_REPLY}>`) all work as they do on Jcink.
- **Pages:** board index, single category, forum, subforum, topic, profile and member list, with a guest view of each.
- **Parts copied from a real Jcink board:** board header, shoutbox and footer.
- **Collapsible categories** using Jcink's own script, remembered after reloading, as on Jcink.
- **Sample content** in `data/`: board settings, member groups, members, forums, topics, posts and shouts.
- **Custom profile fields:** define fields once and use `<!-- |field_#| -->` in templates.
- **Built-in values** for the macros Jcink fills in when a macro set leaves them out (`dev/jcink/fallback-macros.json`).
- **Copy to Jcink page** at `localhost:3000/__copy`, with a Copy button for every Admin CP box.
- **`npm run copy -- <name>`** copies one piece of the skin to the clipboard on Mac, Windows and Linux.
- **`npm run build`** creates importable skin files in `dist/`: a full skin file laid out like Jcink's own export, and a templates-only file.
- A **warning badge** in the preview's toolbar lists variables and macros that couldn't be filled.
- A beginner-friendly **README** with installation steps, a guide to every file, troubleshooting and a glossary.
- The **MIT license**.
