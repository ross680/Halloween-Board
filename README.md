# 3R Halloween TV

GitHub Pages slideshow for the shop TV. Plays animated clips (MP4/WebM/MOV) to the end, then moves on. Images (JPG, PNG, GIF, WebP) show for 15 seconds. A clip that fails to load is skipped instead of sitting on a broken slide.

The board reads `clips.json` first: the copy published with the site, and the copy in the GitHub repo. It plays whichever list was generated later, so a clip added or removed shows up after the list action runs, without calling the GitHub file API. `slides.js` is the backup baked into the page. The API (60 requests an hour) is used only when both of those lists are missing.

## Controls
Right Arrow/Space: next · Left Arrow: previous · P: pause · M: sound on/off · F: fullscreen

## URL options
- `?mute=1` start muted. Sound is on by default; some TV browsers block it until the first click or key press.
- `?seconds=20` how long images show (minimum 5)
- `?maxclip=60` move on if a clip runs longer than this many seconds
- `?shuffle=1` random order
- `?reload=4` reload the page every N hours so a new clip list is picked up
- `?fresh=1` reload the page for every clip, for TV browsers that run out of memory

## Add or remove clips
Drag files into `assets/clips/` on GitHub and commit. Number them `01-`, `02-`, … to set the play order. Keep each file under 25 MB. To remove a clip, delete it from that folder.

The Update clip list action rebuilds `clips.json` and `slides.js` when clips are added or removed. Don't edit those two files by hand.
