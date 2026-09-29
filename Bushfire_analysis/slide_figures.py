"""
Dark-background figures for the pitch deck (slide 10).

Reads the index results written by wbi_index.py, so run that first:
    python Bushfire_analysis/wbi_index.py
    python Bushfire_analysis/slide_figures.py

Writes:
    Bushfire_analysis/fig9_slide_blackspot_map.png     NT map, 53 High-risk communities with no network highlighted
    Bushfire_analysis/fig10_slide_reachability.png     unreachability by risk rating, one dot per community
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from shapely.geometry import shape

HERE = Path(__file__).resolve().parent
DASH_DATA = HERE.parent / "connectivity-dashboard1" / "public" / "data"

BG = "#111418"        # matches the deck's dark panels
LAND = "#1d232b"
EDGE = "#4b5563"
MUTED = "#6b7280"
INK = "#f4f4f5"
INK_2 = "#a1a1aa"
ACCENT = "#f97316"    # deck orange

scores = pd.read_csv(HERE / "outputs" / "wbi_scores.csv")


def dark_axes(ax):
    ax.set_facecolor(BG)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color("#3f3f46")
    ax.tick_params(colors=INK_2, labelsize=11)


def blackspot_map(path: Path):
    blackspots = scores[scores["strict_blackspot"]]
    others = scores[~scores["strict_blackspot"]]
    towers = json.loads((DASH_DATA / "towers.geojson").read_text(encoding="utf-8"))["features"]
    tx = [f["geometry"]["coordinates"][0] for f in towers]
    ty = [f["geometry"]["coordinates"][1] for f in towers]

    fig, ax = plt.subplots(figsize=(4.4, 5.6), facecolor=BG)
    ax.set_facecolor(BG)
    boundary = json.loads((DASH_DATA / "nt_boundary.geojson").read_text(encoding="utf-8"))["features"]
    for f in boundary:
        geom = shape(f["geometry"])
        for poly in getattr(geom, "geoms", [geom]):
            x, y = poly.exterior.xy
            ax.fill(x, y, color=LAND, zorder=0)
            ax.plot(x, y, color=EDGE, linewidth=0.5, zorder=1)
    ax.scatter(tx, ty, marker="^", s=9, color="#9ca3af", alpha=0.55, linewidths=0, zorder=2,
               label="Mobile tower site")
    ax.scatter(others["LONGITUDE"], others["LATITUDE"], s=7, color=MUTED, linewidths=0, zorder=3,
               label="Other communities")
    ax.scatter(blackspots["LONGITUDE"], blackspots["LATITUDE"], s=46, color=ACCENT, edgecolors=BG,
               linewidths=0.8, zorder=4, label=f"High risk, no network ({len(blackspots)})")
    ax.set_xlim(128.8, 138.2)
    ax.set_ylim(-26.2, -10.8)
    ax.set_aspect("equal")
    ax.axis("off")
    handles, labels = ax.get_legend_handles_labels()
    order = [2, 1, 0]  # blackspots first
    ax.legend([handles[i] for i in order], [labels[i] for i in order], loc="upper left",
              bbox_to_anchor=(0.0, -0.01), frameon=False, fontsize=9, labelcolor=INK,
              handletextpad=0.4, borderaxespad=0)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor=BG, pad_inches=0.08)
    plt.close(fig)


def reachability(path: Path):
    order = ["Low", "Moderate", "High"]
    rng = np.random.default_rng(7)
    rho = scores["H"].rank().corr(scores["U"].rank())
    fig, ax = plt.subplots(figsize=(8.9, 5.4), facecolor=BG)
    dark_axes(ax)
    for i, r in enumerate(order):
        sub = scores[scores["RATING"] == r]
        ax.scatter(i + rng.uniform(-0.28, 0.28, len(sub)), sub["U"], s=14, color=ACCENT, alpha=0.5, linewidths=0)
        med = sub["U"].median()
        ax.plot([i - 0.34, i + 0.34], [med, med], color=INK, linewidth=2.5)
        ax.text(i + 0.37, med, f"median {med:.2f}", va="center", fontsize=11, color=INK)
    ax.set_xticks(range(3))
    ax.set_xticklabels([f"{r} risk\n(n = {(scores['RATING'] == r).sum()})" for r in order], color=INK_2)
    ax.set_xlim(-0.5, 2.85)
    ax.set_ylim(-0.03, 1.05)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0])
    ax.set_ylabel("Unreachability U  (0 = well connected, 1 = no signal)", color=INK_2, fontsize=11)
    ax.grid(axis="y", color="#27272a", linewidth=0.8)
    ax.set_axisbelow(True)
    ax.set_title(f"One dot per community.  Spearman correlation {rho:.2f} (weak, positive)",
                 loc="left", fontsize=11, color=INK_2, pad=10)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor=BG, pad_inches=0.15)
    plt.close(fig)


if __name__ == "__main__":
    blackspot_map(HERE / "fig9_slide_blackspot_map.png")
    reachability(HERE / "fig10_slide_reachability.png")
    print("Saved fig9_slide_blackspot_map.png and fig10_slide_reachability.png")
