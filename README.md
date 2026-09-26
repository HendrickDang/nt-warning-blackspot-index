# NT Warning Blackspot Index

This repository contains several related Northern Territory prototypes and
supporting research. Each application has its own dependencies and commands;
run them from that project's directory.

## Projects

| Directory | Purpose | Start / verify |
| --- | --- | --- |
| `Warning_Blackspot_App_Source_Code/` | Warning blackspot web application (Vite/Vinext) | `npm run dev`; `npm test` |
| `nt-housing-triage/` | Housing maintenance triage dashboard (Next.js) | `npm run dev`; `npm test` |
| `connectivity-dashboard1/` | Connectivity and community mapping dashboard (Vite) | `npm run dev`; `npm run build` |
| `Bushfire_analysis/` | Bushfire analysis script, source data, and figures | Python with `pandas` and `matplotlib` |
| `Documents/` | Supporting report | — |

For a web app, change into its directory, install its dependencies, then run a
script listed in that directory's `package.json`:

```sh
cd nt-housing-triage
npm install
npm run dev
```

Application datasets and checked-in reports are intentional project assets.
Generated dependency folders, build output, local databases, Python caches, and
training artifacts are excluded by the root `.gitignore`.
