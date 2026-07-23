# Lakeview Discipleship Hub

A single-page website where each week's discipleship resources live in one place:
left-nav = Year-Month, top toggle = Week 1-4, and a card per resource
(Sermon, Setlist, Connect Group, Prayer Tue/Thu, Family Connect) plus a
month-level Youth Connect card.

## Structure

```
discipleship-hub/
├── index.html        the app (fetches JSON, renders markdown)
├── data/
│   ├── index.json    the month list for the left nav
│   ├── 2026-07.json  one file per month (all its content)
│   ├── 2026-08.json
│   └── ...
└── README.md
```

`index.html` fetches `data/index.json` for the sidebar, then fetches the selected
month's JSON on demand. Content is stored as **markdown strings** and rendered in
the browser.

## Month JSON schema

```json
{
  "label": "July 2026",
  "seriesTitle": "Rooted in Prayer",
  "seriesArc": "one-line description of the month's arc",
  "youthConnect": { "title": "Youth Connect - ... (4th Saturday)", "md": "markdown" },
  "weeks": {
    "1": {
      "sermon": "markdown",
      "setlist": "markdown",
      "connectGroup": "markdown",
      "prayerTue": "markdown",
      "prayerThu": "markdown",
      "familyConnect": "markdown"
    },
    "2": { ... }, "3": { ... }, "4": { ... }
  }
}
```

Any resource value may be `null` (or omitted) - the hub shows an "empty" tag until
it's filled. `seriesTitle`/`youthConnect` may be `null` for a not-yet-planned month.

## How content gets in (the publish flow)

Each generator skill produces markdown. To publish a week:

1. Generate the resource with its skill (e.g. `connect-group-guide` for Week 2).
2. Write that markdown into `data/<month>.json` at `weeks["2"].connectGroup`.
3. Commit + push - GitHub Pages serves the update.

Resource keys: `sermon`, `setlist`, `connectGroup`, `prayerTue`, `prayerThu`,
`familyConnect` (weekly); `youthConnect`, `seriesTitle`, `seriesArc` (monthly).

**`youthConnect.md` must always be the FULL program**, not a summary - theme package,
program flow, the complete Group Dynamics game breakdown, THE WORD (with the Gospel
Landing), the Altar Call, and songs. Paste the complete `youth-connect` skill output so
everything a leader needs is in the card.

To add a **new month**: create `data/<YYYY-MM>.json` and add an entry to
`data/index.json`'s `months` array (`{ "key": "2026-10", "label": "October 2026" }`).

## Viewing locally

Browsers block loading the JSON from `file://`, so run a tiny web server:

```
python3 -m http.server 8747 --directory /Users/jayvee/Documents/ds-work/discipleship-hub
```

then open http://localhost:8747/ .

## Live site

Deployed at **https://jayr-ai.github.io/lakeview-discipleship-hub/**
(repo `jayr-ai/lakeview-discipleship-hub`, GitHub Pages on `main` / root).

To publish updates, just commit and push - Pages rebuilds automatically (~1 min):

```
git -C /Users/jayvee/Documents/ds-work/discipleship-hub add -A
git -C /Users/jayvee/Documents/ds-work/discipleship-hub commit -m "Update <month>"
git -C /Users/jayvee/Documents/ds-work/discipleship-hub push
```

## Save as PNG

Every card (and the Youth Connect card) has a "Save PNG" button that exports just that
card as a high-resolution PNG (3x, ~2040px wide) for sharing in Messenger/chat. It uses
a self-contained SVG-to-canvas exporter - no external library.
