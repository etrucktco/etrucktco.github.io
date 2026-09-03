# Adding or updating a truck

You do not edit the truck pages. They are generated. Everything lives in one
file — **`data/trucks.json`** — and a small script turns it into web pages.

If you edit `man-etgx.html` or `windrose-r700.html` by hand, your change
disappears the next time anyone runs the build. Edit the JSON instead.

---

## Updating a number

1. Open `data/trucks.json` in any text editor.
2. Find the truck and the figure you want to change.
3. Change three things together — the number, the label saying where it came
   from, and the note explaining it:

```json
"battery_kwh": {
  "value": 660,
  "confidence": "official",
  "note": "Net capacity, stated by MAN at the Munich press conference."
}
```

4. Change `"updated"` at the top of the file to today's date.
5. Run the build (see below).

### The four labels — get this right

This is the part that matters. The whole site's credibility rests on not
dressing up a guess as a fact.

| Label | Use it when |
|---|---|
| `official` | The manufacturer said it — press release, spec sheet, their own website. |
| `reported` | A named trade publication said it, citing the manufacturer. |
| `derived` | You calculated it from an official number. Put the arithmetic in the note. |
| `estimate` | It is your own judgement. Nobody published it. |

If you are not sure, use the weaker label. A figure marked `estimate` that
turns out to be exact costs nothing. A guess marked `official` costs the
site its reputation.

**When sources disagree, do not pick a winner.** Give the range and say so in
the note — see `power_hp` for the Windrose, where reports vary between 1040
and 1400 hp.

**When nothing is published, write `null`.** The page will print "not
published", which is honest and useful. Do not invent a plausible number.

---

## Adding a whole new truck

Copy an existing block inside `"models": [ ... ]` and change the contents.
The required fields are:

- `slug` — the filename, lowercase with hyphens, e.g. `volvo-fh-electric`.
  This becomes `volvo-fh-electric.html`.
- `brand`, `name`, `full_name`, `year_introduced`, `positioning`
- `intro` — two or three sentences. Say where the truck sits in the market.
- `og_summary` — one line. It shows up on the page card and when the link is
  shared on social media.
- `markets`, `availability`
- `variants` — one entry per version worth comparing. Mark one
  `"headline": true`; that is the one used in the comparison table by default.
- `range_note`, `charging_note`, `tco_note` — the prose sections.
- `sources` — at least one, with a working link and a date.
- `data_quality` — optional. Use it when a truck's figures are shaky; it
  prints a warning box at the top of the page.

Then run the build. A new page appears, and the truck shows up automatically
in the comparison table and the range calculator. Nothing else to wire up.

---

## Running the build

You need Node installed. From the site folder:

```
node tools/build-models.js
```

It prints which pages it wrote. That is all it does — it touches
`man-etgx.html`, `windrose-r700.html` and `models.html`, and nothing else on
the site.

If the command fails with a message about JSON, you have a typo in
`data/trucks.json` — usually a missing comma or a stray quote. Paste the file
into any online JSON validator to find it.

---

## Changing the range calculator

The calculator's assumptions are not hidden in code. They sit in
`data/trucks.json` under `planning_factors`: how much range an empty truck
gains, what cold weather costs, how much you hold back as an arrival reserve.

Change a number there and the calculator changes everywhere, including the
explanation printed on the page. If you make it less conservative, say so on
the page — planners rely on these numbers being cautious.

---

## Where the pages end up

| File | What it is |
|---|---|
| `data/trucks.json` | The source of truth. Edit this. |
| `tools/build-models.js` | The generator. Rarely needs touching. |
| `man-etgx.html`, `windrose-r700.html` | Generated model pages. Never edit. |
| `models.html` | Generated comparison table + range calculator. Never edit. |
| `ADDING-A-TRUCK.md` | This file. |
| `compare.html` | Hand-written. Its intro table repeats a few figures — keep it in step by hand. |

`data/trucks.json` is published on the live site, so anyone can read the data
programmatically. Keep it clean — it is part of the product, not a working
file.
