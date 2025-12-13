# Shield FX Lab

Interactive Three.js "shield bubble" VFX testing lab for iterating on readability (rim/Fresnel, noise flow, hex/cellular patterns) and impact response (ripples, hotspots, cracks) across weapon types, set in a deep-space backdrop.

## Run locally

This is a static site (no build step). Start a local server and open the page:

- `py -m http.server 8000`
- Open `http://localhost:8000/`

## Project layout

- `index.html` - UI markup + loads the ES module entrypoint
- `styles.css` - UI styles
- `src/` - JavaScript modules (Three.js via CDN ESM imports)
- `index.single.html` - original single-file prototype kept for reference
- `project.MD` - deeper technical notes / architecture
