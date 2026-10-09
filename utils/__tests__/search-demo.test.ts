import videoData from '../../data/videoData.json';
import { buildSearchIndex, search } from '../search';

// Prints the top results for the words a caregiver is likely to type. Run with
//   npx jest utils/__tests__/search-demo.test.ts --silent=false
// It never fails; it is a window into the ranking.
const index = buildSearchIndex(videoData as any);
const WORDS = ['food', 'eating', 'eat', 'meals', 'shower', 'bathing', 'wash', 'pills', 'money', 'wallet', 'keys', 'driving', 'go home', 'evening', 'night', 'bugs', 'dog', 'mom', 'bed', 'diapers', 'doctor', 'phone', 'clothes', 'help', 'stealing'];

test('demo: top results per word', () => {
  const lines = WORDS.map((w) => {
    const hits = search(index, w).slice(0, 4).map((h) => h.situation ?? `[${h.behavior}]`);
    return `${w.padEnd(10)} -> ${hits.join(' | ')}`;
  });
  // eslint-disable-next-line no-console
  console.log('\n' + lines.join('\n'));
  expect(lines.length).toBe(WORDS.length);
});
