/**
 * Search over the app's behaviors and situations.
 *
 * Matches on the situation label, its keywords (data/videoData.json, `keywords`), and the
 * behavior name, with light stemming so "eating", "eats" and "eat" all meet "eat", and
 * prefix matching so "refus" finds "refusing" and "refusals". Every word the caregiver
 * types has to match something; results are ranked by how directly they match.
 */

export type VideoEntry = {
  videoUrl?: string;
  keywords?: string[];
  tier?: string;
  [key: string]: unknown;
};

export type VideoData = Record<string, Record<string, VideoEntry>>;

export type SearchItem = {
  label: string;      // what the list shows
  behavior: string;   // slug
  situation?: string; // slug; undefined for a behavior-level entry
};

type IndexEntry = SearchItem & {
  key: string;              // the video itself, so a video shelved in two categories shows once
  labelStems: string[];
  primaryStems: string[];   // the first few keywords: what the video is mainly about
  keywordStems: string[];
  behaviorStems: string[];
  tokenCount: number;
};

const IRREGULAR: Record<string, string> = {
  ate: 'eat', eaten: 'eat', eats: 'eat',
  refusal: 'refus', refusals: 'refus',
  clothes: 'cloth', clothing: 'cloth',
  medicine: 'medic', medication: 'medic', medications: 'medic', meds: 'medic',
  teeth: 'tooth',
  feet: 'foot',
  children: 'child', kids: 'kid',
  bathe: 'bath', bathing: 'bath',
  wander: 'wander', wandering: 'wander', wanders: 'wander',
  theyre: 'they', youre: 'you', im: 'i', dont: 'do', doesnt: 'do', wheres: 'where', whats: 'what',
};

/** A small stemmer: enough for English caregiver vocabulary, never clever. */
export function stem(word: string): string {
  const w = word.toLowerCase();
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (w.length <= 3) return w;
  const strip = (suffix: string, minLeft: number) =>
    w.endsWith(suffix) && w.length - suffix.length >= minLeft ? w.slice(0, -suffix.length) : null;
  // A trailing e goes too, so refuse, refuses, refused and refusing all land on "refus".
  const dropE = (s: string) => (s.length >= 5 && s.endsWith('e') ? s.slice(0, -1) : s);
  let out = strip('ings', 3) ?? strip('ing', 3);
  if (out) return out.endsWith('bb') || out.endsWith('tt') ? out.slice(0, -1) : out; // sitting -> sit
  out = strip('ies', 3);
  if (out) return out + 'y'; // worries -> worry
  out = strip('ied', 3);
  if (out) return out + 'y';
  out = strip('ed', 3);
  if (out) return dropE(out);
  if (/(sh|ch|ss|x|z)es$/.test(w)) return w.slice(0, -2); // dishes -> dish
  if (w.endsWith('ss')) return w;
  out = strip('s', 3);
  if (out) return dropE(out); // meals -> meal, refuses -> refus
  return dropE(w);
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function stems(text: string): string[] {
  return tokenize(text).map(stem);
}

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'or', 'and', 'eg', 'e', 'g', 'is', 'it', 'are', 'they', 'them', 'their', 'with', 'in', 'on', 'at', 'for', 'when', 'how', 'what', 'say', 'me', 'my', 'i', 'im', 'you', 'your', 'due', 'like', 'from', 'not', 'no', 'wont', 'cant', 'do', 'does', 'did']);

/** Display names that the slug-to-title rule cannot produce (the ampersand categories). */
export const BEHAVIOR_TITLES: Record<string, string> = {
  'eating-and-medication': 'Eating & Medication',
  'showering-and-hygiene': 'Showering & Hygiene',
};

/** The behavior card title: the display map, else the slug with hyphens as spaces, Title Case. */
export function prettyBehavior(slug: string): string {
  return (
    BEHAVIOR_TITLES[slug] ??
    slug
      .replace(/-/g, ' ')
      .replace(/!/g, '')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function prettySituation(slug: string): string {
  const s = slug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildSearchIndex(data: VideoData): IndexEntry[] {
  const index: IndexEntry[] = [];
  for (const [behavior, situations] of Object.entries(data)) {
    const behaviorStems = stems(behavior).filter((s) => !STOP.has(s));
    index.push({
      label: prettyBehavior(behavior),
      behavior,
      key: `behavior:${behavior}`,
      labelStems: behaviorStems,
      primaryStems: [],
      keywordStems: [],
      behaviorStems,
      tokenCount: behaviorStems.length,
    });
    for (const [situation, entry] of Object.entries(situations)) {
      const keywords = Array.isArray(entry?.keywords) ? entry.keywords : [];
      const labelStems = stems(situation);
      index.push({
        label: `${prettySituation(situation)} (${prettyBehavior(behavior)})`,
        behavior,
        situation,
        key: typeof entry?.videoUrl === 'string' && entry.videoUrl ? entry.videoUrl : `${behavior}/${situation}`,
        labelStems: labelStems.filter((s) => !STOP.has(s)),
        primaryStems: keywords.slice(0, 2).flatMap(stems),
        keywordStems: keywords.slice(2).flatMap(stems),
        behaviorStems,
        tokenCount: labelStems.length,
      });
    }
  }
  return index;
}

/** Does the typed stem q meet the indexed stem t? Exact, or a prefix either way (at least 3 and 4 letters). */
function meets(q: string, t: string): 'exact' | 'prefix' | null {
  if (q === t) return 'exact';
  if (q.length >= 3 && t.startsWith(q)) return 'prefix';
  if (t.length >= 4 && q.startsWith(t) && q.length - t.length <= 3) return 'prefix';
  return null;
}

function best(q: string, list: string[], exactScore: number, prefixScore: number): number {
  let score = 0;
  for (const t of list) {
    const m = meets(q, t);
    if (m === 'exact') return exactScore;
    if (m === 'prefix') score = Math.max(score, prefixScore);
  }
  return score;
}

export function search(index: IndexEntry[], query: string, limit = 30): SearchItem[] {
  const qs = stems(query).filter((s) => !STOP.has(s));
  if (!qs.length) return [];
  const scored: { item: IndexEntry; score: number }[] = [];
  for (const item of index) {
    let total = 0;
    let ok = true;
    for (const q of qs) {
      // A word in the label or in the first two keywords is what the video is about;
      // the remaining keywords are ways people describe it; the behavior name is context.
      const s = Math.max(
        best(q, item.labelStems, 3.2, 2),
        best(q, item.primaryStems, 3.2, 2),
        best(q, item.keywordStems, 2.6, 1.5),
        best(q, item.behaviorStems, 1, 0.5),
      );
      if (!s) { ok = false; break; }
      total += s;
    }
    if (ok) scored.push({ item, score: total });
  }
  scored.sort((a, b) =>
    b.score - a.score ||
    a.item.tokenCount - b.item.tokenCount ||
    a.item.label.localeCompare(b.item.label),
  );
  // A video shelved under two categories appears once, under the copy that scored best
  // (ties go to the one listed first in the data file, its home behavior).
  const seen = new Set<string>();
  const out: SearchItem[] = [];
  for (const { item } of scored) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    out.push({ label: item.label, behavior: item.behavior, situation: item.situation });
    if (out.length >= limit) break;
  }
  return out;
}
