const { summarize, formatReport, emailHashFor, listPrice } = require('../plus-report');
const { emailHash } = require('../../utils/identity');

const seen = (hash, product) => ({ test: 't', emailHash: hash, deviceHash: null, product, assignedAt: '2026-10-09T00:00:00.000Z' });
const bought = (hash, product, platform) => ({ test: 't', emailHash: hash, deviceHash: null, product, platform, purchasedAt: '2026-10-09T01:00:00.000Z' });

describe('plus-report', () => {
  it('counts who saw each price, who bought, and gross at list price', () => {
    const summary = summarize(
      [seen('a', 'help_now_plus_27'), seen('b', 'help_now_plus_27'), seen('c', 'help_now_plus_37'), seen('d', 'help_now_plus_47')],
      [bought('a', 'help_now_plus_27', 'ios'), bought('c', 'help_now_plus_37', 'android')],
    );

    expect(summary.products).toEqual([
      { product: 'help_now_plus_7', listPrice: 7, saw: 0, buyers: 0, conversion: null, purchases: 0, platforms: {}, gross: 0 },
      { product: 'help_now_plus_17', listPrice: 17, saw: 0, buyers: 0, conversion: null, purchases: 0, platforms: {}, gross: 0 },
      { product: 'help_now_plus_27', listPrice: 27, saw: 2, buyers: 1, conversion: 0.5, purchases: 1, platforms: { ios: 1 }, gross: 27 },
      { product: 'help_now_plus_37', listPrice: 37, saw: 1, buyers: 1, conversion: 1, purchases: 1, platforms: { android: 1 }, gross: 37 },
      { product: 'help_now_plus_47', listPrice: 47, saw: 1, buyers: 0, conversion: 0, purchases: 0, platforms: {}, gross: 0 },
    ]);
    expect(summary.total).toEqual({ saw: 4, buyers: 2, purchases: 2, gross: 64 });
    expect(summary.notes).toMatchObject({ withoutAssignment: 0, otherProduct: 0, duplicateTransactions: 0 });
  });

  it('flags purchases with no assignment record or a different product', () => {
    const summary = summarize([seen('a', 'help_now_plus_27')], [bought('a', 'help_now_plus_37', 'ios'), bought('z', 'help_now_plus_47', 'ios')]);

    expect(summary.notes).toMatchObject({ withoutAssignment: 1, otherProduct: 1 });
    expect(formatReport('t', summary, 'now')).toMatch(/1 purchase\(s\) with no assignment record/);
  });

  it('counts a store transaction once, whoever it was recorded under', () => {
    const summary = summarize(
      [seen('a', 'help_now_plus_27'), seen('b', 'help_now_plus_27')],
      [{ ...bought('a', 'help_now_plus_27', 'ios'), transactionId: '42' }, { ...bought('b', 'help_now_plus_27', 'ios'), transactionId: '42' }],
    );

    expect(summary.total.purchases).toBe(1);
    expect(summary.notes.duplicateTransactions).toBe(1);
  });

  it('flags records no login matches, and leaves them out on request', () => {
    const assignments = [seen('a', 'help_now_plus_37'), seen('fake1', 'help_now_plus_37'), seen('fake2', 'help_now_plus_37')];
    const purchases = [bought('a', 'help_now_plus_37', 'ios')];
    const knownUsers = new Set(['a']);

    const all = summarize(assignments, purchases, { knownUsers });
    expect(all.total.saw).toBe(3);
    expect(all.notes).toMatchObject({ unmatchedAssignments: 2, unmatchedPurchases: 0 });
    expect(formatReport('t', all, 'now')).toContain('2 assignment and 0 purchase record(s) match no login');

    const matched = summarize(assignments, purchases, { knownUsers, matchedOnly: true });
    expect(matched.total).toEqual({ saw: 1, buyers: 1, purchases: 1, gross: 37 });
  });

  it('prints a table with a row per product and a total', () => {
    const text = formatReport('plus-price-2026-10', summarize([seen('a', 'help_now_plus_37')], [bought('a', 'help_now_plus_37', 'ios')]), '2026-10-09');

    expect(text).toContain('Help Now Plus price test plus-price-2026-10');
    expect(text).toMatch(/help_now_plus_37\s+\$37\s+1\s+1\s+100\.0%\s+1 \(1\/0\)\s+\$37/);
    expect(text).toMatch(/total\s+1\s+1\s+100\.0%\s+1\s+\$37/);
  });

  it('hashes an email exactly as the app does', () => {
    expect(emailHashFor(' Someone@Example.com ')).toBe(emailHash('someone@example.com'));
    expect(listPrice('help_now_plus_47')).toBe(47);
  });
});
