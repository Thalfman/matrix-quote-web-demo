# Drop CSVs here

Place `projects_real.csv` in this folder before the Vercel build runs. The file
is consumed by `scripts/build_demo_static.py` and powers the **Comparison Quote
Tool** on the demo site.

## Required columns

See the top of `scripts/build_demo_static.py` and `core/config.py` for the full
schema. The short version:

- `project_id`, `project_name`, `year`
- 6 categoricals: `industry_segment`, `system_category`, `automation_level`,
  `plc_family`, `hmi_family`, `vision_type`
- 33 numerics from `QUOTE_NUM_FEATURES`
- 12 actual-hours targets (`me10_actual_hours`, `me15_actual_hours`, …,
  `pm200_actual_hours`) — required so the Comparison tool can display real
  historical hours.

Row count: ~20–30.
