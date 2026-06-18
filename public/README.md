# Static assets (served at the site root)

Files in this `public/` folder are served by Vite at the web root (`/`) in dev,
and copied into `dist/` for production builds.

## Building plan photo (the Floor Map)

The Command Center Floor Map will display a real building-plan image if you
place it here:

```
public/building-plan.png
```

- Use the FDNY "Get to Know Your Building" sheet for 4 Irving Plaza, exported
  as a PNG named exactly `building-plan.png`.
- It is shown inside the map and pans/zooms with the zoom controls.
- If the file is missing, the Floor Map automatically falls back to the built-in
  drawn schematic (banks A–G + T, stairs, FCS, compass, streets) — nothing
  breaks either way.

The status pills (NW/NE/SW/SE), zoom/pan controls, building legend, and the
Headcount & Locator roster all keep working on top of the photo.
