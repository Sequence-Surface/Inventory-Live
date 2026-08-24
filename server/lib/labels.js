// Stable reference label sets shared by the view builder and the (legacy) seed.
// Order matters — products store INDEXES into these arrays.
export const STATUS_CODES = ['Adequate', 'Critical', 'Dead Stock', 'Healthy', 'Inactive', 'Low Stock', 'Overstocked'];
export const MOVER_CODES = ['Active', 'No Stock', 'Non-Moving (12m+)', 'Slow (6-12m)', 'Sluggish (3-6m)'];
export const PRIORITY_CODES = ['D - Liquidate', 'D - Reduce', 'OK', 'P1 - URGENT', 'P2 - High', 'P3 - Medium'];
export const ABC_CODES = ['A', 'B', 'C'];
export const VARIANTS = ['Standard', 'Glossy', 'Matte', 'Textured', 'Premium', 'Eco'];

export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'yyyy-mm' format guard used by history merging.
export const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// "2026-07" → 24 month labels ("Aug-24" … "Jul-26") ending at that month.
// (Port of build24Window from the client dashboard.)
export function build24Window(endYm) {
  const [y, m] = String(endYm).split('-').map((n) => parseInt(n, 10));
  const labels = [];
  for (let i = 23; i >= 0; i--) {
    let mm = m - i, yy = y;
    while (mm <= 0) { mm += 12; yy -= 1; }
    labels.push(`${MONTH_ABBR[mm - 1]}-${String(yy).slice(-2)}`);
  }
  return labels;
}

// window labels → { 'yyyy-mm': slotIndex }
export function windowIndexMap(labels) {
  const map = {};
  labels.forEach((lbl, i) => {
    const [mon, yy] = lbl.split('-');
    const mm = MONTH_ABBR.indexOf(mon) + 1;
    if (mm > 0) map[`20${yy}-${String(mm).padStart(2, '0')}`] = i;
  });
  return map;
}

// Current calendar month as 'yyyy-mm' (UTC) — window fallback when no history exists.
export function currentYm() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Normalize a parent code to the merge identity key.
export function codeKeyOf(code) {
  return String(code == null ? '' : code).toUpperCase().trim();
}

// Parse a launch/creation date string to a UTC Date. ISO ('2026-05-13') is checked
// FIRST with an anchored pattern, then day-first 'dd-mm-yyyy' / 'dd/mm/yy' — this
// fixes the old client bug where an unanchored day-first regex read '2026-05-13'
// as year 2013. Returns null when unparseable.
export function parseFlexibleDate(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (m) {
    let yy = m[3];
    if (yy.length === 2) yy = '20' + yy;
    const d = new Date(Date.UTC(+yy, +m[2] - 1, +m[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
