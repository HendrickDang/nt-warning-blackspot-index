"""
Warning Blackspot Index (WBI) for Northern Territory remote communities.

Question: if a bushfire threatens this community tomorrow, can anyone tell them?

For each of the 765 communities in the Bushfires NT community risk dataset we
combine three components, each scaled 0 to 1:

    H  hazard          published bushfire risk rating (High 1.0, Moderate 0.6, Low 0.3)
    U  unreachability  outside predicted coverage + distance to nearest tower
                       + lack of carrier redundancy nearby
    E  exposure        log-scaled population, so small outstations stay visible

    WBI = 100 * (H * U * E) ** (1/3)

The geometric mean is deliberate: a community with good coverage is not a
warning blackspot however high its fire risk, so one strong component must not
compensate for another. If any component is zero, WBI is zero.

Inputs (all open government data, see README and report Appendix A):
    Bushfire_analysis/Community_Bushfire_Risk.csv              Bushfires NT, 765 communities
    connectivity-dashboard1/public/data/communities.geojson    BushTel community profiles (792)
    connectivity-dashboard1/public/data/coverage.geojson       predicted mobile coverage polygons
    Bushfire_analysis/data/towers_region.geojson               ACCC 2026 mobile tower sites (RFNSA IDs), NT region

Outputs:
    Bushfire_analysis/outputs/wbi_scores.csv                   one row per community, every component
    Bushfire_analysis/outputs/sensitivity.csv                  ranking stability under alternatives
    Bushfire_analysis/outputs/unmatched_bushtel.csv            risk communities with no BushTel match
    Bushfire_analysis/fig5_wbi_map.png ... fig8_fireplan_by_rating.png
    connectivity-dashboard1/public/data/wbi_communities.geojson   read by the dashboard

Run from anywhere:  python Bushfire_analysis/wbi_index.py
Requires:           pandas, numpy, matplotlib, shapely
"""

import json
import re
import warnings
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # render to file, no display needed
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from shapely import STRtree, points
from shapely.geometry import shape

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).resolve().parent
REPO = HERE.parent
DASH_DATA = REPO / "connectivity-dashboard1" / "public" / "data"
OUT = HERE / "outputs"
OUT.mkdir(exist_ok=True)

RISK_CSV = HERE / "Community_Bushfire_Risk.csv"
BUSHTEL_GEOJSON = DASH_DATA / "communities.geojson"
COVERAGE_GEOJSON = DASH_DATA / "coverage.geojson"
# Regional subset of the ACCC Mobile Infrastructure Report 2026 site register,
# kept with the analysis so results do not change when the dashboard's own
# (NT-only, reformatted) tower file is edited. Includes border towers in WA,
# SA and Qld, which can still serve NT communities.
TOWERS_GEOJSON = HERE / "data" / "towers_region.geojson"
BOUNDARY_GEOJSON = DASH_DATA / "nt_boundary.geojson"
DASHBOARD_OUT = DASH_DATA / "wbi_communities.geojson"

# ---------------------------------------------------------------------------
# Parameters. Every design choice lives here and is tested in the
# sensitivity analysis at the bottom of the script.
# ---------------------------------------------------------------------------
HAZARD_MAP = {"High": 1.0, "Moderate": 0.6, "Low": 0.3}

CARRIER_RADIUS_KM = 35     # a tower within this distance counts as a nearby carrier
DISTANCE_SCALE_KM = 50     # distance term reaches 1.0 (worst) at this distance
TOWER_OVERRIDE_KM = 5      # a registered tower this close counts as coverage even if the
                           # coverage polygon misses the community (the tower register is newer)
MAX_CARRIERS = 3           # Telstra, Optus, TPG

# The towers file lists one row per carrier per site. A MOCN site is a shared
# network carrying both Optus and TPG customers.
CARRIER_ALIASES = {
    "Telstra": {"Telstra"},
    "Optus": {"Optus"},
    "TPG": {"TPG"},
    "Optus-TPG MOCN": {"Optus", "TPG"},
}

# Towers outside the NT can still serve NT communities near the border,
# so keep a generous box rather than the NT boundary.
TOWER_BBOX = dict(lon_min=125.0, lon_max=142.0, lat_min=-30.0, lat_max=-8.0)

