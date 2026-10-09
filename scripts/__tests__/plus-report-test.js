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
      { product: 'help_now_plus_27', listPrice: 27, saw: 2, buyers: 1, conversion: 0.5, purchases: 1, platforms: { ios: 1 }, gross: 27 },
      { product: 'help_now_plus_37', listPrice: 37, saw: 1, buyers: 1, conversion: 1, purchases: 1, platforms: { android: 1 }, gross: 37 },
      { product: 'help_now_plus_47', listPrice: 47, saw: 1, buyers: 0, conversion: 0, purchases: 0, platforms: {}, gross: 0 },
    ]);
    expect(summary.total).toEqual({ saw: 4, buyers: 2, purchases: 2, gross: 64 });
    expect(summary.notes).toEqual({ withoutAssignment: 0, otherProduct: 0 });
  });

  it('flags purchases with no assignment record or a different product', () => {
    const summary = summarize([seen('a', 'help_now_plus_27')], [bought('a', 'help_now_plus_37', 'ios'), bought('z', 'help_now_plus_47', 'ios')]);

    expect(summary.notes).toEqual({ withoutAssignment: 1, otherProduct: 1 });
    expect(formatReport('t', summary, 'now')).toMatch(/1 purchase\(s\) with no assignment record/);
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
