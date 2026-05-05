# BePro

BePro is a lightweight gamified web app for productivity monitoring and focus boosting. It runs with plain HTML, CSS, and JavaScript, so there is no build step and no dependency install.

## What it includes

- Focus currency named `Focus`, with a bank, combo system, levels, quests, and achievements
- Animated focus timer with focus, short-break, and long-break modes
- Task board with active-task selection and Focus rewards for completing work
- Distraction logging so you can spot where attention is leaking
- Animated productivity graph with `1 week`, `1 month`, and `1 year` views
- Local persistence through `localStorage`

## Run it

Open [index.html](./index.html) directly in a browser.

If you want a local server instead, you can also use any static file server you already have installed.

## Notes

- Data is stored in the browser, not in a backend database.
- Timer progress itself does not survive a page reload, but Focus history, quests, task progress, and distraction history do.
