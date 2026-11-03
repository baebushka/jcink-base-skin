# Adding categories, forums, topics and posts

Everything you see on the preview's forum pages comes from one file: **`data/forums.json`**. This guide shows you how to add to it, one step at a time.

You don't need to know how to code. You'll copy a small block of text, paste it in the right place, and change a few words.

> 💡 Keep the preview running (`npm run dev`) while you edit. Every time you save, the page updates, so you see right away whether your change worked.

---

## Contents

1. [How the file is organized](#1-how-the-file-is-organized)
2. [Three rules to remember](#2-three-rules-to-remember)
3. [Add a category](#3-add-a-category)
4. [Add a forum](#4-add-a-forum)
5. [Add a topic](#5-add-a-topic)
6. [Add a post (a reply)](#6-add-a-post-a-reply)
7. [Extras: subforums, link forums, pinned and hot topics](#7-extras)
8. [Every setting explained](#8-every-setting-explained)
9. [If something goes wrong](#9-if-something-goes-wrong)

---

## 1. How the file is organized

The file works like a set of boxes inside boxes, the same way a forum does:

```
Category                     "In Character"
└── Forum                    "The City"
    └── Topic                "Neon and rain"
        ├── Post             the first post, which starts the topic
        └── Post             a reply
```

In the file, it looks like this:

```json
{
  "id": 2,
  "name": "In Character",
  "forums": [
    {
      "id": 4,
      "name": "The City",
      "description": "Rooftops, alleys, and everything in between.",
      "new_posts": true,
      "topics": [
        {
          "id": 4,
          "title": "Neon and rain",
          "description": "open thread",
          "type": "regular",
          "views": 33,
          "posts": [
            { "author": 1, "date": "Today, 11:20 AM", "body": "The rain hadn't stopped in three days." },
            { "author": 2, "date": "Today, 11:45 AM", "body": "She ducked under the awning, shaking water from her coat." }
          ]
        }
      ]
    }
  ]
}
```

Notice the two kinds of brackets:

- **`{ }` curly brackets** hold **one thing**: one category, one forum, one topic or one post.
- **`[ ]` square brackets** hold **a list of things**: the list of forums, the list of topics, the list of posts.

The whole file is one big list of categories, so it starts with `[` and ends with `]`.

---

## 2. Three rules to remember

### Rule 1: Commas go *between* things, never after the last one

```json
"posts": [
  { "author": 1, "date": "Today", "body": "First post" },
  { "author": 2, "date": "Today", "body": "Second post" },
  { "author": 1, "date": "Today", "body": "Third post" }
]
```

There's a comma after the first and second posts, but **not after the third**, because it's the last one in the list. The same goes for the settings inside a block: each line ends in a comma except the last.

### Rule 2: Every `id` must be unique

Each category, forum and topic has an `id` number, and no two forums (or two topics) can share one. That's true **across the whole file**, not just inside one category. The easiest way to manage this is to find the highest number already in use and add 1.

The preview's addresses use these numbers: forum `7` is at `?showforum=7`, topic `5` is at `?showtopic=5`.

### Rule 3: Text goes in "double quotes", numbers and true/false don't

```json
"name": "The City",      ← text: in quotes
"views": 33,             ← number: no quotes
"new_posts": true,       ← true or false: no quotes
```

---

## 3. Add a category

**What you'll do:** copy this block and add it to the end of the file.

```json
{
  "id": 3,
  "name": "Out of Character Chatter",
  "forums": []
}
```

**Step by step:**

1. Open `data/forums.json`.
2. Scroll to the very bottom. The file ends with `}` on one line and `]` on the last line.
3. Click right after that `}` and type a **comma**.
4. Press Enter and paste the block above.
5. Change `"id"` to a number no other category uses, and `"name"` to your category's title.
6. Save.

The end of your file should now look like this:

```json
      ]
    }
  ]
},
{
  "id": 3,
  "name": "Out of Character Chatter",
  "forums": []
}
]
```

The new category appears on the board index. It's empty for now, so the next step adds a forum to it.

> `"forums": []` means "a list with nothing in it yet". You'll put your forums between those square brackets.

---

## 4. Add a forum

**What you'll do:** paste this block inside a category's `"forums": [ ]` list.

```json
{
  "id": 7,
  "name": "Plotting",
  "description": "Find writing partners and plan threads.",
  "new_posts": false,
  "topics": []
}
```

**Into an empty category** (like the one from step 3), paste it **between** the square brackets:

```json
{
  "id": 3,
  "name": "Out of Character Chatter",
  "forums": [
    {
      "id": 7,
      "name": "Plotting",
      "description": "Find writing partners and plan threads.",
      "new_posts": false,
      "topics": []
    }
  ]
}
```

**Into a category that already has forums**, find the last forum in its list, type a comma after its closing `}`, then paste:

```json
"forums": [
  {
    "id": 4,
    "name": "The City",
    ...
  },
  {
    "id": 7,
    "name": "Plotting",
    "description": "Find writing partners and plan threads.",
    "new_posts": false,
    "topics": []
  }
]
```

> The `...` above just means "the rest of The City forum stays as it is". Don't type it.

Then change:
- `"id"`: one higher than the highest forum `id` in the whole file (subforums count too).
- `"name"` and `"description"`: your forum's title and the line shown under it. The description can contain HTML, such as `<b>bold</b>`.
- `"new_posts"`: `true` shows the "new posts" icon, `false` the "no new posts" one.

Save, then click your forum on the board index (or go to `localhost:3000/index.php?showforum=7`).

---

## 5. Add a topic

**What you'll do:** paste this block inside a forum's `"topics": [ ]` list.

```json
{
  "id": 5,
  "title": "Looking for a rival!",
  "description": "open to anyone",
  "type": "regular",
  "views": 0,
  "posts": [
    { "author": 1, "date": "Today, 2:15 PM", "body": "My character needs someone to clash with. Any takers?" }
  ]
}
```

**Into an empty forum**, paste it between the square brackets of `"topics": []`.

**Into a forum with topics already**, put the new topic **first** in the list, right after `"topics": [`, and type a comma after its closing `}`:

```json
"topics": [
  {
    "id": 5,
    "title": "Looking for a rival!",
    ...
  },
  {
    "id": 4,
    "title": "Neon and rain",
    ...
  }
]
```

> **Why first?** The forum's "Last Post Info" on the board index is taken from the **first topic in the list**, so keep the most recently active topic at the top, like a real forum.

Then change:
- `"id"`: one higher than the highest topic `id` in the whole file.
- `"title"` and `"description"`: the topic title and the line under it. Use `""` for no description.
- `"type"`: `"regular"`, or `"pinned"` to put it under "Important Topics".
- `"views"`: any number.
- The post inside `"posts"`: this is the **first post**, which starts the topic. See the next step for what each part means.

Save and open the topic: `localhost:3000/index.php?showtopic=5`.

---

## 6. Add a post (a reply)

**What you'll do:** add one line to the end of a topic's `"posts": [ ]` list.

```json
{ "author": 2, "date": "Today, 3:30 PM", "body": "Count me in! Meet you at the docks?" }
```

Find the topic, go to the **last** post in its `"posts"` list, type a comma after it, and paste the new line:

```json
"posts": [
  { "author": 1, "date": "Today, 2:15 PM", "body": "My character needs someone to clash with. Any takers?" },
  { "author": 2, "date": "Today, 3:30 PM", "body": "Count me in! Meet you at the docks?" }
]
```

Posts go **oldest first**, the same order they appear in the topic.

What each part means:

- **`"author"`** is the `id` of a member in `data/members.json`. With the sample data, `1` is *Admin* and `2` is *Jane Doe*. The post shows that member's name, avatar, mini profile and custom fields.
- **`"date"`** can be any text you like: `"Today, 3:30 PM"`, `"Nov 3 2026, 09:00 AM"` and so on.
- **`"body"`** is the post itself, and can contain HTML:
  - `<br />` starts a new line
  - `<b>bold</b>`, `<i>italic</i>`
  - `<div class='quotetop'>QUOTE (Admin)</div><div class='quotemain'>quoted text</div>` makes a quote box
  - Inside the body, use **single quotes** `'` for HTML attributes, because double quotes `"` would end the text early.

The topic's reply count, its "last post by" and the forum's last post all update by themselves.

> **Want a new member to post?** Add them to `data/members.json` first (copy an existing member's block and give it a new `id`), then use that `id` as the `author`.

---

## 7. Extras

### A subforum

Give a forum a `"subforums"` list. Subforums are written exactly like forums, with their own unique `id`s:

```json
{
  "id": 2,
  "name": "Character Applications",
  "description": "Submit your characters here.",
  "new_posts": false,
  "subforums": [
    { "id": 5, "name": "Accepted", "description": "Approved characters.", "new_posts": false, "topics": [] },
    { "id": 6, "name": "Pending", "description": "Waiting for review.", "new_posts": true, "topics": [] }
  ],
  "topics": []
}
```

They're listed under "Subforums:" on the board index, and in their own box at the top of the parent forum.

### A forum that links to another website

Replace `"topics"` with `"redirect_url"` and `"redirect_hits"`:

```json
{
  "id": 3,
  "name": "Discord",
  "description": "Join us on Discord.",
  "redirect_url": "https://discord.com",
  "redirect_hits": 57
}
```

This uses your **Redirect Row** template.

### Topic icons

Add any of these inside a topic's `{ }`:

| Add this | What it shows |
|---|---|
| `"type": "pinned"` | Pinned topic, listed under "Important Topics" |
| `"hot": true` | The hot topic icon |
| `"new_posts": true` | The "new posts" icon and a go-to-newest-post link |
| `"locked": true` | The closed topic icon |

### A read-only forum

Add `"locked": true` inside a forum's `{ }` to show the read-only forum icon.

---

## 8. Every setting explained

| Where | Setting | Required? | What it does |
|---|---|---|---|
| Category | `id` | ✅ | Unique number. The category's page is `?c=` + this number. |
| Category | `name` | ✅ | Category title |
| Category | `forums` | ✅ | The list of forums (can be `[]`) |
| Forum | `id` | ✅ | Unique number across all forums and subforums. Page: `?showforum=` + this number. |
| Forum | `name` | ✅ | Forum title |
| Forum | `description` | | Text under the title (HTML allowed) |
| Forum | `new_posts` | | `true` / `false`: which forum icon shows |
| Forum | `locked` | | `true` shows the read-only icon |
| Forum | `topics` | | The list of topics, most recently active first |
| Forum | `subforums` | | A list of forums inside this forum |
| Forum | `redirect_url` | | Turns the forum into a link to this web address |
| Forum | `redirect_hits` | | The "Redirected Hits" number shown for a link forum |
| Topic | `id` | ✅ | Unique number across all topics. Page: `?showtopic=` + this number. |
| Topic | `title` | ✅ | Topic title |
| Topic | `description` | | Text under the title |
| Topic | `type` | | `"regular"` or `"pinned"` |
| Topic | `views` | | View count |
| Topic | `hot` | | `true` shows the hot topic icon |
| Topic | `new_posts` | | `true` shows the new posts icon |
| Topic | `locked` | | `true` shows the closed topic icon |
| Topic | `posts` | ✅ | The list of posts, oldest first. Needs at least one. |
| Post | `author` | ✅ | A member's `id` from `data/members.json` |
| Post | `date` | ✅ | Any text |
| Post | `body` | ✅ | The post content (HTML allowed) |

---

## 9. If something goes wrong

**The page turned into a red error mentioning `forums.json`**
There's a typo. The message gives a **line** and **column** number, so look there and just before it. The usual causes are:
- a **missing comma** between two blocks
- an **extra comma** after the last block in a list
- a **missing quote** around a piece of text
- a **missing bracket**: every `{` needs a `}` and every `[` needs a `]`

Fix it and save. The page comes back by itself.

> 💡 Most code editors (VS Code, WebStorm) underline JSON mistakes in red as you type, which makes them easy to find.

**My new forum or topic doesn't show up**
- Did you save the file?
- Is the block inside the right brackets? A forum goes inside a category's `"forums": [ ]`, a topic inside a forum's `"topics": [ ]`.

**A different forum or topic opens than the one I expected**
Two of them share the same `id`. The **⚠** badge in the preview's toolbar names the number. Give one of them a new, unused number.

**A red error saying a topic "has no posts"**
Every topic needs at least one post in its `"posts"` list (the post that starts the topic).

**A red error saying "no member … has that id"**
A post's `"author"` number doesn't match any member's `"id"` in `data/members.json`. Fix the number, or add that member.

**I broke it and can't find the mistake**
If you downloaded the project from GitHub, you can always get the original `data/forums.json` back from there and start again.
