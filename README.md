# Portfolio site source

Source for the resume/portfolio artifact:
**https://claude.ai/code/artifact/1c142d76-5bc5-41ee-b64d-63443d06860d**

## Files
- `resume.template.html` — the page (placeholders for icons + media)
- `build.js` — embeds app icons, the three playable games, PupWalk screenshots, and any clips → writes `resume.html`
- `bubble.html` — the Bubble Blocker prototype source (also the pickup point for improving the game)
- `clips/` — drop native-app screen recordings here (see below)

## Rebuild & publish
```
node build.js        # writes resume.html (~1.2 MB + any clips)
```
Then in a Claude Code session: publish `resume.html` with the **Artifact tool, passing
`url: https://claude.ai/code/artifact/1c142d76-5bc5-41ee-b64d-63443d06860d`** so the
link stays the same. (From the original session, republishing the file path is enough.)

## Adding the native-app clips
Record on iPhone (Control Center → Screen Recording, portrait, ~8–15 s), AirDrop to
the Mac, then compress (videos loop muted, so strip audio):

```
/opt/homebrew/bin/ffmpeg -i in.mov -vf "scale=480:-2,fps=24" \
  -c:v libx264 -preset veryslow -crf 28 -an -movflags +faststart clips/ember.mp4
```

Recognized names: `clips/ember.mp4`, `clips/subtrack.mp4`, `clips/pileup.mp4`,
optionally `clips/pupwalk.mp4` (replaces its screenshots). Rebuild and republish —
video automatically replaces the poster/screenshots in each iPhone frame.

## Notes
- `build.js` reads app icons + the two web games from `~/Desktop/<project>` paths —
  keep those project folders in place.
- Fallback order per phone frame: **video → screenshots → poster**.
- Statuses on the page (e.g. "iOS in submission") are manual — update
  `resume.template.html` when 1 More Swing is approved.
