# Warning Blackspot Index (WBI)

**Bushfire Risk and Warning Reachability Across 765 Northern Territory Communities**

CDU IT Code Fair 2026, Data Innovation Challenge, Theme: Remote Connectivity
Team 10 (registration ID DIC010): **Last Bar**

| Member | Role |
| --- | --- |
| Van Hoi (Hendrick) Dang | Data pipeline, index design, report |
| Le Nhat Minh (Thomas) Tran | Data collection, analysis, visualisation |
| Minh Hoang (Miho) Bui | Offline reporting app |
| Ngoc Ngan (Kelly) Le | Slide deck, design, ethics section |

Repository: https://github.com/HendrickDang/nt-warning-blackspot-index

---

## 1. The question

If a bushfire threatens a remote Northern Territory community tomorrow, can anyone tell them?

For every community in the Bushfires NT community risk dataset, the project combines the
published bushfire risk rating, mobile coverage and tower locations, and population into one score:

```
WBI = 100 × (H × U × E)^(1/3)

H  Hazard          published risk rating: High 1.0, Moderate 0.6, Low 0.3
U  Unreachability  mean of: outside predicted coverage (tower within 5 km counts as covered),
                   distance to nearest tower (capped at 50 km),
                   share of the 3 carriers with no tower within 35 km
E  Exposure        log1p(population) / log1p(max population)
```

The geometric mean means a community must score on all three to rank high: a well-connected
community is never flagged as a blackspot, however high its fire risk.
Bands: Critical 60+, High 50 to 59, Moderate 35 to 49, Low below 35.

## 2. Key results

Running `wbi_index.py` gives these numbers, which match the report and slides:

| Result | Value |
| --- | --- |
| Communities scored | 765 |
| Critical band (WBI 60+) | 69 (54 High-rated, 15 Moderate-rated) |
| Strict blackspots: High risk, outside coverage, no carrier within 35 km | 53 (median 52 km to a tower, max 117 km; 43 with no recorded population) |
| Spearman correlation, risk rating vs unreachability | 0.177 (weak, positive) |
| High-risk communities with an approved fire plan | 0 of 168 |
| Communities with no recorded population (median imputed, flagged) | 251 of 765 (33%) |
| Sensitivity, 11 alternative designs | rank correlation 0.944 to 0.998, 81% to 99% of Critical retained (except linear population: 0.837, 23%) |

## 3. What is in this folder

| Path | Contents |
| --- | --- |
| `Bushfire_analysis/` | Python analysis. Source CSVs, figures 1 to 10 and `outputs/` |
| `Bushfire_analysis/wbi_index.py` | **Main script.** Computes H, U, E and the WBI, sensitivity analysis, figures 5 to 8, and the dashboard data file |
| `Bushfire_analysis/bushfire_analysis.py` | Descriptive bushfire figures 1 to 4 |
| `Bushfire_analysis/slide_figures.py` | Dark slide figures 9 and 10 (run after `wbi_index.py`) |
| `Bushfire_analysis/data/towers_region.geojson` | ACCC 2026 tower sites in and around the NT (623 sites), kept here so results reproduce exactly |
| `connectivity-dashboard1/` | Interactive dashboard (Vite, React, TypeScript, Leaflet): WBI map, community directory, field reports. `server/` is the field-reports API |
| `mobile/` | Offline-first hazard reporting app (React Native, Expo) for Android and iOS |
| `Warning_Blackspot_App_Source_Code/` | Web version of the reporting app prototype (Next.js) |
| `Documents/` | Project report (DOCX and PDF) |
| `start-blackspot.cmd` | Windows one-click launcher for the dashboard, reports API and USB phone link |

## 4. Reproduce the analysis (Python)

Requires Python 3.10 or newer. Run from this folder (the repository root):

```sh
pip install -r Bushfire_analysis/requirements.txt
python Bushfire_analysis/wbi_index.py
python Bushfire_analysis/bushfire_analysis.py
python Bushfire_analysis/slide_figures.py
```

`wbi_index.py` prints the key statistics above and writes:

- `Bushfire_analysis/outputs/wbi_scores.csv`: every community with H, U, E, WBI, band, rank and flags
- `Bushfire_analysis/outputs/sensitivity.csv`: ranking stability under 11 alternative designs
- `Bushfire_analysis/outputs/unmatched_bushtel.csv`: communities with no BushTel match
- `Bushfire_analysis/fig5_wbi_map.png` to `fig8_fireplan_by_rating.png`
- `connectivity-dashboard1/public/data/wbi_communities.geojson`: the scores the dashboard loads

All parameters (hazard mapping, coverage radius, carrier radius, distance cap, bands) are
defined at the top of `wbi_index.py`, and key steps are commented in the code.

