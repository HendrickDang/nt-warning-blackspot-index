# Warning Blackspot — Source Code

This folder contains the source code for the Warning Blackspot mobile-app prototype.

## Main interface files

- `app/page.tsx` — app screens, navigation, offline queue and interactions
- `app/globals.css` — main styling
- `app/overrides.css` — screenshot layout, hazard icons and language controls
- `app/layout.tsx` — page metadata and global styles
- `public/` — icons and social preview image

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

## Important note

This is an interactive prototype for the CDU Data Innovation Challenge. The map and reports use demonstration data. A production app would require verified geographic data, offline image storage, a secure government API, community-reviewed Murrinh Patha translations and recorded audio.