# Bands for presentation only; the ranking itself is continuous. Critical (60+)
# is roughly the top decile of scores.
BANDS = [(60, "Critical"), (50, "High"), (35, "Moderate"), (0, "Low")]
BAND_ORDER = ["Critical", "High", "Moderate", "Low"]

# Figure palette: one blue ramp, light to dark, for ordered categories.
BAND_COLOURS = {"Low": "#86b6ef", "Moderate": "#3987e5", "High": "#1c5cab", "Critical": "#0d366b"}
SINGLE = "#2a78d6"
INK, INK_2, GRID = "#0b0b0b", "#52514e", "#e4e3df"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def norm_name(s) -> str:
    """Lower-case, drop punctuation and extra spaces so names can be matched."""
    s = str(s or "").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance. Accepts numpy arrays and broadcasts."""
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(a))


def band_for(score: float) -> str:
    for cut, label in BANDS:
        if score >= cut:
            return label
    return "Low"


def style_axes(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(GRID)
    ax.tick_params(colors=INK_2, labelsize=9)
    ax.yaxis.label.set_color(INK_2)
    ax.xaxis.label.set_color(INK_2)


# ---------------------------------------------------------------------------
# 1. Load and join
# ---------------------------------------------------------------------------
def load_communities() -> pd.DataFrame:
    risk = pd.read_csv(RISK_CSV)
    risk.columns = risk.columns.str.strip()
    risk["COMMUNITY"] = risk["COMMUNITY"].str.strip()
    risk["RATING"] = risk["RATING"].str.strip()
    risk["key"] = risk["COMMUNITY"].map(norm_name)

    bushtel = pd.DataFrame(
        [f["properties"] for f in json.loads(BUSHTEL_GEOJSON.read_text(encoding="utf-8"))["features"]]
    )

    # Index BushTel by its main name and every alias.
    lookup = {}
    for idx, row in bushtel.iterrows():
        names = [row["community_name"]] + str(row.get("community_aliases") or "").split(",")
        for n in names:
            k = norm_name(n)
            if k and k not in lookup:
                lookup[k] = idx

    risk["bushtel_idx"] = risk["key"].map(lookup)
    risk["match_method"] = np.where(risk["bushtel_idx"].notna(), "name", None)

    # Fallback: nearest BushTel point within 2 km for names that did not match.
    unmatched = risk["bushtel_idx"].isna()
    if unmatched.any():
        d = haversine_km(
            risk.loc[unmatched, "LATITUDE"].values[:, None],
            risk.loc[unmatched, "LONGITUDE"].values[:, None],
            bushtel["latitude"].values[None, :],
            bushtel["longitude"].values[None, :],
        )
        nearest, nearest_km = d.argmin(axis=1), d.min(axis=1)
        close = nearest_km <= 2.0
        idx = risk.index[unmatched]
        risk.loc[idx[close], "bushtel_idx"] = nearest[close]
        risk.loc[idx[close], "match_method"] = "nearest_2km"

    keep = ["community_id", "bushtel_url", "community_aliases", "community_type", "main_language",
            "local_govt_council", "ward", "land_council", "electorate", "ntg_region", "population_count"]
    bt = bushtel[keep].add_prefix("bt_")
    df = risk.join(bt, on="bushtel_idx")
    df["match_method"] = df["match_method"].fillna("none")
    return df


def fill_population(df: pd.DataFrame) -> pd.DataFrame:
    """Risk dataset population first, then BushTel, then median of the same community type."""
    pop = df["POPULATION"].where(df["POPULATION"] > 0)
    source = pd.Series(np.where(pop.notna(), "risk_dataset", None), index=df.index)

    bt = df["bt_population_count"].where(df["bt_population_count"] > 0)
    use_bt = pop.isna() & bt.notna()
    pop[use_bt] = bt[use_bt]
    source[use_bt] = "bushtel"

    known = df.assign(p=pop).groupby("COMMTYPE")["p"]
    still = pop.isna()
    pop[still] = df.loc[still, "COMMTYPE"].map(known.median())
    source[still] = "imputed_type_median"

    df["population_used"] = pop.round().astype(int)
    df["population_source"] = source
    # Kept for the sensitivity analysis: what if the imputed values are low or high?
    df["pop_imputed_low"] = np.where(still, df["COMMTYPE"].map(known.quantile(0.25)), df["population_used"]).round()
    df["pop_imputed_high"] = np.where(still, df["COMMTYPE"].map(known.quantile(0.75)), df["population_used"]).round()
    return df


# ---------------------------------------------------------------------------
# 2. Connectivity
# ---------------------------------------------------------------------------
def load_tower_sites() -> pd.DataFrame:
    feats = json.loads(TOWERS_GEOJSON.read_text(encoding="utf-8"))["features"]
    rows = []
    for f in feats:
        lon, lat = f["geometry"]["coordinates"][:2]
        b = TOWER_BBOX
        if not (b["lon_min"] <= lon <= b["lon_max"] and b["lat_min"] <= lat <= b["lat_max"]):
            continue
        props = f["properties"]
        carrier = props.get("MNO/Optus-TPG MOCN") or props.get("carrier") or "Unknown"
        for c in CARRIER_ALIASES.get(carrier, {carrier}):
            rows.append({"lat": round(lat, 4), "lon": round(lon, 4), "carrier": c})
    t = pd.DataFrame(rows)
    return t.groupby(["lat", "lon"])["carrier"].apply(lambda s: sorted(set(s))).reset_index()


def add_connectivity(df: pd.DataFrame, sites: pd.DataFrame, radius_km: float, scale_km: float,
                     override_km: float = TOWER_OVERRIDE_KM) -> pd.DataFrame:
    """Coverage flag, nearest tower distance, carriers nearby, and the U component."""
    out = df.copy()

    d = haversine_km(out["LATITUDE"].values[:, None], out["LONGITUDE"].values[:, None],
                     sites["lat"].values[None, :], sites["lon"].values[None, :])
    out["nearest_tower_km"] = d.min(axis=1).round(1)

    carriers_nearby = []
    for row in d:
        near = sites.loc[row <= radius_km, "carrier"]
        carriers_nearby.append(sorted({c for lst in near for c in lst}))
    out["carriers_within_radius"] = [", ".join(c) if c else "None" for c in carriers_nearby]
    out["n_carriers"] = [len(c) for c in carriers_nearby]

    out["in_coverage"] = out["in_coverage_polygon"] | (out["nearest_tower_km"] <= override_km)
    outside = (~out["in_coverage"]).astype(float)
    dist_term = np.minimum(out["nearest_tower_km"] / scale_km, 1.0)
    carrier_term = 1 - np.minimum(out["n_carriers"], MAX_CARRIERS) / MAX_CARRIERS
    out["U"] = ((outside + dist_term + carrier_term) / 3).round(4)
    return out


def coverage_flags(df: pd.DataFrame) -> np.ndarray:
    polys = [shape(f["geometry"]) for f in json.loads(COVERAGE_GEOJSON.read_text(encoding="utf-8"))["features"]]
    tree = STRtree(polys)
    pts = points(df["LONGITUDE"].values, df["LATITUDE"].values)
    hit_pts, _ = tree.query(pts, predicate="intersects")
    flags = np.zeros(len(df), dtype=bool)
    flags[np.unique(hit_pts)] = True
    return flags


# ---------------------------------------------------------------------------
# 3. Index
# ---------------------------------------------------------------------------
def compute_wbi(df: pd.DataFrame, hazard_map=HAZARD_MAP, log_pop=True, aggregate="geometric") -> pd.Series:
    H = df["RATING"].map(hazard_map)
    pop = df["population_used"].astype(float)
    E = np.log1p(pop) / np.log1p(pop.max()) if log_pop else pop / pop.max()
    U = df["U"]
    if aggregate == "geometric":
        return 100 * (H * U * E) ** (1 / 3)
    return 100 * (H + U + E) / 3


def score(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["H"] = out["RATING"].map(HAZARD_MAP)
    out["E"] = (np.log1p(out["population_used"]) / np.log1p(out["population_used"].max())).round(4)
    out["WBI"] = compute_wbi(out).round(1)
    out["band"] = out["WBI"].map(band_for)
    out["rank"] = out["WBI"].rank(ascending=False, method="min").astype(int)
    # Plain-language definition used in the pitch: high fire risk, no predicted
    # coverage, and no tower from any carrier within the radius.
    out["strict_blackspot"] = (out["RATING"] == "High") & (~out["in_coverage"]) & (out["n_carriers"] == 0)
    return out


# ---------------------------------------------------------------------------
# 4. Sensitivity analysis
# ---------------------------------------------------------------------------
def sensitivity(base: pd.DataFrame, sites: pd.DataFrame) -> pd.DataFrame:
    """Re-score under alternative design choices and compare against the baseline ranking.

    Stability is measured on the full ranking (Spearman) and on the Critical band.
    A fixed top 20 is not used because many remote outstations tie on score.
    """
    n_crit = int((base["band"] == "Critical").sum())
    base_crit = set(base.nlargest(n_crit, "WBI")["COMMUNITY"])
    variants = {
        "Arithmetic mean instead of geometric": dict(aggregate="arithmetic"),
        "Hazard mapping 1.0 / 0.5 / 0.2": dict(hazard_map={"High": 1.0, "Moderate": 0.5, "Low": 0.2}),
        "Hazard mapping 1.0 / 0.7 / 0.4": dict(hazard_map={"High": 1.0, "Moderate": 0.7, "Low": 0.4}),
        "Linear population": dict(log_pop=False),
        "Imputed population at type 25th percentile": dict(pop_col="pop_imputed_low"),
        "Imputed population at type 75th percentile": dict(pop_col="pop_imputed_high"),
        "Carrier radius 25 km": dict(radius=25),
        "Carrier radius 50 km": dict(radius=50),
        "Distance scale 30 km": dict(scale=30),
        "Distance scale 80 km": dict(scale=80),
        "Coverage polygon only (no tower override)": dict(override=0),
    }
    rows = []
    for name, v in variants.items():
        df = base.copy()
        if "radius" in v or "scale" in v or "override" in v:
            df = add_connectivity(base, sites, v.get("radius", CARRIER_RADIUS_KM), v.get("scale", DISTANCE_SCALE_KM),
                                  v.get("override", TOWER_OVERRIDE_KM))
        if "pop_col" in v:
            df["population_used"] = df[v["pop_col"]]
        s = compute_wbi(df, hazard_map=v.get("hazard_map", HAZARD_MAP), log_pop=v.get("log_pop", True),
                        aggregate=v.get("aggregate", "geometric"))
        df = df.assign(s=s.values)
        rho = df["s"].rank().corr(base["WBI"].rank())
        rows.append({
            "variant": name,
            "spearman_rho": round(rho, 3),
            "critical_band_retained_pct": round(100 * len(base_crit & set(df.nlargest(n_crit, "s")["COMMUNITY"])) / n_crit),
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# 5. Figures
# ---------------------------------------------------------------------------
def fig_map(df: pd.DataFrame, sites: pd.DataFrame, path: Path):
    fig, ax = plt.subplots(figsize=(8.5, 9))
    boundary = json.loads(BOUNDARY_GEOJSON.read_text(encoding="utf-8"))["features"]
    for f in boundary:
        geom = shape(f["geometry"])
        for poly in getattr(geom, "geoms", [geom]):
            x, y = poly.exterior.xy
            ax.fill(x, y, color="#f0efec", zorder=0)
            ax.plot(x, y, color="#c3c2b7", linewidth=0.6, zorder=1)
    ax.scatter(sites["lon"], sites["lat"], marker="^", s=10, color="#9a9994", linewidths=0,
               label="Mobile tower site", zorder=2)
    sizes = {"Low": 12, "Moderate": 16, "High": 24, "Critical": 46}
    for z, band in enumerate(["Low", "Moderate", "High", "Critical"]):
        sub = df[df["band"] == band]
        ax.scatter(sub["LONGITUDE"], sub["LATITUDE"], s=sizes[band], color=BAND_COLOURS[band],
                   edgecolors="white", linewidths=0.8 if band == "Critical" else 0.4,
                   label=f"{band} ({len(sub)})", zorder=3 + z)
    ax.set_xlim(128.8, 138.2)
    ax.set_ylim(-26.2, -10.8)
    ax.set_aspect("equal")
    ax.axis("off")
    handles, labels = ax.get_legend_handles_labels()
    order = [labels.index(l) for l in labels if not l.startswith("Mobile")][::-1] + [labels.index("Mobile tower site")]
    ax.legend([handles[i] for i in order], [labels[i] for i in order], loc="upper left",
              bbox_to_anchor=(1.0, 0.98), frameon=False, fontsize=9, title="WBI band", title_fontsize=9,
              alignment="left")
    ax.set_title("Warning Blackspot Index by community", loc="left", fontsize=13, color=INK, fontweight="bold")
    ax.text(0, -0.02, "Sources: Bushfires NT community risk (2020), BushTel, mobile coverage and tower site data.",
            transform=ax.transAxes, fontsize=7.5, color=INK_2, va="top")
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def fig_top20(df: pd.DataFrame, path: Path):
    """Top 20 among communities with a recorded population.

    Communities with no recorded population share one imputed value, so many tie
    on score. They are counted in a note rather than ranked against each other.
    """
    recorded = df[df["population_source"] != "imputed_type_median"]
    top = recorded.nsmallest(20, "rank").iloc[::-1]
    cutoff = top["WBI"].min()
    hidden = df[(df["population_source"] == "imputed_type_median") & (df["WBI"] >= cutoff)]

    fig, ax = plt.subplots(figsize=(9, 7))
    ax.barh(top["COMMUNITY"], top["WBI"], color=[BAND_COLOURS[b] for b in top["band"]], height=0.72)
    for y, (w, r, pop, km) in enumerate(zip(top["WBI"], top["RATING"], top["population_used"],
                                            top["nearest_tower_km"])):
        ax.text(w + 0.8, y, f"{w:.0f}   {r} risk, pop {pop}, {km:.0f} km to tower", va="center",
                fontsize=8, color=INK_2)
    ax.set_xlim(0, 115)
    ax.set_xticks(range(0, 101, 20))
    ax.set_xlabel("WBI (0 to 100)")
    ax.grid(axis="x", color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    style_axes(ax)
    ax.tick_params(axis="y", labelsize=8.5, colors=INK)
    present = [b for b in BAND_ORDER if b in set(top["band"])]
    if len(present) > 1:
        ax.legend(handles=[plt.Rectangle((0, 0), 1, 1, color=BAND_COLOURS[b]) for b in present], labels=present,
                  loc="lower right", frameon=False, fontsize=9, title="Band", title_fontsize=9)
    fig.suptitle("Highest-scoring communities with a recorded population", x=0.02, ha="left", fontsize=13,
                 color=INK, fontweight="bold")
    fig.text(0.02, 0.925, f"A further {len(hidden)} communities score {cutoff:.0f} or more but have no recorded "
             f"population in either source.", fontsize=9, color=INK_2)
    fig.subplots_adjust(top=0.9)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def fig_hazard_vs_reach(df: pd.DataFrame, rho: float, path: Path):
    """Replaces the illustrative scatter: real U by risk rating, one dot per community."""
    order = ["Low", "Moderate", "High"]
    rng = np.random.default_rng(7)
    fig, ax = plt.subplots(figsize=(8, 5.2))
    for i, r in enumerate(order):
        sub = df[df["RATING"] == r]
        x = i + rng.uniform(-0.28, 0.28, len(sub))
        ax.scatter(x, sub["U"], s=12, color=SINGLE, alpha=0.45, linewidths=0)
        med = sub["U"].median()
        ax.plot([i - 0.34, i + 0.34], [med, med], color=INK, linewidth=2)
        ax.text(i + 0.37, med, f"median {med:.2f}", va="center", fontsize=8.5, color=INK)
    ax.set_xticks(range(3))
    ax.set_xticklabels([f"{r}\n(n = {(df['RATING'] == r).sum()})" for r in order])
    ax.set_ylim(-0.03, 1.05)
    ax.set_ylabel("Unreachability U (0 = well connected, 1 = no signal)")
    ax.set_xlabel("Published bushfire risk rating")
    ax.grid(axis="y", color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    style_axes(ax)
    fig.suptitle("Higher-risk communities tend to be harder to reach", x=0.02, ha="left", fontsize=13,
                 color=INK, fontweight="bold")
    fig.text(0.02, 0.905, f"One dot per community. Spearman rank correlation between rating and U: {rho:.2f} "
             "(weak, positive).", fontsize=9, color=INK_2)
    fig.subplots_adjust(top=0.86)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def fig_fireplan(df: pd.DataFrame, path: Path):
    order = ["Low", "Moderate", "High"]
    pct = [(df.loc[df["RATING"] == r, "FIREPLAN"].str.strip() == "Yes").mean() * 100 for r in order]
    n_yes = [(df.loc[df["RATING"] == r, "FIREPLAN"].str.strip() == "Yes").sum() for r in order]
    n_all = [(df["RATING"] == r).sum() for r in order]
    fig, ax = plt.subplots(figsize=(7, 4.6))
    ax.bar(order, pct, color=SINGLE, width=0.55)
    for i, (p, y, n) in enumerate(zip(pct, n_yes, n_all)):
        ax.text(i, p + 0.8, f"{p:.0f}%  ({y} of {n})", ha="center", fontsize=9, color=INK)
    ax.set_ylim(0, max(pct) * 1.3 + 2)
    ax.set_ylabel("Communities with an approved fire plan (%)")
    ax.set_xlabel("Published bushfire risk rating")
    ax.grid(axis="y", color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    style_axes(ax)
    ax.set_title("Approved fire plans by risk rating", loc="left", fontsize=13, color=INK, fontweight="bold")
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 6. Dashboard export
# ---------------------------------------------------------------------------
def export_geojson(df: pd.DataFrame, path: Path):
    def clean(v):
        if isinstance(v, (np.integer,)):
            return int(v)
        if isinstance(v, (np.floating,)):
            return None if np.isnan(v) else float(v)
        if isinstance(v, (np.bool_,)):
            return bool(v)
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return None
        return v

    features = []
    for _, r in df.sort_values("rank").iterrows():
        props = {
            # names the dashboard already uses
            "objectid": int(r["COMMID"]),
            "community_id": int(r["bt_community_id"]) if pd.notna(r["bt_community_id"]) else int(r["COMMID"]),
            "community_name": r["COMMUNITY"],
            "community_aliases": clean(r["bt_community_aliases"]) or "",
            "community_type": r["COMMTYPE"],
            "main_language": clean(r["bt_main_language"]) or "Not recorded",
            "local_govt_council": clean(r["bt_local_govt_council"]) or clean(r["LGA"]) or "",
            "land_council": clean(r["bt_land_council"]) or clean(r["ALCOUNCIL"]) or "",
            "ntg_region": clean(r["bt_ntg_region"]) or "Not recorded",
            "bushtel_url": clean(r["bt_bushtel_url"]) or "",
            # recorded population only; null when neither source records one
            "population_count": None if r["population_source"] == "imputed_type_median" else int(r["population_used"]),
            "population_used_in_index": int(r["population_used"]),
            "population_basis": r["population_source"],   # where the index population came from
            "longitude": float(r["LONGITUDE"]),
            "latitude": float(r["LATITUDE"]),
            # risk dataset fields
            "risk_rating": r["RATING"],
            "fire_plan": str(r["FIREPLAN"]).strip(),
            "firebreak": str(r["FIREBREAK"]).strip(),
            "fuel_reduction": str(r["FUELREDUC"]).strip(),
            # connectivity
            "has_coverage": bool(r["in_coverage"]),
            "coverage_status": "Inside predicted coverage" if r["in_coverage"] else "Outside predicted coverage",
            "nearest_tower_km": float(r["nearest_tower_km"]),
            "nearby_carriers": int(r["n_carriers"]),
            "carrier_names": r["carriers_within_radius"],
            # index
            "hazard_H": float(r["H"]),
            "unreachability_U": float(r["U"]),
            "exposure_E": float(r["E"]),
            "wbi_score": float(r["WBI"]),
            "wbi_tier": r["band"],
            "wbi_rank": int(r["rank"]),
            "strict_blackspot": bool(r["strict_blackspot"]),
        }
        features.append({"type": "Feature", "properties": props,
                         "geometry": {"type": "Point", "coordinates": [float(r["LONGITUDE"]), float(r["LATITUDE"])]}})
    path.write_text(json.dumps({"type": "FeatureCollection", "features": features}), encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Loading and joining datasets...")
    df = load_communities()
    df = fill_population(df)
    df["in_coverage_polygon"] = coverage_flags(df)
    sites = load_tower_sites()
    df = add_connectivity(df, sites, CARRIER_RADIUS_KM, DISTANCE_SCALE_KM)
    df = score(df)

    print(f"  Communities scored:          {len(df)}")
    print(f"  Matched to BushTel:          {(df['match_method'] != 'none').sum()} "
          f"(name {(df['match_method'] == 'name').sum()}, nearest point {(df['match_method'] == 'nearest_2km').sum()})")
    print(f"  Tower sites used:            {len(sites)}")
    print("  Population source:           " + ", ".join(f"{k} {v}" for k, v in df["population_source"].value_counts().items()))

    print("\nConnectivity")
    print(f"  Outside coverage polygon:    {(~df['in_coverage_polygon']).sum()} of {len(df)}")
    print(f"  Outside coverage (final):    {(~df['in_coverage']).sum()} of {len(df)}")
    print(f"  No carrier within {CARRIER_RADIUS_KM} km:     {(df['n_carriers'] == 0).sum()}")
    print(f"  Median distance to a tower:  {df['nearest_tower_km'].median():.1f} km")

    print("\nWBI bands")
    for b in BAND_ORDER:
        sub = df[df["band"] == b]
        print(f"  {b:9s} {len(sub):4d}   ratings: {sub['RATING'].value_counts().to_dict()}")
    print(f"\nStrict blackspots (High risk, outside coverage, no carrier within {CARRIER_RADIUS_KM} km): "
          f"{df['strict_blackspot'].sum()}  population {df.loc[df['strict_blackspot'], 'population_used'].sum()}")

    s_bs = df[df["strict_blackspot"]]
    print(f"  of which population not recorded in either source: {(s_bs['population_source'] == 'imputed_type_median').sum()}")
    crit = df[df["band"] == "Critical"]
    print(f"Critical band with population not recorded: {(crit['population_source'] == 'imputed_type_median').sum()} of {len(crit)}")
    print(f"Outside the coverage polygon but a tower within {TOWER_OVERRIDE_KM} km (treated as covered): "
          f"{((~df['in_coverage_polygon']) & (df['nearest_tower_km'] <= TOWER_OVERRIDE_KM)).sum()}")
    print("Median U by rating: " + ", ".join(f"{r} {df.loc[df['RATING'] == r, 'U'].median():.2f}" for r in ["Low", "Moderate", "High"]))

    rho = df["H"].rank().corr(df["U"].rank())
    print(f"Spearman correlation, risk rating vs unreachability: {rho:.3f}")

    print("\nTop 20 (all communities, ties broken arbitrarily)")
    cols = ["rank", "COMMUNITY", "RATING", "population_used", "in_coverage", "nearest_tower_km", "n_carriers", "WBI", "band"]
    print(df.nsmallest(20, "rank")[cols].to_string(index=False))

    print("\nSensitivity analysis")
    sens = sensitivity(df, sites)
    print(sens.to_string(index=False))

    # Save outputs
    out_cols = ["rank", "COMMUNITY", "COMMID", "COMMTYPE", "RATING", "FIREPLAN", "FIREBREAK", "FUELREDUC",
                "LATITUDE", "LONGITUDE", "population_used", "population_source", "in_coverage_polygon", "in_coverage",
                "nearest_tower_km", "n_carriers", "carriers_within_radius", "H", "U", "E", "WBI", "band",
                "strict_blackspot", "match_method", "bt_ntg_region", "bt_main_language", "bt_land_council"]
    df.sort_values("rank")[out_cols].to_csv(OUT / "wbi_scores.csv", index=False)
    sens.to_csv(OUT / "sensitivity.csv", index=False)
    df.loc[df["match_method"] == "none", ["COMMUNITY", "COMMTYPE", "LATITUDE", "LONGITUDE"]].to_csv(
        OUT / "unmatched_bushtel.csv", index=False)

    fig_map(df, sites, HERE / "fig5_wbi_map.png")
    fig_top20(df, HERE / "fig6_wbi_top20.png")
    fig_hazard_vs_reach(df, rho, HERE / "fig7_hazard_vs_reachability.png")
    fig_fireplan(df, HERE / "fig8_fireplan_by_rating.png")
    export_geojson(df, DASHBOARD_OUT)
    print(f"\nSaved outputs/ CSVs, fig5 to fig8, and {DASHBOARD_OUT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
