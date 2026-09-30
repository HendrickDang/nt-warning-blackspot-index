# NT Warning Blackspot Index

CDU IT Code Fair 2026, Data Innovation Challenge (Theme: Remote Connectivity).

If a bushfire threatens a remote Northern Territory community tomorrow, can anyone
tell them? For each of the 765 communities in the Bushfires NT community risk
dataset, this project combines the published bushfire risk rating, mobile coverage
and tower locations, and population into a single Warning Blackspot Index (WBI):

```
WBI = 100 × (H × U × E)^(1/3)

H  hazard          published risk rating (High 1.0, Moderate 0.6, Low 0.3)
U  unreachability  outside coverage + distance to nearest tower + missing carriers nearby
E  exposure        population on a log scale
```

The index is a geometric mean, so a well-connected community is never flagged as a
blackspot however high its fire risk.

## Repository contents

| Directory | Purpose |
| --- | --- |
| `Bushfire_analysis/` | Python analysis. `wbi_index.py` computes the index; `bushfire_analysis.py` produces the descriptive bushfire figures. Source CSVs, figures and `outputs/` live here. |
| `connectivity-dashboard1/` | Interactive prototype: map and community directory showing WBI scores (Vite + React). Reads the scores produced by `wbi_index.py`, so it shows the same numbers as the report and needs no server. |
| `Warning_Blackspot_App_Source_Code/` | Offline-first hazard reporting app (supporting prototype). |
| `Documents/` | Project report. |

## Reproduce the analysis (Python)

Requires Python 3.10 or newer. Run from the repository root:

```sh
pip install -r Bushfire_analysis/requirements.txt
python Bushfire_analysis/wbi_index.py
python Bushfire_analysis/bushfire_analysis.py
```

`wbi_index.py` writes:

- `Bushfire_analysis/outputs/wbi_scores.csv`: every community with H, U, E, WBI, band and rank
- `Bushfire_analysis/outputs/sensitivity.csv`: ranking stability under 11 alternative design choices
- `Bushfire_analysis/outputs/unmatched_bushtel.csv`: risk-dataset communities with no BushTel match
- `Bushfire_analysis/fig5_wbi_map.png` to `fig8_fireplan_by_rating.png`
- `connectivity-dashboard1/public/data/wbi_communities.geojson`: the file the dashboard loads

`bushfire_analysis.py` writes `fig1` to `fig4`, and `slide_figures.py` (run after `wbi_index.py`) writes the two slide figures `fig9` and `fig10`. Both scripts print their key
statistics to the terminal. Every parameter (hazard mapping, carrier radius,
distance scale, bands) is defined at the top of `wbi_index.py`.

## Run the dashboard

Requires Node.js 18 or newer.

```sh
cd connectivity-dashboard1
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173). The
Communities page lists all 765 communities by WBI; the Help page documents the
method.

## Data sources

All sources are open government data. See Appendix A of the report for the full
provenance table with custodians, download dates and licences.

- Bushfire Risk for Remote Communities in the Northern Territory (Bushfires NT), current as at 30 June 2020
- NT Fire History (NT Fire and Emergency Services)
- BushTel community profiles (Com_BushTel_Profile_CMC_2024)
- Predicted mobile coverage polygons and mobile tower site register (RFNSA site IDs)
- NT administrative boundary

## Known limitations

- Risk ratings date from June 2020.
- Coverage is predicted, not measured. For 28 communities the coverage polygons and
  the tower register disagree; a tower within 5 km is treated as coverage.
- 251 of the 765 communities have no recorded population in either source. The
  median of the same community type is used and every such record is flagged.
- Communities are points, so distances are measured to the community centre.
