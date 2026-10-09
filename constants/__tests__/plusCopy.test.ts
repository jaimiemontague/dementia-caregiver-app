import { PLUS_COPY, PLUS_LINKS, withPrice } from '../plusCopy';

// App Review rejected this app once under guideline 3.1.1. Nothing Plus shows may point at
// buying anywhere but the in-app purchase.
const FORBIDDEN = ['web', 'site', 'online', 'http', 'www', '.com', 'membership', 'cheaper', 'elsewhere', 'discount', 'coupon', 'kartra', 'mailchimp', 'facebook', 'email us'];

describe('Plus copy', () => {
  it('never steers anyone outside the store', () => {
    for (const [key, text] of Object.entries(PLUS_COPY)) {
      const lower = text.toLowerCase();
      for (const word of FORBIDDEN) {
        expect({ key, word, found: lower.includes(word) }).toEqual({ key, word, found: false });
      }
      // "members" reads as a pitch for the membership sold outside the app.
      expect({ key, found: /\bmembers?\b/.test(lower) }).toEqual({ key, found: false });
    }
  });

  it('takes the price only from the store', () => {
    expect(PLUS_COPY.buyButton).toContain('[PRICE]');
    expect(withPrice(PLUS_COPY.buyButton, '$37.00')).toBe('Get Plus for $37.00');
    expect(Object.values(PLUS_COPY).join(' ')).not.toMatch(/\$\d/);
  });

  it('links only to the policy pages', () => {
    expect(PLUS_LINKS.privacy).toBe('https://dementiasuccesspath.com/privacy-policy');
    expect(PLUS_LINKS.termsIos).toBe('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  });
});
