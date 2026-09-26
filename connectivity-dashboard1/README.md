# NT Remote Connectivity & Warning Blackspot Dashboard

A map and analysis dashboard for exploring remote community connectivity,
bushfire exposure, and warning reachability across the Northern Territory.
This project is one of several apps in the repository and has its own
dependencies and commands.

## Run the app from a clone

### Prerequisites

- Git
- Node.js **22.12 or newer** and npm
- Internet access for OpenStreetMap tiles and live FireNorth fire layers

Clone the repository, then install and run the dashboard from its directory.
Replace `<repository-url>` with the clone URL shown on the repository page:

```bash
git clone <repository-url> nt-warning-blackspot-index
cd nt-warning-blackspot-index/connectivity-dashboard1
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in a browser. Stop the
development server with `Ctrl+C` in the terminal. No environment file or
backend service is required.

## Using the dashboard

Use the left navigation to open:

- **Live Map** — explore community locations, mobile coverage, tower sites, the
  NT boundary, active-fire hotspots, and burnt-area overlays. Use the layers
  panel to toggle map layers and click map features for details.
- **Analytics** — review community counts, population, and regional summaries.
- **Communities** — search, filter, sort, and inspect community records and
  their calculated Warning Blackspot Index (WBI) scores.
- **Help & Support** — read the in-app methodology, data-source, and usage notes.

The prototype WBI is a 0–100 composite score using four weighted dimensions:

| Dimension | Weight |
| --- | ---: |
| Connectivity gap | 35% |
| Natural hazard exposure | 25% |
| Infrastructure proximity | 20% |
| Digital exclusion | 20% |

The in-app Help page describes the scoring inputs and data provenance in more
detail.

## Data and network access

Community, coverage, tower, boundary, and bushfire-risk datasets are bundled in
`public/data/`. Keep these files in place; the app loads them at runtime through
a single shared data layer (see below). The basemap uses OpenStreetMap, and live
fire overlays are served by the NAFI / FireNorth WMS, so those layers require an
internet connection. Bundled datasets provide the underlying community and
connectivity views.

The shipped `towers.geojson` is filtered to Northern Territory sites and the
`coverage.geojson` coordinates are rounded to ~1 m precision. Rerun
`npm run prepare-data` to regenerate both from fresh upstream exports (the
script documents where each dataset comes from). The original national towers
dataset remains recoverable from git history.

Data custodians and attribution are documented in the dashboard's **Help &
Support** page. Fire-layer attribution is also shown on the map.

## Architecture notes

- **Shared data layer** — `src/context/DataProvider.tsx` loads every dataset
  once, so the map, analytics and community directory reuse the same data and
  the WBI score is computed once rather than per page. The heavy coverage
  contours are loaded lazily, only when the coverage layer or the WBI is needed.
- **WBI engine** — `src/utils/wbiCalculators.ts` is the single source of truth
  for the Warning Blackspot Index (Connectivity Gap 35%, Natural Hazard 25%,
  Infrastructure Proximity 20%, Digital Exclusion 20%).
- **Layer state in the URL** — visible map layers are encoded in the `?layers=`
  query parameter, and the community directory keeps its filters, sort and page
  in the URL so any view can be shared.

## Development commands

Run commands from `connectivity-dashboard1/`:

```bash
npm run dev          # start the Vite development server
npm run build        # type-check and create the production bundle in dist/
npm run preview      # preview the production bundle after building
npm run lint         # run ESLint
npm test             # run the Vitest unit tests
npm run prepare-data # regenerate the NT tower and coverage datasets
```

The app uses React, TypeScript, Vite, Leaflet, and Plotly. Unit tests cover the
pure WBI calculators, the data loader, CSV parsing, and HTML escaping.
