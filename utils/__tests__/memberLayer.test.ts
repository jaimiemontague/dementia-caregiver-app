import videoData from '../../data/videoData.json';
import { buildSearchIndex, prettySituation, search, situationPhrase, situationTitle } from '../search';

type Entry = { videoUrl?: string; tier?: string; label?: string; keywords?: string[]; homeBehavior?: string; cheatsheet?: { title: string; url: string } };
const data = videoData as Record<string, Record<string, Entry>>;
const all = Object.entries(data).flatMap(([behavior, sits]) => Object.entries(sits).map(([slug, e]) => ({ behavior, slug, e })));
const member = all.filter((x) => x.e.tier === 'member' && !x.e.homeBehavior);
const memberCopies = all.filter((x) => x.e.tier === 'member' && x.e.homeBehavior);

describe('member layer data', () => {
  it('has the 101 member videos, each with a label, keywords and an S3 video', () => {
    expect(member).toHaveLength(101);
    for (const { e } of member) {
      expect(typeof e.label).toBe('string');
      expect(e.keywords?.length).toBeGreaterThan(3);
      expect(e.videoUrl).toMatch(/^https:\/\/dementiacaregivingmadeeasy\.s3\.us-east-1\.amazonaws\.com\/videos\/[A-Za-z0-9_()-]+\.mp4$/);
    }
    const urls = member.map((x) => x.e.videoUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('never reuses a free-tier video', () => {
    const free = new Set(all.filter((x) => x.e.tier !== 'member').map((x) => x.e.videoUrl));
    for (const { e } of member) expect(free.has(e.videoUrl)).toBe(false);
  });

  it('shelves category copies that match their home entry', () => {
    expect(memberCopies.length).toBeGreaterThan(0);
    for (const { slug, e } of memberCopies) {
      const { homeBehavior, ...rest } = e;
      expect(data[homeBehavior as string][slug]).toEqual(rest);
    }
  });

  it('lists member videos after the free videos of each behavior', () => {
    for (const sits of Object.values(data)) {
      const tiers = Object.values(sits).map((e) => e.tier === 'member');
      expect(tiers.indexOf(true) === -1 || tiers.slice(tiers.indexOf(true)).every(Boolean)).toBe(true);
    }
  });
});

describe('situation names', () => {
  const yelling = data.anger['yelling-i-hate-you-and-telling-you-to-get-out'];

  it('uses the label when there is one', () => {
    expect(situationTitle('yelling-i-hate-you-and-telling-you-to-get-out', yelling)).toBe('Yelling "I Hate You" And Telling You To Get Out');
    expect(situationPhrase('yelling-i-hate-you-and-telling-you-to-get-out', yelling)).toBe('yelling "I hate you" and telling you to get out');
    expect(prettySituation('yelling-i-hate-you-and-telling-you-to-get-out', yelling)).toBe('Yelling "I hate you" and telling you to get out');
  });

  it('keeps the free-tier names exactly as before', () => {
    expect(situationTitle('begs-me-to-go-home-(facility)')).toBe('Begs Me To Go Home (Facility)');
    expect(situationPhrase('refusing-to-eat')).toBe('refusing to eat');
    expect(situationTitle('refusing-to-eat', data.refusals['refusing-to-eat'])).toBe('Refusing To Eat');
  });

  it('finds member videos by their keywords', () => {
    const index = buildSearchIndex(data as any);
    expect(search(index, 'walker').map((h) => h.situation)).toContain('saying-i-can-walk-on-my-own-(refusing-the-walker)');
    expect(search(index, 'jelly drops').map((h) => h.situation)).toContain('not-drinking-enough-(jelly-drops)');
  });
});
