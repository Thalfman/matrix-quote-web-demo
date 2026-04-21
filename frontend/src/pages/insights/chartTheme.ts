export const CHART_COLORS = {
  ink:     "#0D1B2A",
  ink2:    "#1E2B3A",
  amber:   "#F2B61F",
  teal:    "#1F8FA6",
  tealDark:"#177082",
  success: "#2F8F6F",
  danger:  "#B5412B",
  line:    "#E5E1D8",
  line2:   "#D8D3C6",
  muted:   "#5A6573",
  muted2:  "#8A94A1",
  paper:   "#F6F4EF",
};

export const AXIS_TICK = {
  fontSize: 11,
  fill: CHART_COLORS.muted,
  fontFamily: "JetBrains Mono",
};

export const AXIS_LINE = {
  stroke: CHART_COLORS.line,
};

export const GRID_STYLE = {
  stroke: CHART_COLORS.line,
  strokeDasharray: "2 2",
};

export const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: `1px solid ${CHART_COLORS.line}`,
  borderRadius: 2,
  fontSize: 12,
  fontFamily: "Inter",
  color: CHART_COLORS.ink,
  padding: "8px 10px",
};

export const TOOLTIP_CURSOR = {
  fill: "rgba(31, 143, 166, 0.06)",
  stroke: CHART_COLORS.line,
};
