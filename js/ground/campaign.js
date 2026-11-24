// (0.27) The command radio's log, and the after action reports.
//
// RadioLog: what was said on the radio in the tutorial (and a phone's feed), to read again.
// aarMission / aarSession / aarStand: the after action report on each ending screen, plain text with a little Discord markdown
//   (bold labels, a numbered list), in English like the rest of the shared reports, and well under Discord's 2,000 characters.
// (GC 0.77) The story campaign that once spoke through here is gone, and its cast with it.
import { tEn } from './i18n.js';
import { CONFIG as C } from './config.js';
import { levelAt, levelName, LEVELS } from './difficulty.js';
import { tierFor } from './data/kit.js';
import { carriesOn } from './session.js';

const fmtNum = (n) => Math.round(n || 0).toLocaleString('en-US');
const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (sec) => `${pad(Math.floor((sec || 0) / 60))}:${pad(Math.floor((sec || 0) % 60))}`;
const lvl = (d) => `DIFFICULTY ${d} ${tEn(...levelName(d)).toUpperCase()}`;
const opShort = (op) => String(op || '').replace(/^Operation\s+/i, '').toUpperCase();
const pct = (f) => `${Math.round(100 * (f || 0))}%`;

// who can be named on the radio: the practice base's own command (its unit is a language key)
export const VOICE = {
  tharsis: { name: 'BASE THARSIS', unit: 'voice.u.tharsis', tag: 'THARSIS', col: '#ffb347' },
};

// ---------------------------------------------------------------- the command radio (0.28)
// Everything said on the radio in the tutorial, to read again. part: 'brief', 'mission' or 'debrief'. A line: { tag, col, text,
// unit, flavor (chatter), narr (narration, no speaker) }.
export class RadioLog {
  constructor() { this.items = []; this.unread = 0; this.onAdd = null; }
  clear() { this.items = []; this.unread = 0; if (this.onAdd) this.onAdd(null); }
  add(part, line) {
    const last = this.items[this.items.length - 1];
    if (last && last.part === part && last.text === line.text) return;
    const it = { part, ...line };
    this.items.push(it); if (this.items.length > 240) this.items.shift();
    this.unread++;
    if (this.onAdd) this.onAdd(it);
  }
  // a cinematic's lines (the tutorial's narration, as plain strings)
  addLines(part, lines) {
    for (const l of lines) this.add(part, typeof l === 'string' ? { tag: '', col: '', text: l, narr: true } : { tag: l.tag || l.name || '', col: l.col, unit: l.unit, text: l.text });
  }
}
// ---------------------------------------------------------------- after action reports
const HEAD = '**ORBITAL FURY · AFTER ACTION REPORT**';
const foot = () => `Orbital Fury v${C.share.version}`;
function gunner(cs) { return cs && cs !== 'ANON' ? `Gunner ${String(cs).toUpperCase()}` : 'Gunner'; }

// After a mission. s: the session (the mission is already recorded), info: the mission's info, res: mission.result().
// (0.53.12) the Fire-Support Ships the groups flew from: "A FS Fist of Peace (2 lost) · B …"
const shipsLine = (teams) => { const l = (teams || []).filter((tm) => tm && tm.ship); return l.length ? `**Fire-Support Ships:** ${l.map((tm) => `${tm.letter} ${tm.ship}${tm.deaths ? ` (${tm.deaths} lost)` : ''}`).join(' · ')}` : ''; };
export function aarMission(s, info, res) {
  const n = s.missions.length, total = s.missions.reduce((a, x) => a + (x.score || 0), 0);
  const st = res.stats || {}, objs = (res.objectives || []).map((o) => `${tEn('obj.name.' + o.type)} ${o.done ? '✅' : '❌'}`).join(' · ');
  const out = tEn('out.' + res.outcome) + (res.extracted && res.outcome !== 'victory' ? ' · EXTRACTED' : '');
  const boss = st.bosses ? ` · ${res.bossName || tEn('boss.' + info.faction)} ${st.bossKills ? 'KILLED' : 'ESCAPED'}` : '';
  const L = [
    HEAD,
    `**${opShort(info.op)}** · Mission ${n} · ${lvl(levelAt(s.difficulty ?? LEVELS, n))}`,
    `${gunner(s.callsign)} · ${tEn('fac.' + info.faction)} · ${tEn('biome.' + info.biome)} · ${fmtTime(res.t)} on the ground`,
    `**Result:** ${out}`,
    `**Objective:** ${objs || '-'}` + (res.sideTotal ? ` · Side ${res.sides}/${res.sideTotal}` : '') + (res.baseTotal ? ` · Bases ${res.bases}/${res.baseTotal}` : ''),
    `**Kills:** ${fmtNum(res.kills)} (gunner ${fmtNum(st.killsPlayer)} · allies ${fmtNum(st.killsAlly)})${boss}`,
    `**Vanguards:** ${fmtNum(st.lostH)} lost · ${res.livesLeft}/${res.livesMax ?? '?'} lives left`,
    shipsLine(res.teams),
    `**Infantry:** ${fmtNum(st.lostS)} lost` + (res.civSaved ? ` · ${fmtNum(res.civSaved)} civilians saved` : ''),
    res.share && res.share.player + res.share.squad + res.share.callin > 0 ? `**Damage:** gunner ${pct(res.share.player)} · Vanguards ${pct(res.share.squad)} · call-ins ${pct(res.share.callin)}` : '',
    `**Score:** ${fmtNum(res.score)} · operation ${fmtNum(total)} after ${n} mission${n === 1 ? '' : 's'}`,
  ];
  L.push(foot());
  return L.filter(Boolean).join('\n');
}

