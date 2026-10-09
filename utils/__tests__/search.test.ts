import videoData from '../../data/videoData.json';
import { buildSearchIndex, search, stem } from '../search';

const index = buildSearchIndex(videoData as any);
const top = (q: string, n = 3) => search(index, q).slice(0, n).map((r) => r.situation ?? `[${r.behavior}]`);

describe('stem', () => {
  it('folds word forms together', () => {
    expect(stem('eating')).toBe('eat');
    expect(stem('eats')).toBe('eat');
    expect(stem('ate')).toBe('eat');
    expect(stem('meals')).toBe('meal');
    expect(stem('showered')).toBe('shower');
    expect(stem('showering')).toBe('shower');
    expect(stem('refusing')).toBe('refus');
    expect(stem('refuses')).toBe('refus');
    expect(stem('refusals')).toBe('refus');
    expect(stem('worries')).toBe('worry');
    expect(stem('dishes')).toBe('dish');
  });
});

describe('search', () => {
  it('puts refusing to eat at the top for food, eating and eat', () => {
    expect(top('food')[0]).toBe('refusing-to-eat');
    expect(top('eating')[0]).toBe('refusing-to-eat');
    expect(top('eat')[0]).toBe('refusing-to-eat');
    expect(top('Eating')[0]).toBe('refusing-to-eat');
    expect(top('not eating')[0]).toBe('refusing-to-eat');
  });

  it('finds the shower situations for shower, bath and bathing', () => {
    for (const q of ['shower', 'bath', 'bathing', 'washing']) {
      const hits = search(index, q);
      expect(hits.length).toBeGreaterThan(3);
      expect(hits.slice(0, 4).every((h) => /shower/.test(h.situation ?? ''))).toBe(true);
    }
  });

  it('matches by meaning through keywords', () => {
    expect(top('wallet')).toContain('believing-someone-is-trying-to-steal-their-money');
    expect(top('pills')[0]).toBe('refusing-to-take-medication');
    expect(top('teeth')[0]).toBe('refusing-to-brush-teeth');
    expect(top('driving')[0]).toBe('refusing-to-stop-driving');
    expect(top('car keys')[0]).toBe('demanding-car-keys-to-go-home');
    expect(top('dog', 5)).toContain('seeing-animals-that-arent-there-eg-dogs');
    expect(top('sundown')).toContain('[sundowning]');
  });

  it('needs every word to match and ignores filler', () => {
    expect(search(index, 'the')).toEqual([]);
    expect(search(index, 'zzzz')).toEqual([]);
    expect(top('refusing shower fear')[0]).toBe('refuses-to-shower-due-to-fear-of-falling');
  });

  it('shows readable labels', () => {
    const hit = search(index, 'food')[0];
    expect(hit.label).toBe('Refusing to eat (Refusals)');
  });
});
