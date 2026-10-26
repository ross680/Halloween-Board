# 3R Halloween TV

Static GitHub Pages slideshow for the shop TV. It plays the clips in `assets/clips/` in file-name order, then loops. Videos play to the end. Images (JPG, PNG, GIF, WebP) show for 15 seconds.

The page does **not** call the GitHub API. The playlist is `clips.json`, generated from the clip folder. `slides.js` is the same list and is used if `clips.json` cannot be fetched. Both are updated by `scripts/update-manifest.mjs` and by the "Update clip playlist" GitHub Action when clips change.

## Controls

Right arrow or Space: next · Left arrow: previous · P: pause · M: sound on/off · F: fullscreen

Sound is on by default. Add `?mute=1` to start muted. If the TV blocks autoplay with sound, the board keeps playing muted until someone taps or presses a key.

## Keeping the board up

One `<video>` element is reused. Each clip is detached (`pause`, clear `src`, `load()`) before the next one so the TV can free the decoder. Timers and media handlers from the previous clip are cleared or ignored, so they do not stack up over a long weekend.

- A clip that errors, produces no picture, or sits with no playback progress for 20 seconds is skipped.
- If a whole pass makes no progress, the page reloads once. If it just reloaded and is still stuck, it waits a minute instead of reboot-looping.
- Coming back online retries the clip that failed. It does not reload the page.
- At 3:00am local time the page reloads on a clip boundary (after the current clip), which clears leaks in the TV browser. `?nightly=0` turns that off. `?athour=4` uses 4:00am instead.
- `?loops=20` also reloads after 20 full passes, on a clip boundary. That is off by default. The old page reloaded every 10 passes (about every 30 minutes) and every 4 hours in the middle of a clip, which looked like a crash.
- `?reload=8` reloads every 8 hours, also on a clip boundary. Off by default.
- `?fresh=1` loads a new page for every clip. Last resort for a TV that still leaks memory.
- `?debug=1` shows uptime, page loads, the current clip, and the last problem.

Other options: `?seconds=20` (image duration), `?shuffle=1`, `?maxclip=60` (hard cap per video, seconds), `?stall=20`, `?watchdog=90`.

After this is published, reload the TV once so it picks up the new page. GitHub Pages can take a minute, and the TV may cache the old `index.html` for about 10 minutes.

## Add or remove clips

1. Put the file in `assets/clips/`. Number the name (`02-`, `03-`, …) to set the order. Keep new files modest in size; see encoding below.
2. From a checkout, run `node scripts/update-manifest.mjs` and commit `clips.json`, `slides.js`, and `index.html` with the clip.
3. On `main`, the GitHub Action does that same update if the manifest was not committed. It only needs to be able to push to `main`.

To remove a clip, delete the file and update the manifest the same way.

## Encoding

Every current clip is the same shape: 720p, about 15 seconds, about 9.1 MB. None is an outlier in size. All of them are **H.264 High profile, level 4.0, with B-frames, at about 4.9 Mbps**, plus AAC stereo. Desktop Chrome plays that. A lot of shop TVs only hardware-decode **Baseline or Main**, and High profile falls back to a software decoder that runs out of memory, freezes, or stays black. Faststart is already set (the file can start before it is fully downloaded).

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
