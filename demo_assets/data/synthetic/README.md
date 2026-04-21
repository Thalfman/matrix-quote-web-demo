# Drop CSVs here

Place `projects_synthetic.csv` in this folder before the Vercel build runs.
The file is consumed by `scripts/build_demo_static.py` and powers the
**Machine Learning Quote Tool** (synthetic pool for dropdown options and
neighbor lookups).

## Required columns

Same schema as `demo_assets/data/real/` — see that folder's README. Target
`*_actual_hours` columns are optional here (not required for the ML tool),
but the 6 categoricals and 33 numerics are.

Row count: hundreds to a few thousand. The build caps the shipped pool at
500 rows to keep the JSON payload reasonable.
