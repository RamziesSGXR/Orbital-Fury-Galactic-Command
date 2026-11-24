// Ship names, callsigns and the helpers for the lines Vanguards and Infantry call out. All text here is the game's own.
// Ship names and callsigns are never translated.

// Fire-Support Ship names. The fleet is its own brand, and it names its ships the way a network names its shows.
const SHIP_NAMES = ['Prime Time', 'Breaking News', 'Front Page', 'Top Story', 'Late Edition', 'Special Report', 'Season Finale', 'Opening Night',
  'Final Cut', 'Standing Ovation', 'Crowd Pleaser', 'Sweeps Week', 'Good Publicity', 'Press Release', 'No Comment', 'Off The Record',
  'Target Audience', 'Viewer Discretion', 'Word From Our Sponsors', 'Slow News Day', 'Exclusive Footage', 'Headline Act', 'Encore', 'Live At Five'];
export function shipNames(rng, n = 4) {
  const out = [], used = new Set();
  while (out.length < n) {
    const name = `FS ${SHIP_NAMES[rng.int(SHIP_NAMES.length)]}`;
    if (used.has(name)) continue;
    used.add(name); out.push(name);
  }
  return out;
}

export const LETTERS = ['A', 'B', 'C', 'D'];
export const TEAM_COLOR = ['#ffcc33', '#4de3ff', '#ff7ad9', '#a6ff4d'];

const SURNAMES = ['HOLLIS', 'KESSLER', 'MARLOWE', 'OKAFOR', 'BRANDT', 'VASQUEZ', 'TANAKA', 'LINDQVIST', 'REYES', 'DURAN', 'IBARRA', 'NOVAK',
  'WHITAKER', 'CASTELLAN', 'PETROV', 'ADEYEMI', 'MOREAU', 'SATO', 'QUINN', 'BARLOW', 'FONTAINE', 'KOWALSKI', 'ABARA', 'THORNE', 'DELACROIX',
  'MBEKI', 'HARGROVE', 'ESPOSITO', 'NAKAMURA', 'OYELARAN', 'BRIGHTWELL', 'VOSS', 'CALLAHAN', 'ROSALES', 'IVANOV', 'PEMBERTON'];
export const surname = (rng) => SURNAMES[rng.int(SURNAMES.length)];
export function infantryName(rng, role) {
  const rank = role === 'leader' ? 'SGT' : role === 'spec' ? 'SPC' : role === 'medic' ? 'DOC' : rng.next() < 0.25 ? 'CPL' : 'PVT';     // (0.26) by role
  return `${rank} ${surname(rng)}`;
}

// The mottos and the lines Vanguards and Infantry call out live in the language tables (motto.vg, motto.infantry, vg.<kind>, infantry.<kind>).

// Short, readable name for a call-in call in a bark.
export const pickLine = (rng, list) => list[rng.int(list.length)];
export const fill = (s, n) => s.replace('{n}', n);
