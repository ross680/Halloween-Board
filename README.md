# 3R Shop TV

Static GitHub Pages board for the shop TV. It picks a theme from the date in **America/New_York** and loops that theme's slides. Videos play to the end. Images and the built-in cards stay up for 15 seconds.

The page does **not** call the GitHub API. Media lists live in `clips.json`. `slides.js` is the same list and is used if `clips.json` cannot be fetched. Both are updated by `scripts/update-manifest.mjs` and by the "Update clip playlist" GitHub Action.

## Themes and dates

Edit the windows in `settings.js`. Dates are month-day. A window that crosses New Year is written with the later month first (`12-31` through `01-07`). Holidays are checked from the top of the list. The first match wins. Boiler season is the heating backdrop underneath them.

| Theme | When it plays | What you see |
| --- | --- | --- |
| Halloween | Oct 1 – Nov 1 | The clips in `assets/clips/` (and anything in `assets/themes/halloween/`), in file-name order. No extra cards. |
| Heating season | Oct 1 – Mar 31, on days no holiday takes the board | Boiler tune-ups, no-heat calls, carbon monoxide, frozen pipes, memberships, cold-day safety |
| Thanksgiving | The Sunday–Saturday week that contains Thanksgiving | A thank-you to the crew, plus a few heating-season slides |
| Christmas | Dec 1 – Dec 30 | Holiday greetings, plus a few heating-season slides |
| New Year | Dec 31 – Jan 7 | New-year kickoff, plus a few heating-season slides |
| Valentine's Day | Feb 7 – Feb 14 | Short February slides, plus a few heating-season slides |
| St. Patrick's Day | Mar 10 – Mar 17 | Short March slides, plus a few heating-season slides |
| Fourth of July | Jun 28 – Jul 5 | Holiday greetings and gas-safety reminders |
| Shop | Every other day (about April–September, outside the Fourth) | Everyday 3R reminders |

Heating-season slides are mixed into a holiday only while heating season is actually on, and only when that holiday is marked `mixBoiler` in `settings.js`. Halloween is marked off, so October still plays the clip reel exactly as before.

Force a theme with `?theme=boiler` (or `halloween`, `thanksgiving`, `christmas`, `newyear`, `valentines`, `stpatricks`, `july4`, `shop`). Preview a day without changing the TV clock with `?date=2026-12-25`. `?slide=3` starts on that slide (1 is the first).

Card copy is in `cards.js`. Each theme has a folder under `assets/themes/<name>/`. Drop MP4s or images there and they join that theme's rotation after the built-in cards. Halloween clips already live in `assets/clips/`; extra Halloween files can go in `assets/themes/halloween/` and are sorted in with them by file name.

## Controls

Right arrow or Space: next · Left arrow: previous · P: pause · M: sound on/off · F: fullscreen

Sound is on by default. Add `?mute=1` to start muted. If the TV blocks autoplay with sound, the board keeps playing muted until someone taps or presses a key.

## Keeping the board up

These apply to every theme, including the HTML cards.

One `<video>` element is reused. Each clip is detached (`pause`, clear `src`, `load()`) before the next one so the TV can free the decoder. Timers and media handlers from the previous clip are cleared or ignored. Theme animations are a fixed handful of elements, replaced only when the theme changes, not stacked per slide.

- A clip that errors, produces no picture, or sits with no playback progress for 20 seconds is skipped.
- If a whole pass makes no progress, the page reloads once. If it just reloaded and is still stuck, it waits a minute instead of reboot-looping.
- Coming back online retries the clip that failed. It does not reload the page.
- At 3:00am local time the page reloads on a slide boundary. `?nightly=0` turns that off. `?athour=4` uses 4:00am instead.
- `?loops=20` also reloads after 20 full passes, on a slide boundary. Off by default.
- `?reload=8` reloads every 8 hours, also on a slide boundary. Off by default.
- `?fresh=1` loads a new page for every slide. Last resort for a TV that still leaks memory.
- `?debug=1` shows the theme, uptime, page loads, the current slide, and the last problem.

Other options: `?seconds=20` (images and cards), `?shuffle=1`, `?maxclip=60` (hard cap per video, seconds), `?stall=20`, `?watchdog=90`.

After this is published, reload the TV once so it picks up the new page. GitHub Pages can take a minute, and the TV may cache the old `index.html` for about 10 minutes.

## Add or remove media

1. Put the file in the theme folder (`assets/themes/christmas/`, and so on). Halloween clips go in `assets/clips/` or `assets/themes/halloween/`. Number the name (`01-`, `02-`, …) to set the order.
2. From a checkout, run `node scripts/update-manifest.mjs` and commit `clips.json`, `slides.js`, and `index.html` with the file.
3. On `main`, the GitHub Action does that same update if the manifest was not committed. It needs to be able to push to `main`.

To change when a theme appears, edit `settings.js`. To change the words on a card, edit `cards.js`. Neither needs the manifest script. To add a brand-new named theme, add a folder, cards, and a holiday entry.

Check the calendar math with `node scripts/check-schedule.mjs`.

## Encoding

Every current Halloween clip is the same shape: 720p, about 15 seconds, about 9.1 MB. None is an outlier in size. All of them are **H.264 High profile, level 4.0, with B-frames, at about 4.9 Mbps**, plus AAC stereo. Desktop Chrome plays that. A lot of shop TVs only hardware-decode **Baseline or Main**, and High profile falls back to a software decoder that runs out of memory, freezes, or stays black. Faststart is already set (the file can start before it is fully downloaded).

Re-encode a clip (do this on a computer, then commit the new file; nothing here replaces the videos):

```bash
ffmpeg -y -i "INPUT.mp4" \
  -vf "scale='min(1280,iw)':-2" \
  -c:v libx264 -profile:v main -level:v 4.0 -pix_fmt yuv420p \
  -r 24 -b:v 1800k -maxrate 2200k -bufsize 3600k \
  -c:a aac -ac 2 -ar 44100 -b:a 128k \
  -movflags +faststart \
  "OUTPUT.mp4"
```

That is 720p (under 1080p), H.264 Main, about 1.8 Mbps. If a TV still shows a black picture, use Baseline instead: add `-profile:v baseline -level:v 3.1 -bf 0` in place of the Main profile line.

| Clip | Size | Video |
| --- | ---: | --- |
| 02-the-ring.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.88 Mbps, 2 B-frames |
| 03-leatherface.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.87 Mbps, 2 B-frames |
| 04-chucky.mp4 | 9.1 MB | 1280×720, High@L4.0, 4.89 Mbps, 2 B-frames |
| 05-pennywise.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.87 Mbps, 2 B-frames |
| 06-ghostface-answers-the-leak.mp4 | 9.1 MB | 1280×720, High@L4.0, 4.88 Mbps, 2 B-frames |
| 07-michael-myers-quiet-drip.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.87 Mbps, 2 B-frames |
| 08-freddy-krueger-after-midnight.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.87 Mbps, 2 B-frames |
| 09-jason-voorhees-drain-terror.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.87 Mbps, 2 B-frames |
| 10-frankenstein-old-boilers.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.88 Mbps, 2 B-frames |
| 11-swamp-witch-sump-pumps.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.88 Mbps, 2 B-frames |
| 12-headless-horseman-boilers.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.87 Mbps, 2 B-frames |
| 13-plague-doctor-drains.mp4 | 9.0 MB | 1280×720, High@L4.0, 4.88 Mbps, 2 B-frames |

Audio on each file is AAC-LC, 44.1 kHz, stereo, about 160 kbps. Duration is 15.0 seconds.
