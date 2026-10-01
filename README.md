# 3R Halloween TV

GitHub Pages slideshow for the shop TV. Plays animated clips (MP4/WebM/MOV) to the end, then moves on. Images (JPG/PNG) are also supported and show for 15 seconds.

## Controls
Right Arrow/Space: next · Left Arrow: previous · P: pause · M: sound on/off · F: fullscreen

## URL options
- `?sound=1` start with sound on (some TV browsers block this until you click once)
- `?seconds=20` how long images show
- `?shuffle=1` random order
- `?reload=4` reload every N hours so new clips appear automatically

## Add clips
Drag files into `assets/clips/` on GitHub and commit. That's it — the player finds them automatically and plays them in file-name order (number them 01-, 02-… to control order). Keep each file under 25 MB for browser upload. To remove one, delete it from the folder.
