# The dev toolbar
While the preview is running, every page has a small dark **toolbar** in the bottom-right corner. It's how you move around the preview, see the board as a different member group, open the sample data forms, copy your code, and catch mistakes.

The toolbar only exists in the preview. It's never copied to Jcink, so you don't need to remove it from your skin.

> 💡 Keep the preview running (`npm run dev`) while you work. The toolbar shows up on every board page at `localhost:3000`.

---

## Contents

1. [What's on the toolbar?](#1-whats-on-the-toolbar)
2. [Navigation](#2-navigation)
3. [Preview](#3-preview)
4. [Sample data forms](#4-sample-data-forms)
5. [Copy code](#5-copy-code)
6. [Errors](#6-errors)
7. [Moving and hiding the toolbar](#7-moving-and-hiding-the-toolbar)
8. [Changing the toolbar](#8-changing-the-toolbar)

---

## 1. What's on the toolbar?

The toolbar is split into **five sections**, divided by a `|`:

```
⋮⋮  Index  Forum  Topic  Profile  Member list | Group: own ▾ | Sample data forms ▾ | Copy code | ⚠️ 1   ×
```

| Section | What it does |
|---|---|
| **Navigation** | Jumps between the main board pages. |
| **Preview** | A dropdown to see the board as a different member group. |
| **Sample data forms** | A menu of forms that edit the sample content in `data/`. Each one opens in a new tab. |
| **Copy code** | Opens the Copy to Jcink page in a new tab. |
| **Errors** | How many problems the preview found on this page. Only shows when there's at least one. |

The `⋮⋮` at the start lets you drag the toolbar anywhere on the page, and the `×` at the end hides it (see [step 7](#7-moving-and-hiding-the-toolbar)).

---

## 2. Navigation

These links open the main pages of your board in the same tab:

| Link | Page | Address |
|---|---|---|
| **Index** | The board index | `localhost:3000` |
| **Forum** | The first forum's topic list | `localhost:3000/index.php?showforum=1` |
| **Topic** | The first topic | `localhost:3000/index.php?showtopic=1` |
| **Profile** | The first member's profile | `localhost:3000/index.php?showuser=1` |
| **Member list** | The member list | `localhost:3000/index.php?act=Members` |

The link for the kind of page you're on is **bold**. For example, **Topic** is bold on any topic, whichever one it is. A category page (`?c=1`) counts as the index. Pages that aren't in the list, like search, have no bold link.

To see a different forum, topic or member, change the number in the address. The README lists [every page the preview builds](../README.md#9-which-jcink-pages-are-covered).

---

## 3. Preview

The **Group** dropdown lets you see the board as any member group, without editing your sample members or logging in and out.

| Pick | What happens |
|---|---|
| **Group: own** | The normal view, as the member set as `"viewer"` in `data/board.json`. |
| Any group | You're still the same member, but **in that group**. |
| **2 · Guests** | You're logged out, like visiting `?guest=1`. |

Your choice is remembered as you move between pages, and after you restart the preview.

> 📘 **The full guide:** [Member groups](member-groups.md#7-how-do-i-preview-the-skin-as-a-specific-group) explains exactly what changes when you preview a group.

---

## 4. Sample data forms

Click **Sample data forms ▾** to open a menu of forms. Each form edits one file in `data/` for you, so you don't have to write JSON by hand. Clicking a form opens it in a **new tab**, so your preview stays where it was.

When you save a form, the file updates and every open preview tab reloads by itself.

### Quick access

The links work while the preview is running.

| Form | Address | What it does | File it writes | Guide |
|---|---|---|---|---|
| 👥 **Groups** | [localhost:3000/\_\_groups](http://localhost:3000/__groups) | Shows every group, its colours and CSS variables. Copy a colour, preview the board as a group, or generate CSS for your stylesheet. | – (reads `data/groups.json`) | [Member groups](member-groups.md#8-what-is-the-groups-page) |
| 🏷️ **Fields** | [localhost:3000/\_\_fields](http://localhost:3000/__fields) | Add, edit and delete custom profile fields with an Admin CP-style form. | `data/custom-fields.json` | [Custom profile fields](custom-profile-fields.md#4-what-is-the-fields-page) |
| 🧑‍🤝‍🧑 **Members** | [localhost:3000/\_\_members](http://localhost:3000/__members) | Add, edit and delete sample members and their subaccounts, with an answer box for every custom profile field. | `data/members.json` | [Custom profile fields](custom-profile-fields.md#6-how-do-i-give-sample-members-answers) |
| 🗂️ **Forums** | [localhost:3000/\_\_forums](http://localhost:3000/__forums) | Add, edit, reorder and delete categories, forums, subforums, topics and replies. Checks IDs and authors as you go. | `data/forums.json` | [Adding forum content](adding-forum-content.md#0-the-easy-way-the-forums-page) |

> 💡 The Groups page doesn't have a form yet. To add or change a group, edit `data/groups.json` (see [How do I add a group?](member-groups.md#3-how-do-i-add-a-group)).

> 💡 If you started the preview on a different port (for example `PORT=3001 npm run dev`), change `3000` in the addresses above to match.

---

## 5. Copy code

**Copy code** opens the Copy to Jcink page ([localhost:3000/\_\_copy](http://localhost:3000/__copy)) in a new tab. It has a **Copy** button for every box in your Admin CP: the wrapper, stylesheet, each HTML template and each macro.

> 📘 See [Putting your skin on Jcink](../README.md#8-putting-your-skin-on-jcink) in the README for every way to send your skin to Jcink.

---

## 6. Errors

When the preview finds a problem on the page, a yellow **⚠️** with a number appears at the end of the toolbar. Click it to see the list. For example:

- a **macro** or **variable** your skin uses that the preview doesn't know
- a mistake in `data/groups.json`, like two groups with the same `id`
- a sample member in a group that doesn't exist

Fix the problem and save. The page reloads, and the warning goes away. When there are no problems, this section isn't shown at all.

> 📘 [Member groups → What if something goes wrong?](member-groups.md#11-what-if-something-goes-wrong) explains the group warnings one by one.

---

## 7. Moving and hiding the toolbar

### Moving it

If the toolbar is covering part of your skin, move it. Hold down the **⋮⋮** handle at the start of the toolbar and drag it anywhere on the page.

- It **stays where you left it** when you reload, move to another page, or save a file.
- It goes **back to the bottom-right corner** when you stop the preview and start it again (`npm run dev`).
- **Double-click** the ⋮⋮ handle to put it back in the corner straight away.
- Near the top of the page, the **Sample data forms** menu and the ⚠️ list open **downward** instead of upward, so they stay on screen.
- If you make the browser window smaller, the toolbar moves just enough to stay on screen.

> 💡 The position is saved in your browser, so each browser remembers its own spot.

### Hiding it

Click the **×** at the end of the toolbar to hide it, for example to take a screenshot or check what's underneath it. It comes back when you reload the page or move to another page.

---

## 8. Changing the toolbar

> ⚙️ This part is for coders. You don't need it to build a skin.

All of the toolbar's code lives in **`dev/dev-toolbar/`**:

| File | What it is |
|---|---|
| `toolbar.html` | The toolbar's HTML. `{{groupSelect}}`, `{{pages}}` and `{{warnings}}` are filled in for each page. |
| `toolbar.css` | The toolbar's styles, grouped by section. |
| `toolbar.js` | Browser code for the toolbar: dragging it and remembering where it was left, and closing the Sample data forms menu when you click somewhere else. |
| `set-group.js` | `devSetGroup()`, which remembers the chosen group. The Groups page uses it too. |
| `index.js` | Puts the files above together. The list of forms in the **Sample data forms** menu (`PAGES`) is here, and so is `BOOT`, a new value each time the server starts. A dragged position is only reused while `BOOT` stays the same, which is why the toolbar goes back to the corner after a restart. |

The `.html`, `.css` and `.js` files are read again on every page load, and saving one reloads the preview, so you see your change straight away. If you edit `index.js`, stop the preview (`Ctrl + C`) and start it again (`npm run dev`).

**To add a form to the menu**, add a line to `PAGES` in `index.js`:

```js
const PAGES = [
  ["/__groups", "Groups"],
  ["/__fields", "Fields"],
  ["/__members", "Members"],
  ["/__forums", "Forums"],
  ["/__my-page", "My page"],
];
```

The first part is the page's address, and the second is the name shown in the menu.