## 5. Run the dashboard and mobile app (step by step)

Requires Node.js 22 or newer. The full demo uses three terminals, all opened in this
folder (the repository root). Leave each one running.

**Step 1. Start the reports API (terminal 1)**

```sh
cd connectivity-dashboard1
npm install
npm run server
```

The terminal shows `Warning Blackspot reports API listening on http://0.0.0.0:8787`.
`0.0.0.0` only means "listening on all network interfaces"; it cannot be opened in a
browser. To check the API, open **http://localhost:8787/api/health** (a short JSON
reply) or **http://localhost:8787/api/reports** (the saved reports). The API has no home
page, so http://localhost:8787/ on its own returns "Not found".

**Step 2. Start the dashboard (terminal 2)**

```sh
cd connectivity-dashboard1
npm run dev
```

Open **http://localhost:5173**.

- **Live Map** and **Communities** show the WBI for all 765 communities, read from the
  output of `wbi_index.py`, so the numbers match the report. These pages work without step 1.
- **Analytics** shows charts of risk, reachability and live disaster alerts.
- **Field Reports** shows reports received by the API in step 1 (the dashboard forwards
  `/api` requests to port 8787). It starts with 3 demonstration reports.
- **Help & Support** explains the method.

Checks (optional): `npm test` (49 tests), `npm run lint`, `npm run build`.

**Step 3. Start the mobile app (terminal 3)**

Install **Expo Go** (latest version) on an Android or iOS phone first. Expo Go asks you
to be signed in, so create a free account at https://expo.dev/signup, sign in to Expo Go
on the phone (profile icon, top right) and sign in on the computer with the same account:

```sh
cd mobile
npm install
npx expo login
npx expo start
```

A QR code appears in the terminal. Scan it with Expo Go (Android) or the Camera app
(iPhone). The phone and computer must be on the same Wi-Fi; if the network blocks this,
stop it and run `npx expo start --tunnel` instead.

**Step 4. Send a test report**

1. In the app, tap **Report**, choose a hazard, take a photo and tap **Send**.
2. On the dashboard's **Field Reports** page (it refreshes automatically), the new report
   appears with its GPS position and photo. **View on Map** shows where it was sent from.
3. To see the offline behaviour, turn on flight mode and send another report. It waits in
   the **Queue** tab as `queued` and is sent automatically when the phone reconnects.

Notes:

- The app finds the API automatically through the Expo connection. If it cannot, see
  `mobile/README.md` to set `EXPO_PUBLIC_API_URL`.
- Pressing `w` in terminal 3 opens the app in a web browser for a quick look. The live
  map and camera only work on a phone, so the browser shows the offline map instead.
- On Windows, `start-blackspot.cmd` (in this folder) runs steps 1 and 2 in one go
  and links a USB-connected Android phone with `adb reverse`.

## 6. Run the web prototype

Requires Node.js 22.13 or newer. See `Warning_Blackspot_App_Source_Code/HOW_TO_RUN.md`.

```sh
cd Warning_Blackspot_App_Source_Code
npm install
npx vite
```

Use `npx vite` rather than `npm run dev`: the `dev` script sets an environment variable
in Unix style, which fails in the Windows command prompt. Open the local address shown
in the terminal.

## 7. Data sources

All sources are open government data. Full provenance (custodian, download date, licence,
limitations) is in Appendix A of the report.

| Dataset | Custodian | Licence | Used for |
| --- | --- | --- | --- |
| Bushfire Risk for Remote Communities in the NT (current as at 30 June 2020) | Bushfires NT | CC BY 4.0 | Hazard, fire plans, population |
| BushTel community profiles (CMC 2024) | NT Government | See data.nt.gov.au | Population where missing |
| ACCC Mobile Infrastructure Report 2026 data release: coverage map and tower sites | ACCC | CC BY 2.5 AU | Unreachability |
| NT Fire History (2025 season) | NT Fire and Emergency Services | CC BY 4.0 | Context |
| Administrative boundaries | Geoscape Australia | See data.gov.au | Map outline |

## 8. Known limitations

- Risk ratings date from June 2020, and the method behind them is not published.
- Coverage is predicted, not measured. For 28 communities the coverage polygons and the
  tower register disagree; a tower within 5 km is treated as coverage.
- 251 of 765 communities have no recorded population. The median for the community type
  is used and every such record is flagged (`population_basis` column).
- Communities are points, so distances are measured to the community centre.
- The index ranks where to look first. It does not replace local knowledge; results
  should be checked with communities and land councils before any decision.
- The reporting apps are prototypes with demonstration data, not an official warning system.

## 9. AI use

AI tools were used during the project. What they were used for and how their output was
checked is declared in Appendix B of the report.
