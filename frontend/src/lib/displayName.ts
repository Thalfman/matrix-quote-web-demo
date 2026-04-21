const KEY = "matrix.displayName";

export function getDisplayName(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setDisplayName(name: string): void {
  try {
    localStorage.setItem(KEY, name.trim());
  } catch {
    /* ignore */
  }
}

export function ensureDisplayName(): string {
  let name = getDisplayName();
  if (!name) {
    name = (prompt("Your name (used to attribute saved quotes):") ?? "").trim();
    if (name) setDisplayName(name);
  }
  return name || "Unknown";
}
