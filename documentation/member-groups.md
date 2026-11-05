# Member groups

Every Jcink board sorts its members into **member groups**, such as Members or Admin. A lot of skins look different depending on the group: an admin's name in red, a different mini profile for staff, a banner only guests see.

This guide shows how the preview handles groups, how to add your own, and how to see your skin as any group without logging in and out.

> 💡 Keep the preview running (`npm run dev`) while you edit. Every time you save, the page updates, so you see right away whether your change worked.

---

## Contents

1. [How groups work on Jcink](#1-how-groups-work-on-jcink)
2. [The groups file](#2-the-groups-file)
3. [Add a group](#3-add-a-group)
4. [Group colours](#4-group-colours)
5. [Name prefix and suffix](#5-name-prefix-and-suffix)
6. [Put a sample member in a group](#6-put-a-sample-member-in-a-group)
7. [Preview the board as a group](#7-preview-the-board-as-a-group)
8. [The Groups page](#8-the-groups-page)
9. [Using `g_id` in your skin](#9-using-g_id-in-your-skin)
10. [Every setting explained](#10-every-setting-explained)
11. [If something goes wrong](#11-if-something-goes-wrong)

---

## 1. How groups work on Jcink

Each group has a **number**, called its **group ID**. Jcink prints that number wherever you write this variable:

```html
<!-- |g_id| -->
```

A new Jcink board starts with these five groups:

| ID | Group |
|---|---|
| 1 | Validating (registered, but hasn't confirmed their email yet) |
| 2 | Guests (anyone who isn't logged in) |
| 3 | Members |
| 4 | Admin |
| 5 | Banned |

Groups you create yourself in the Admin CP get their own numbers on top of these.

What `<!-- |g_id| -->` prints depends on **where** you use it:

- In the **board wrapper**, it's the group of the person **looking at the page**.
- In templates about a member (**Post Row**, **Mini Profile**, **Main Profile**, **Member List Row**), it's the group of **that member**: the person who wrote the post, or whose profile it is.

---

## 2. The groups file

The groups live in **`data/groups.json`**. Like everything in `data/`, it only exists on your computer and never goes to Jcink.

The file is a list, so it starts with `[` and ends with `]`. Each group is one `{ }` block inside it:

```json
[
  {
    "id": 3,
    "name": "Members",
    "clr1-hex": "#2b6cb0",
    "clr2-hex": "#dbe8f5"
  },
  {
    "id": 4,
    "name": "Admin",
    "clr1-hex": "#800000",
    "clr2-hex": "#f5dede",
    "prefix": "<span style='color:#800000'>",
    "suffix": "</span>"
  }
]
```

Each group needs:

- **`"id"`**: the group's number on your board (see [step 3](#3-add-a-group) for how to find it).
- **`"name"`**: the group's title. Templates show it with `<!-- |g_title| -->`.

Everything else is optional. Colours are explained in [step 4](#4-group-colours), prefix and suffix in [step 5](#5-name-prefix-and-suffix).

> The same JSON rules apply as in the other data files: text in "double quotes", commas **between** blocks but never after the last one. [Adding categories, forums, topics and posts](adding-forum-content.md#2-three-rules-to-remember) explains them in more detail.

---

## 3. Add a group

**What you'll do:** copy this block and add it to the end of the list.

```json
{
  "id": 6,
  "name": "Moderators",
  "clr1-hex": "#2f855a",
  "clr2-hex": "#d9f0e3"
}
```

**Step by step:**

1. Open `data/groups.json`.
2. Scroll to the very bottom. The file ends with `}` on one line and `]` on the last line.
3. Click right after that `}` and type a **comma**.
4. Press Enter and paste the block above.
5. Change `"id"` to the group's number on your board, and `"name"` to its title.
6. Save.

The end of your file should now look like this:

```json
  {
    "id": 5,
    "name": "Banned",
    "clr1-hex": "#333333",
    "clr2-hex": "#d4d4d4"
  },
  {
    "id": 6,
    "name": "Moderators",
    "clr1-hex": "#2f855a",
    "clr2-hex": "#d9f0e3"
  }
]
```

The new group appears in the toolbar's **Group** dropdown and on the [Groups page](#8-the-groups-page) straight away.

### Finding a group's number on your real board

Use the **same number your board uses**, so your code works the same way once it's on Jcink. If you're not sure what it is, the quickest way to check is to let Jcink tell you:

1. On your live board, add `<!-- |g_id| -->` somewhere visible in your board wrapper (a hidden skin works fine).
2. Log in as a member of that group and look at the page. The number that shows up is the group ID.
3. Remove it from your wrapper again.

> Planning a board that doesn't exist yet? Any number that isn't already in the file works. Just remember to match it to the real number later.

---

## 4. Group colours

Many skins give each group its own colours. You can keep them right next to the group, so they're all in one place:

```json
"clr1-hex": "#800000",
"clr2-hex": "#f5dede"
```

- The name is always **`clr`**, then a **number**, then **`-hex`**: `clr1-hex`, `clr2-hex`, `clr3-hex` and so on. Add as many as you need.
- The value is a **hex colour code**, like `#800000`. The `#` is optional; the preview adds it if it's missing. Short codes (`#f00`) and codes with transparency (`#80000080`) work too.
- Every group can have a different number of colours.

What `clr1`, `clr2` and the rest mean is up to you. For example, `clr1` could be the name colour and `clr2` a soft background.

> ⚠️ **Jcink doesn't know about these colours.** There's no `<!-- |clr1| -->` variable on Jcink. They're here so you have a reference while you design, and so the Groups page can [turn them into CSS](#css-variables) you can paste into your stylesheet.

---

## 5. Name prefix and suffix

In your Admin CP, every group has a **Group Prefix** and **Group Suffix**. Jcink puts them around a member's name wherever it's shown as a link: in posts, the online list, "last post by" and so on. The usual use is colouring names:

```json
"prefix": "<span style='color:#800000'>",
"suffix": "</span>"
```

With this, an Admin's name shows up as `<span style='color:#800000'>Admin</span>`.

- Use **single quotes** `'` inside the HTML, because double quotes `"` would end the text early.
- Leave them out (or use `""`) for no prefix or suffix.
- Templates can also print them on their own with `<!-- |prefix| -->` and `<!-- |suffix| -->`.

You can also add **`"icon"`** with an image address. It's printed by `<!-- |g_icon| -->` and `<!-- |member_rank_img| -->`.

---

## 6. Put a sample member in a group

Each member in `data/members.json` has a `"group"` setting. Set it to the group's `id`:

```json
{
  "id": 2,
  "name": "Jane Doe",
  "group": 6,
  ...
}
```

> The `...` just means "the rest of Jane's settings stay as they are". Don't type it.

Save, and Jane's posts, mini profile and profile now use the Moderators group.

---

## 7. Preview the board as a group

You don't need extra sample members to see what every group looks like. The toolbar in the bottom-right corner has a **Group** dropdown:

| Pick | What happens |
|---|---|
| **Group: own** | The normal view. You're the member set as `"viewer"` in `data/board.json`, in their own group. |
| Any group | You're still the same member, but **in that group**. |
| **2 · Guests** | You're logged out, exactly like visiting `?guest=1`. |

While you're previewing a group:

- `<!-- |g_id| -->`, `<!-- |g_title| -->`, `<!-- |prefix| -->` and `<!-- |suffix| -->` in the **wrapper** use that group.
- Your **own posts** (and your mini profile and profile) use that group too, so you can check group-styled posts without editing `members.json`.
- Other members stay in their own groups.

Your choice is **remembered** as you move between pages, and after you restart the preview. Pick **Group: own** to go back to normal.

> ⚠️ The preview only changes the group, not what the group is allowed to see. On a real board, banned members and members still validating see a Jcink message instead of the forum. Those pages aren't simulated.

---

## 8. The Groups page

Click **Groups** in the toolbar, or go to **http://localhost:3000/__groups**. It's a quick overview of `data/groups.json`:

- Every group's **ID** and **name**.
- Its **colours**, each with a swatch. Click a colour to copy its hex code.
- A **Preview** button that switches the toolbar to that group and opens the board. The group you're currently previewing is highlighted.

The page updates by itself when you save `data/groups.json`.

### CSS variables

At the bottom, the page turns your colours into CSS you can copy into `skin/stylesheet.css`:

```css
/* Admin */
.g-4 { --clr1: #800000; --clr2: #f5dede; }
```

To use them, give an element the class `g-` followed by the group ID. Everything inside it can then use `var(--clr1)`, `var(--clr2)` and so on:

```html
<div class="post g-<!-- |g_id| -->">
  ...
</div>
```

```css
.post .name { color: var(--clr1); }
.post { background: var(--clr2); }
```

Each post now picks up its author's group colours. This part **does** work on Jcink, because it only uses CSS and `<!-- |g_id| -->`.

---

## 9. Using `g_id` in your skin

Some ideas for using the group ID:

**Style the whole page for the person viewing it** (in `skin/wrapper.html`):

```html
<body class="g-<!-- |g_id| -->">
```

```css
/* Only guests see the welcome banner */
.welcome-banner { display: none; }
.g-2 .welcome-banner { display: block; }
```

**Style each post by its author's group** (in `skin/templates/post_row.html`). Jcink's default Post Row already does this with `group<!-- |g_id| -->-<!-- |post_class| -->`.

**Other templates have their own versions** of the variable:

| Variable | Template | Whose group |
|---|---|---|
| `<!-- \|g_id\| -->` | Wrapper | The person viewing the page |
| `<!-- \|g_id\| -->` | Post Row, Mini Profile, Main Profile, Member List Row | That member |
| `<!-- \|starter_g_id\| -->` | Topic Row | The member who started the topic |
| `<!-- \|last_poster_g_id\| -->` | Topic Row, Forum Row | The member who posted last |

Switch groups in the toolbar to check each version of your design.

---

## 10. Every setting explained

| Setting | Required? | What it does | On Jcink |
|---|---|---|---|
| `id` | ✅ | The group's number. Printed by `<!-- \|g_id\| -->`. | The group's ID |
| `name` | ✅ | The group's title. Printed by `<!-- \|g_title\| -->`. | Group Title |
| `clr1-hex`, `clr2-hex`, … | | Your colours for the group, for reference and the [CSS variables](#css-variables) | – (preview only) |
| `prefix` | | HTML put before the member's name | Group Prefix |
| `suffix` | | HTML put after the member's name | Group Suffix |
| `icon` | | An image address, printed by `<!-- \|g_icon\| -->` | Group Icon |

---

## 11. If something goes wrong

**The page turned into a red error mentioning `groups.json`**
There's a typo. The message gives a **line** and **column** number, so look there and just before it. Usually it's a missing or extra comma, or a missing quote. Fix it and save. The page comes back by itself.

**A red error saying a group "needs an id and a name"**
One of the blocks is missing `"id"` or `"name"`. The message says which one, counting from the top of the file.

**The ⚠ badge in the toolbar says…**

| Warning | What to do |
|---|---|
| *two groups use "id": 6* | Two blocks share a number. Give one of them a different `id`. |
| *"clr2-hex" ("blue") isn't a hex colour* | Use a hex code like `#2b6cb0`. Colour names don't work here. |
| *Jane Doe has "group": 7, but no group in data/groups.json has that id* | Add a group with that `id`, or change the member's `"group"`. |
| *data/board.json: "groups" is no longer used* | Groups used to live in `data/board.json`. Copy any you changed into `data/groups.json` (`"title"` is now `"name"`), then delete `"groups"` from `board.json`. |

**My group isn't in the toolbar's dropdown**
Did you save `data/groups.json`? Reload the page if it's still missing.

**I picked a group, but nothing changed**
Your skin probably doesn't use `<!-- |g_id| -->` (or the other group variables) yet. See [step 9](#9-using-g_id-in-your-skin).

**I broke it and can't find the mistake**
If you downloaded the project from GitHub, you can always get the original `data/groups.json` back from there and start again.
