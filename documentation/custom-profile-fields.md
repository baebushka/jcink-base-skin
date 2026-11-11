# Custom profile fields
Jcink lets members fill in extra **profile fields**, such as a face claim, an age or the languages their character speaks. This guide explains how to add your board's fields to the preview, give your sample members answers, and show those answers in your skin.

> 💡 Keep the preview running (`npm run dev`) while you edit. Every time you save, the page updates, so you see right away whether your change worked.

---

## Contents

1. [How do custom fields work on Jcink?](#1-how-do-custom-fields-work-on-jcink)
2. [How do I read `custom-fields.json`?](#2-how-do-i-read-custom-fieldsjson)
3. [How do I add a field?](#3-how-do-i-add-a-field)
4. [What is the Fields page?](#4-what-is-the-fields-page)
5. [What field types are there?](#5-what-field-types-are-there)
6. [How do I give sample members answers?](#6-how-do-i-give-sample-members-answers)
7. [How do I use a field in my skin?](#7-how-do-i-use-a-field-in-my-skin)
8. [How do I put my fields on Jcink?](#8-how-do-i-put-my-fields-on-jcink)
9. [Every setting explained](#9-every-setting-explained)
10. [What if something goes wrong?](#10-what-if-something-goes-wrong)

---

## 1. How do custom fields work on Jcink?

You create custom fields in your Admin CP. Each field gets a **number**, called its **field ID**, and Jcink prints a member's answer wherever you write that field's **template variable**:

```html
<!-- |field_76| -->
```

`76` is the field ID. Every field has its own, so a board with a face claim, an age and pronouns might use `<!-- |field_1| -->`, `<!-- |field_2| -->` and `<!-- |field_4| -->`.

In the preview, your fields live in **`data/custom-fields.json`**, and your sample members' answers live in **`data/members.json`**. Like everything in `data/`, both files only exist on your computer and never go to Jcink.

---

## 2. How do I read `custom-fields.json`?

The file uses **the same format as Jcink's export**, so you can paste your board's export straight in. It starts with `{` and ends with `}`, and each field is one block inside it, named after its ID:

```json
{
  "1": {
    "fid": "1",
    "ftitle": "face claim",
    "fdesc": "the celebrity your character looks like",
    "fcontent": "",
    "ftype": "text",
    "freq": "1",
    "fhide": "0",
    "fmaxinput": "50",
    "fedit": "1",
    "forder": "1",
    "fshowreg": "1",
    "fjsonversion": "1.00"
  },
  "76": {
    "fid": "76",
    "ftitle": "languages spoken",
    "fdesc": "one per line",
    "fcontent": "",
    "ftype": "area",
    "freq": "0",
    "fhide": "0",
    "fmaxinput": "0",
    "fedit": "1",
    "forder": "65",
    "fshowreg": "0",
    "fjsonversion": "1.00"
  }
}
```

A few things to notice:
- The number appears **twice**: as the block's name (`"76":`) and as `"fid"`. They must match.
- **Every value is in "double quotes"**, even numbers and yes/no settings. Yes is `"1"`, no is `"0"`.
- Blocks are separated by a comma, but there's **no comma after the last one**.

Every setting is explained in [step 9](#9-every-setting-explained).

---

## 3. How do I add a field?

There are three ways. Use whichever is easiest for you.

### Option A: Paste your board's export

If your board already has its fields, export them from your Jcink Admin CP and paste the **whole** export into `data/custom-fields.json`, replacing the examples. Your field IDs then match your real board, so your templates work the same in both places.

### Option B: Use the Fields page

Open **http://localhost:3000/__fields**, or click **Sample data forms → Fields** in the toolbar in the bottom-right corner. Fill in the form at the bottom of the page and click **Add field**. The page writes the field into `data/custom-fields.json` for you, so you never touch the JSON. See [step 4](#4-what-is-the-fields-page) for everything the page does.

### Option C: Write it by hand

1. Open `data/custom-fields.json`.
2. Copy a whole block, from its `"5": {` line down to its closing `}`.
3. Put a comma after the last block, then paste your copy after it.
4. Change the number in **both** places (`"6":` and `"fid": "6"`). Pick a number no other field uses.
5. Change the rest of the settings and save.

---

## 4. What is the Fields page?

Click **Sample data forms → Fields** in the toolbar, or go to **http://localhost:3000/__fields**. It's a quick overview of `data/custom-fields.json`, plus a form to change it.

### The list of fields

The table at the top shows every field in display order, with its:
- **ID** and **title**, with its description underneath
- **type** (Text Input, Text Area or Drop Down)
- **template variable**. Click it to copy it, ready to paste into a template.
- **Required**, **Hidden**, **Show on Reg.** and **Member Editable** settings
- **display order**

Each row has an **Edit** and a **Delete** button.

### Adding a field

Under the list is a **Field Settings** form, laid out like the one in your Admin CP, with the same questions in the same order. Fill it in and click **Add field**. The page saves the field, reloads, and shows a green message with the field's template variable.

It also gives every sample member in `data/members.json` an **empty answer** for the new field, so you only have to fill it in:

```json
"fields": {
  "field_1": "Zendaya",
  "field_6": ""
}
```

Members who already have an answer for that field keep it. If the field is **required**, the toolbar warns about each empty answer until you fill it in (see [step 10](#10-what-if-something-goes-wrong)).

The form has one extra question at the top: **Field ID**. The Admin CP doesn't ask for this, because Jcink picks the number for you. In the preview you choose it yourself. The form suggests the next free number, and the display order after your last field. If you're copying a field from your real board, use the ID it has there.

For a **Drop Down**, an **Option Content** box appears. Write one option per line as `key=Label`:

```
she=she/her
he=he/him
they=they/them
o=other
```

The **Will produce:** dropdown next to it updates as you type, so you can see the options exactly as members would. See [step 5](#drop-down-drop) for how keys and labels work.

### Editing a field

Click **Edit** on a field's row. Its settings load into the form, and the button changes to **Complete Edit**. Change what you need and click it. You can change the **Field ID** too: the field is saved under the new number and the old one is removed. To leave without saving, click **+ New field instead**.

When you change the ID, your sample members' answers in `data/members.json` move with it: `"field_6": "Singing"` becomes `"field_76": "Singing"`.

> ⚠️ Changing a field's ID doesn't update your templates. Change `field_6` to `field_76` in them, or the toolbar will warn you about the old number.

### Deleting a field

Click **Delete** on its row. The button turns red and asks **Really delete?**: click it again within a few seconds to delete the field, or leave it and it goes back to normal. The field is removed from `data/custom-fields.json`. Your sample members' answers for it stay in `data/members.json`, and the toolbar warns about them until you remove them too.

### Show JSON

Click **Show JSON** at the bottom of the form to see the field as it will be written to the file. Click **Copy** to share it, or to paste it into another project's `custom-fields.json`. You don't need to paste it anywhere yourself: **Add field** and **Complete Edit** already save it.

### Opening the file

Click **Open custom-fields.json** at the top of the page to open `data/custom-fields.json` on your computer. It opens in whichever app your computer uses for `.json` files, often your code editor or a text editor. That's handy for pasting in an export, or checking the file after you've saved a field.

> 💭 If a different app opens than you expected (or nothing does), change your computer's default app for `.json` files. On a Mac: right-click any `.json` file, choose **Get Info**, pick an app under **Open with**, and click **Change All…**. On Windows: right-click it, choose **Open with** → **Choose another app**, and tick **Always use this app**.

### Good to know

- The page updates by itself when you save a file in `data/`, except while you're filling in the form, so you don't lose what you typed.
- The page saves the file in Jcink's export format, two-space indented and in ID order. Dropdown options are saved as `she=she/her|he=he/him|they=they/them|o=other`, and any stray `\r` from an export is removed.
- Only the Fields page itself can save the file. Other websites open in your browser can't change it.

---

## 5. What field types are there?

The type is set with `"ftype"`. It's called **Field Type** on the Fields page and in the Admin CP.

### Text Input (`"text"`)

One line of text, like a face claim or an age. The answer is printed exactly as written.

### Text Area (`"area"`)

Several lines of text, like a list of languages. Each line break in the answer becomes a `<br />` on the page, the same as on Jcink.

### Drop Down (`"drop"`)

Members choose from a list. The choices go in `"fcontent"`, each written as `key=Label` and separated by `|`:

```json
"fcontent": "she=she/her|he=he/him|they=they/them|o=other"
```

- The **key** (`she`) is what Jcink stores for the member.
- The **label** (`she/her`) is what members see in the dropdown, and what `<!-- |field_4| -->` prints.

So a member who picked `she` shows `she/her` on the page.

> 💭 Jcink's export sometimes has a stray `\r` after an option, like `"no=no\r|yes=yes"`. That's normal, and the preview ignores it.

---

## 6. How do I give sample members answers?

> 🧑‍🤝‍🧑 **The easy way:** open the **Members page** (`localhost:3000/__members`, or **Sample data forms → Members** in the toolbar) and click **Edit** on a member. There's a box for every field, already filled in with their answers, and it writes `data/members.json` for you. You can add members and subaccounts there too.

Each member in `data/members.json` has a `"fields"` section. Each answer uses the field's template variable name:

```json
{
  "id": 1,
  "name": "Jane Doe",
  ...
  "fields": {
    "field_1": "Zendaya",
    "field_2": "24",
    "field_4": "she",
    "field_76": "English\nSpanish"
  }
}
```

> The `...` just means "the rest of Jane's settings stay as they are". Don't type it.

- For a **Drop Down**, use either the key (`she`) or the label (`she/her`). The page shows the label either way.
- For a **Text Area**, write `\n` where each new line starts. `"English\nSpanish"` shows as two lines.
- A member who leaves a field out shows **nothing** there, just like on Jcink. That's useful for checking your skin still looks right when a field is empty.
- `"76": "English"` (without `field_`) works too, but `field_76` is easier to match up with your templates.

---

## 7. How do I use a field in my skin?

Put the template variable wherever you want the answer to appear:

```html
<div class="postbit">Languages: <!-- |field_76| --></div>
```

Save, and every post in the preview shows each member's answer.

Whose answer you see depends on **where** you use it:
- In templates about a member (**Mini Profile**, **Post Row**, **Main Profile** and **Member List Row**), it's **that member's** answer: the person who wrote the post, or whose profile it is.
- In the **board wrapper**, it's the answer of the member **looking at the page** (the `"viewer"` in `data/board.json`). Guests have no answers, so their fields are empty.

> ⚠️ **On Jcink itself**, you also have to switch on *"Enable use of Custom Profile Field variables in templates?"* in your Admin CP, or fields won't appear in your templates. The preview always shows them.

### Hiding empty fields

Members often leave optional fields empty. Since an empty field prints nothing, a label like `Languages:` would be left on its own. One common fix is to put the answer in its own element and hide that element with CSS when it's empty:

```html
<div class="field"><b>Languages</b> <span><!-- |field_76| --></span></div>
```

```css
.field:has(span:empty) { display: none; }
```

---

## 8. How do I put my fields on Jcink?

`data/custom-fields.json` never goes to Jcink, so fields you made in the preview need to be created on your board as well:

#### Option A: Import your fields into Jcink
You can navigate through your files and grab `custom-fields.json` from `data/` and copy it into a more accessible place. Then head over into _User and Groups → Custom Profile Fields_. At the bottom of the page, you should see an `Import Custom Profile Fields Set` button.

#### Option B: Creating the fields one by one
1. In your Admin CP, under _User and Groups → Custom Profile Fields_, add a new custom profile field.
2. Copy the settings from the Fields page: the Admin CP form asks the same questions in the same order.
3. Save it, then look at the number Jcink gave it in your custom fields list.

> ⚠️ Jcink picks the number, so it may not match the one you used in the preview. If it's different, change the number in your templates (for example `field_6` → `field_76`) before you import your skin to Jcink. You can also change the field's ID on the Fields page and in `members.json`, so the preview matches your board from then on.

---

## 9. Every setting explained

The **Admin CP** column matches the column names in your Admin CP's custom fields list. The **Fields page** column matches the questions in the form.

| Setting | Admin CP | Fields page | Values |
|---|---|---|---|
| `fid` | Template Variable | Field ID | The field's number. `"76"` means you write `<!-- \|field_76\| -->`. Must match the block's name. |
| `ftitle` | Field Title | Field Title | The field's name, up to 200 characters. |
| `fdesc` | – | Description | A note under the field, up to 250 characters. Often used to say a field is required or hidden. |
| `ftype` | Type | Field Type | `"text"` (one line), `"area"` (several lines) or `"drop"` (a dropdown). See [step 5](#5-what-field-types-are-there). |
| `fcontent` | – | Option Content | Dropdowns only: the choices, as `key=Label\|key=Label`. Empty for other types. |
| `fmaxinput` | – | Max Input | The longest answer allowed, in characters. `"0"` means no limit. |
| `forder` | – | Display order | The field's position in lists. `"1"` comes first. |
| `freq` | Required | Field MUST be completed | `"1"` = members must fill it in. |
| `fhide` | Hidden | Hide from the member's profile? | `"1"` = only admins and super mods see it on the profile. |
| `fedit` | Member Editable | Field can be edited by the member? | `"1"` = members can change it themselves. |
| `fshowreg` | Show on Reg. | Include on registration page? | `"1"` = shown on the registration form. |
| `fjsonversion` | – | – | Part of Jcink's export. Leave it as `"1.00"`. |

The preview only uses the settings that change what a page looks like, or that it can check for you:
- `ftype` and `fcontent` decide how an answer is printed.
- `freq` and `fmaxinput` are checked against your sample members' answers (see [step 10](#10-what-if-something-goes-wrong)).
- `fhide`, `fedit` and `fshowreg` are kept so the file stays identical to Jcink's export. They don't change the preview: on Jcink, too, they have no effect on `<!-- |field_#| -->` in your templates.

---

## 10. What if something goes wrong?

### Common warnings in the toolbar

The **⚠** in the bottom-right toolbar lists problems with your fields and answers. Click it to see them.

| Warning | What to do |
|---|---|
| *Jane Doe, field_1 (face claim) is required but empty* | The field's `freq` is `"1"`, but Jane has no answer. Add one to her `"fields"`, or set `freq` to `"0"`. |
| *Jane Doe, field_2 (age) is 4 characters, over the 3 limit* | Shorten the answer, or raise the field's `fmaxinput`. |
| *Jane Doe, field_4 (pronouns): "she/hers" isn't one of its dropdown options* | Use one of the keys or labels from the field's `fcontent`, or add the option. |
| *post_row: \<!-- \|field_9\| --> isn't in data/custom-fields.json* | A template uses a field that doesn't exist. Add the field, or fix the number in the template. |
| *Jane Doe has field_9, but it isn't in data/custom-fields.json* | Jane has an answer for a field that doesn't exist. Add the field, or remove the answer from `members.json`. |

### Errors on the Fields page

If the form can't save, a red message appears above it:

| Message | What to do |
|---|---|
| *Field 2 already exists (age). Pick another ID.* | Another field has that number. Use the suggested ID, or edit the other field instead. |
| *Field ID must be a whole number, 1 or higher.* | Use a number like `6`, without letters or decimals. |
| *Field Title can't be empty.* | Give the field a title. |
| *Field Title is over 200 characters.* / *Description is over 250 characters.* | Shorten it. The counter under the box shows how long it is. |
| *A Drop Down needs at least one option, like she=she/her.* | Add options to Option Content, or choose another Field Type. |

> **💭 The page turned into a red error mentioning `custom-fields.json`**
>
> There's a typo in your JSON. The message gives a **line** and **column** number, so look there and just before it. Usually it's a missing or extra comma, or a missing quote. Fix it and save. The page comes back by itself. The Fields page won't save anything until the file can be read again.

> **💭 My field shows nothing**
>
> Check that the number in your template matches the field's `fid`, and that the member you're looking at has an answer for it in `members.json`. Dropdown answers that aren't one of the options are printed as they are, and listed in the toolbar.

> **💭 My field works in the preview but not on Jcink**
>
> Switch on *"Enable use of Custom Profile Field variables in templates?"* in your Admin CP, and check the field's number on your board matches the one in your templates (see [step 8](#8-how-do-i-put-my-fields-on-jcink)).

> **💭 I broke it and can't find the mistake**
>
> If you downloaded the project from GitHub, you can always get the original `data/custom-fields.json` back from there and start again.