// At the end of a session: the totals, then every mission on a line.
// (0.53.12) every Fire-Support Ship that flew in the operation, the most-flown first (named ships fly every mission), at most six
function fleetLine(ms) {
  const n = new Map();
  for (const m of ms) for (const sh of m.ships || []) n.set(sh, (n.get(sh) || 0) + 1);
  if (!n.size) return '';
  const l = [...n].sort((a, b) => b[1] - a[1]), more = l.length - 6;
  return `**Fire-Support Ships:** ${l.slice(0, 6).map(([sh, k]) => sh + (k > 1 ? ` (${k} missions)` : '')).join(' · ')}${more > 0 ? ` · ${more} more` : ''}`;
}
export function aarSession(s, fin) {
  const ms = s.missions, n = ms.length, wins = fin ? fin.wins : ms.filter((m) => carriesOn(m.outcome)).length;
  const sum = (k) => ms.reduce((a, m) => a + (m[k] || 0), 0), bosses = ms.filter((m) => m.boss && m.boss.killed).length;
  const L = [
    '**ORBITAL FURY · OPERATION AFTER ACTION REPORT**',
    `**${opShort(s.op || (ms[0] && ms[0].op))}** · ${gunner(fin ? fin.callsign : s.callsign)} · **FINAL SCORE ${fmtNum(s.score)}**`,
    `${n} mission${n === 1 ? '' : 's'}, ${wins} won · ${fmtTime(s.seconds)} · ${lvl(s.difficulty || LEVELS)}`,
    n ? '**Missions**' : '',
    ...ms.map((m, i) => `${i + 1}. ${m.op && m.op !== s.op && /:/.test(m.op) ? opShort(m.op.split(':').pop().trim()) : 'Mission ' + (i + 1)} · ${tEn('fac.' + m.faction)} · ${tEn('out.' + m.outcome)} · ${fmtNum(m.score)} · ${fmtNum(m.kills)} kills` + (m.boss ? ` · ${m.boss.name || tEn('boss.' + m.boss.fac)} ${m.boss.killed ? 'KILLED' : 'ESCAPED'}` : '')),
    `**Totals:** ${fmtNum(sum('kills'))} kills · ${fmtNum(sum('lostH'))} Vanguards lost · ${fmtNum(sum('lostS'))} Infantry lost` + (bosses ? ` · ${bosses} super heav${bosses === 1 ? 'y' : 'ies'} killed` : ''),
    fleetLine(ms),
    foot(),
  ];
  return L.filter(Boolean).join('\n');
}

// The old last stand (kept for its report; nothing opens it now).
export function aarStand(res, callsign) {
  const ls = res.lastStand || {}, k = tierFor(res.kills || 0, true);
  return [
    HEAD,
    '**LAST STAND**',
    gunner(callsign),
    `**Personnel lifted out:** ${fmtNum(res.civSaved)}${ls.pop ? ` of ${fmtNum(ls.pop)}` : ''} · ${fmtNum(ls.lifted)} dship${ls.lifted === 1 ? '' : 's'} away · held ${fmtTime(ls.held)}`,
    `**Kills:** ${fmtNum(res.kills)}` + (k ? ` · Rank ${k}, ${tEn('rank.' + k)}` : ''),
    `**Result:** ${res.outcome === 'glassed' ? 'The base fell.' : 'Left before the end.'}`,
    foot(),
  ].join('\n');
}
