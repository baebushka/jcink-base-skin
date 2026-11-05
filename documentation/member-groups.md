# Member groups
Every Jcink board sorts its users into **member groups**. This guide explains how to handle groups on your clone, how to add your own, and how to see your skin as any group without logging in and out.

> 💡 Keep the preview running (`npm run dev`) while you edit. Every time you save, the page updates, so you see right away whether your change worked.

---

## Contents

1. [How do groups work on Jcink?](#1-how-do-groups-work-on-jcink)
2. [How do I read `groups.json`?](#2-how-do-i-read-groupsjson)
3. [How do I add a group?](#3-how-do-i-add-a-group)
4. [What are group variables?](#4-what-are-group-variables)
5. [What are group prefixes and suffixes?](#5-what-are-group-prefixes-and-suffixes)
6. [How do I add a sample member in a specific group?](#6-how-do-i-add-a-sample-member-in-a-specific-group)
7. [How do I preview the skin as a specific group?](#7-how-do-i-preview-the-skin-as-a-specific-group)
8. [What is the groups page?](#8-what-is-the-groups-page)
9. [How do I use `g_id`?](#9-how-do-i-use-g_id)
10. [What other group settings are there?](#10-what-other-group-settings-are-there)
11. [What if something goes wrong?](#11-what-if-something-goes-wrong)

---

## 1. How do groups work on Jcink?

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
- In the **board wrapper**, it's the group of the users **looking at the page**.
- In templates about a user (such as Post Row, Main Profile, Member List Row, etc.), it's the group of **that user**: the person who wrote the post, or whose profile it is.

---

## 2. How do I read `groups.json`?

All information about groups lives in **`data/groups.json`**. Like everything in `data/`, it only exists on your computer and never goes to Jcink. The file is a list, so it starts with `[` and ends with `]`. Each group is one `{}` block inside it:

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
    "clr2-hex": "#f5dede"
  }
]
```

Each group needs:
- **`"id"`**: the group's number on your board
- **`"name"`**: the group's title

Everything else is optional. Variables are explained in [step 4](#4-what-are-group-variables). Each group's name prefix and suffix are made for you, see [step 5](#5-what-are-group-prefixes-and-suffixes).

---

## 3. How do I add a group?

It's easy! You will have to copy this block and add it to the end of the list (`in groups.json`):

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
3. Click right after that `}` and type a **comma    (`,`)**.
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
    "name": "New Group",
    "clr1-hex": "#2f855a",
    "clr2-hex": "#d9f0e3"
  }
]
```

The new group appears in the toolbar's **Group** dropdown and on the [Groups page](#8-what-is-the-groups-page) straight away.

### Finding a group's number on your real board

Use the **same number your board uses**, so your code works the same way once it's on Jcink. If you're not sure what it is, the quickest way to check is to look at the _User and Groups → Manage User Groups_.

If you're planning a board that doesn't exist yet, any number that isn't already in the file works. If you want to keep working on this project after the site is live, make sure to match it to the real number later.

---

## 4. What are group variables?
Skins usually give each group its own look: colours, a font weight, a border, an image. You can keep all of it right next to the group as **CSS variables**, so it's in one place. The [Groups page](#8-what-is-the-groups-page) then turns them into CSS you paste into your stylesheet.

There are two kinds: **colours** and **any other CSS variable**.

### Colours

```json
"clr1-hex": "#DFF7F5",
"clr2-hex": "#4DB6AC",
"clr3-hex": "#0F4C4A"
```

- The name is always **`clr`**, then a **number**, then **`-hex`**: `clr1-hex`, `clr2-hex`, `clr3-hex` and so on. Add as many as you need.
- The value must be a **hex colour code**: 6 digits like `#4DB6AC`, or 3 like `#f00`. The `#` is optional. Colour names (`red`), `rgb()` and codes with transparency (`#4DB6AC80`) don't work here.
- Every group can have a different number of colours.

The preview turns each colour into **two** CSS variables: the hex code, and the same colour as RGB numbers:

```css
--clr2-hex: #4DB6AC;
--clr2-rgb: 77, 182, 172;
```

The RGB version is what lets you make a colour with transparency (see through): `rgba(var(--clr2-rgb), 0.5)` is `#4DB6AC` at 50%. You never write the `-rgb` ones yourself. What `clr1`, `clr2` and the rest mean is up to you. For example, `clr1` could be a soft background and `clr2` the name colour.

### Any other CSS variable

Every other setting in a group becomes a CSS variable with the same name:

```json
"name-weight": "bold",
"radius": "6px",
"banner": "url('https://example.com/admin.png')"
```

becomes

```css
--name-weight: bold;
--radius: 6px;
--banner: url('https://example.com/admin.png');
```

- The name can use letters, numbers, `-` and `_`, and can't start with a number. You can write `"--radius"` or just `"radius"`; both become `--radius`.
- The value is a **CSS value only**. HTML doesn't work, and neither do the characters `<` `>` `{` `}` `;`, because they'd break the CSS. If you want different HTML per group, use the `g-` class from [step 5](#5-what-are-group-prefixes-and-suffixes) instead.
- `id`, `name` and `icon` are group settings, not CSS variables (see [step 10](#10-what-other-group-settings-are-there)).

> ⚠️ **Jcink doesn't know about these variables.** There's no `<!-- |clr1| -->` or `<!-- |radius| -->` variable on Jcink. They only reach your skin through the CSS you [generate on the Groups page](#generating-css) and paste into your stylesheet.

---

## 5. What are group prefixes and suffixes?

In your Admin CP, every group has a **Group Prefix** and **Group Suffix**. Jcink puts them around a member's name wherever it's shown as a link: in posts, the online list, "last post by" and so on.

In this project, every group uses the same pattern, so you don't set them in `groups.json`:

| Setting | Value | Example for Admin (`id` 4) |
|---|---|---|
| Group Prefix | `<span class='g-ID'>` | `<span class='g-4'>` |
| Group Suffix | `</span>` | `</span>` |

So an Admin's name shows up as `<span class='g-4'>Admin</span>`, and you colour names in your stylesheet instead:

```css
.g-4 { color: #800000; }
```

This is the same `g-` class the [generated CSS](#generating-css) uses, so `.g-4 { color: var(--clr1-hex); }` works too.

- Templates can also print them on their own with `<!-- |prefix| -->` and `<!-- |suffix| -->`.
- ⚠️ **On Jcink itself**, type these into each group's *Group Prefix* and *Group Suffix* boxes in your Admin CP, with that group's number, or names won't get the class.
- 
---

## 6. How do I add a sample member in a specific group?

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

## 7. How do I preview the skin as a specific group?

You don't need extra sample members to see what every group looks like. The toolbar in the bottom-right corner has a **Group** dropdown:

| Pick | What happens |
|---|---|
| **Group: own** | The normal view. You're the member set as `"viewer"` in `data/board.json`, in their own group. |
| Any group | You're still the same member, but **in that group**. |
| **2 · Guests** | You're logged out, exactly like visiting `?guest=1`. |

While you're previewing a group:
- `<!-- |g_id| -->`, `<!-- |g_title| -->`, `<!-- |prefix| -->` and `<!-- |suffix| -->` in the **wrapper** use that group.
- Your **own posts** (and all other templates) use that group too, so you can check group-styled posts without editing `members.json`.
- Other members stay in their own groups.

Your choice is **remembered** as you move between pages, and after you restart the preview. Pick **Group: own** to go back to normal.

> ⚠️ The preview only changes the group, not what the group is allowed to see. On a real board, permissions are applied to a group or they see pages that are not accessible to others. Those pages aren't simulated.

---

## 8. What is the groups page?

Click **Groups** in the toolbar, or go to **http://localhost:3000/__groups**. It's a quick overview of `data/groups.json`:

- Every group's **ID** and **name**, with a ⚠ under the name if one of its settings has a problem.
- Its **colours**, each with a swatch, its hex code and its RGB numbers. Click a colour to copy its hex code.
- Its other **CSS variables**.
- A **Preview** button that switches the toolbar to that group and opens the board. The group you're currently previewing is highlighted.

The page updates by itself when you save `data/groups.json`.

### Generating CSS

Under the table, click **Generate**. The page builds one CSS rule per group, one after the other, ready to copy into `skin/stylesheet.css`:

```css
/* #3 Members */
#g-3, .g-3, #m-3, .m-3, .gr-3, .group-3,
.members, #members {
--clr1-hex: #DFF7F5;
--clr2-hex: #4DB6AC;
--clr3-hex: #0F4C4A;

--clr1-rgb: 223, 247, 245;
--clr2-rgb: 77, 182, 172;
--clr3-rgb: 15, 76, 74;

--name-weight: bold;
}
```

- The first line is a comment with the group's ID and name.
- The rule works with **any** of these on an element: `g-3`, `m-3`, `gr-3` or `group-3` as a class or ID, or the group's name in lower case (`members`; spaces become `-`, so "Board Owner" is `board-owner`). Use whichever your skin already uses. The name version is left out if the name starts with a number, because CSS classes can't.
- Then come the colours as hex, the same colours as RGB, and the group's other CSS variables, each block separated by an empty line. Blocks the group doesn't have are left out.

Click **Copy**, and paste it into your stylesheet. Click **Generate** again after you change `groups.json`. The page reloads by itself when you save, and the CSS stays open.

To use the variables, put one of those classes on an element. Everything inside it can then use them:

```html
<div class="post g-<!-- |g_id| -->">
  ...
</div>
```

```css
.post .name { color: var(--clr2-hex); font-weight: var(--name-weight); }
.post { background: rgba(var(--clr1-rgb), 0.5); }
```

Each post now picks up its author's group colours. This part **does** work on Jcink, because it only uses CSS and `<!-- |g_id| -->`.

### Gradients

Tick **Generate gradient?** before (or after) clicking **Generate** to get a second box:

```css
--gradient-10: rgba(var(--clr1-rgb), 0.10), rgba(var(--clr2-rgb), 0.10), rgba(var(--clr3-rgb), 0.10);
--gradient-25: rgba(var(--clr1-rgb), 0.25), rgba(var(--clr2-rgb), 0.25), rgba(var(--clr3-rgb), 0.25);
...
--gradient-00: rgba(var(--clr1-rgb), 1), rgba(var(--clr2-rgb), 1), rgba(var(--clr3-rgb), 1);
```

Each line is a list of all your colours at one opacity: `10` is 10%, `25` is 25% and so on, and `00` is fully solid. It uses every colour number any group has (`clr1`, `clr2`, `clr3`, …).

Paste these lines **inside** the `body { }` rule in your stylesheet, then use them in a gradient:

```css
.maintitle { background: linear-gradient(to right, var(--gradient-50)); }
```

Two things to know:

- The gradients read the colours from the group class, so **`<body>` needs one**: `<body class="g-<!-- |g_id| -->">` in your wrapper. Then the whole page uses the viewer's group colours.
- Every group needs **the same colour numbers**. If Members has `clr3-hex` but Guests doesn't, guests' gradients don't show. The page warns you above the box when that happens.

---

## 9. How do I use `g_id`?

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

**Style each post by its author's group** (in `skin/templates/post_row.html`). The starter Post Row already does this: each post is wrapped in `<span class='<!-- |post_class| --> g-<!-- |g_id| -->'>`, so `.g-4 .postcolor { … }` styles only admins' posts.

**Other templates have their own versions** of the variable:

| Variable | Template | Whose group |
|---|---|---|
| `<!-- \|g_id\| -->` | Wrapper | The person viewing the page |
| `<!-- \|g_id\| -->` | Post Row, Mini Profile, Main Profile, Member List Row | That member |
| `<!-- \|starter_g_id\| -->` | Topic Row | The member who started the topic |
| `<!-- \|last_poster_g_id\| -->` | Topic Row, Forum Row | The member who posted last |

Switch groups in the toolbar to check each version of your design.

---

## 10. What other group settings are there?

| Setting | Required? | What it does | On Jcink |
|---|---|---|---|
| `id` | ✅ | The group's number. Printed by `<!-- \|g_id\| -->`. | The group's ID |
| `name` | ✅ | The group's title. Printed by `<!-- \|g_title\| -->`. | Group Title |
| `icon` | | An image address, printed by `<!-- \|g_icon\| -->` | Group Icon |
| `clr1-hex`, `clr2-hex`, … | | The group's colours, as hex codes. Each becomes `--clr1-hex` and `--clr1-rgb` in the [generated CSS](#generating-css). | – (CSS only) |
| Anything else | | A CSS variable with the same name, like `"radius": "6px"` → `--radius: 6px;` (see [step 4](#any-other-css-variable)) | – (CSS only) |

---

## 11. What if something goes wrong?

### Common errors in the toolbar

| Warning | What to do |
|---|---|
| *two groups use "id": 6* | Two blocks share a number. Give one of them a different `id`. |
| *"clr2-hex" ("blue") isn't a hex colour like #4DB6AC* | Use a 6- or 3-digit hex code like `#2b6cb0`. Colour names, `rgb()` and transparency don't work here. |
| *"clr1-rgb" is made for you from "clr1-hex"* | Delete the `-rgb` setting. The RGB version is worked out from the hex code. |
| *"my var" isn't a valid CSS variable name* | Use only letters, numbers, `-` and `_`, and don't start with a number: `"my-var"`. |
| *"badge" can't contain HTML or the characters < > { } ;* | Group variables are CSS values only. Remove the HTML, or style the element with the `g-` class instead. |
| *"radius" should be a CSS value* | The value is empty, or isn't text or a number. Give it a value like `"6px"`, or delete it. |
| *Jane Doe has "group": 7, but no group in data/groups.json has that id* | Add a group with that `id`, or change the member's `"group"`. |
| *Admin's "prefix" and "suffix" aren't used* | Names are always wrapped in `<span class='g-ID'>` (see [step 5](#5-what-are-group-prefixes-and-suffixes)). Delete `"prefix"` and `"suffix"` from that group, and colour the name in your stylesheet instead. |
| *data/board.json: "groups" is no longer used* | Groups used to live in `data/board.json`. Copy any you changed into `data/groups.json` (`"title"` is now `"name"`), then delete `"groups"` from `board.json`. |

> **💭 The page turned into a red error mentioning `groups.json`**
>
> There's a typo in your JSON. The message gives a **line** and **column** number, so look there and just before it. Usually it's a missing or extra comma, or a missing quote. Fix it and save. The page comes back by itself.

> **💭 A red error saying a group "needs an id and a name"**
> 
> One of the blocks is missing `"id"` or `"name"`. The message says which one, counting from the top of the file.

> **💭 My group isn't in the toolbar's dropdown**
>
> Did you save `data/groups.json`? Reload the page if it's still missing.

> **💭 I picked a group, but nothing changed**
>
> Your skin probably doesn't use `<!-- |g_id| -->` (or the other group variables) yet. See [step 9](#9-how-do-i-use-g_id).

> **💭 I broke it and can't find the mistake**
>
>If you downloaded the project from GitHub, you can always get the original `data/groups.json` back from there and start again.
