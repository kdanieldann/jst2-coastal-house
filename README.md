# JST–2 Coastal House

[Play the house](https://kdanieldann.github.io/jst2-coastal-house/)

Five connected Gaussian Splat environments with an editable Three.js concept floor plan, subtle animated water, a PINOC visitor and Sea Life background music. English interface.

## Controls

- Drag to look around; WASD or arrow keys to walk.
- Hold Shift to run; V switches first/third person; B switches to the plan.
- Walk through a marked doorway or click a room on the map.
- Use the music and water buttons to toggle ambience.

## Development

Use Node.js 22.12 or later. Run `npm ci`, then `npm run dev`. `npm test` checks navigation, geometry corrections and ambience behavior. `npm run build` produces `dist/`.

Pushes to `main` build, test and deploy automatically through GitHub Pages. The Vite base path is `/jst2-coastal-house/`.

## Scene assets

The five active scenes are in `public/assets/`: `living.spz`, `gallery.spz`, `bedroom.spz`, `study.spz`, and `courtyard.spz`. The bedroom includes the latest perspective surface completion. SPZ is the compressed Gaussian Splat format used by the player. Assets, character clips and audio are included so playback does not depend on the original hosted site.

Rooms are separate reconstructions linked by doorway transitions, not one globally registered scan. The plan has editable concept dimensions, not surveyed dimensions. Some generated geometry and material softness remain; modeled completion is not a new multi-camera reconstruction.

Three.js · PlayCanvas · Viggle Splat Engine · JST-2 environments · PINOC character.
