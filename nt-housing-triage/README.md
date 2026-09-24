# NT Housing Maintenance Triage

GovHack NT 2026 — a working web app that helps a housing maintenance coordinator
prioritise urgent repairs across remote Northern Territory communities **without
"efficiency" quietly pushing remote tenants to the back of the queue**.

> **How might we** help a coordinator prioritise urgent repairs across remote NT
> communities without efficiency quietly pushing remote tenants to the back of the queue?

## The idea

Two independent ranks, and the tension between them made visible:

- **Need rank** — location-blind, human-centric: `safety × occupant vulnerability`.
- **Efficiency rank** — logistics: travel distance + job duration − batching bonus.
- **Equity gap** = `efficiency rank − need rank`. Remote jobs get a big positive gap.

The dashboard shows the gap and its driver, e.g. *"Wadeye roof leak is #2 on need,
#9 after logistics — 1,140 km round trip. Batch with the 2 other West Daly jobs →
recovers places at ~zero extra cost."*

Reconciliation is **batching**, not sacrifice. Where equity and efficiency genuinely
conflict, an **equity dial** (`λ = 0` pure fair → `1` pure efficient) re-ranks live
and reports the human cost: *"saves $X travel, adds +N median days for remote
households."* The human commits, and the decision is **audited**.

A tenant can ask *why* their repair was deprioritised and get a real answer built
from the same scores the coordinator sees.

## Stack

- **Next.js (App Router) + Tailwind CSS** — single `npm run dev`, minimal deps.
- **Deterministic engine** in TypeScript — never a black box.
- **Fine-tuned parser** — Qwen2.5-3B-Instruct via local **Ollama**, with a
  deterministic keyword fallback so the app works fully offline with no model.
- **Grounded explainer** — every sentence is built from numbers already in the
  engine, so a fairness explanation can never hallucinate a figure.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

The app runs with **zero setup**: the seeded demo queue and the deterministic
parser work offline. To use the fine-tuned model, see `training/README.md` and
copy `.env.example` to `.env`.

Other commands:

```bash
npm test                 # engine, parser (golden set) and generator tests
npm run build            # production build
npm run data:generate    # regenerate data/distance-matrix.json
npm run training:generate -- 3000   # build the fine-tune dataset
```

## Layout

```
nt-housing-triage/
├── app/                     # Next.js App Router
│   ├── page.tsx             # coordinator dashboard
│   ├── tenant/page.tsx      # tenant answer view
│   ├── components/          # dashboard, queue, map, equity dial, audit
│   └── api/parse/route.ts   # model-first parse endpoint (Ollama + fallback)
├── lib/
│   ├── taxonomy.ts          # enums, trigger phrases, weights (shared contract)
│   ├── engine/              # need score, batching, efficiency, equity ranking
│   ├── parser/              # LLM-first parser + deterministic fallback
│   ├── explainer/           # deterministic, grounded explanations
│   ├── data/                # communities, distances, generator, seed
│   └── ui/                  # shared UI colour tokens
├── data/                    # communities.json, trade-bases.json, distance matrix
├── scripts/                 # data artifact generation
├── training/                # dataset generation + fine-tune recipe
└── tests/                   # engine, parser golden set, generator
```

## Data & methodology

- **Communities**: real NT community locations with ARIA+ remoteness classes and
  curated remoteness tiers (T0 urban base → T3 very remote / island).
- **Distances**: derived from real coordinates with a documented detour factor per
  access mode (road/barge/air). Illustrative, not a routed road network — see
  `lib/data/distances.ts`. Swap in a real routing matrix without touching the engine.
- **Reports**: synthetic, generated from the shared taxonomy so the demo scenario
  stages reproducibly. The same generator produces the fine-tune dataset.

## Demo scenario

1. Darwin tap leak and an Alice Springs aircon fault sort to the top on efficiency.
2. A **Wadeye roof caving over a bedroom with young children** is critical on need
   but drops far down the efficiency-only sort.
3. Turn on batching → Wadeye groups with the two other West Daly jobs and recovers
   places at almost no extra travel cost.
4. Read the tenant's answer aloud — it is honest about the trade-off.
