/* global describe, it, expect */

describe('patched transitive dependency compatibility', () => {
  it('keeps minimatch 3 brace expansion behavior with brace-expansion 5', () => {
    const minimatch = require('minimatch');

    expect(minimatch('caregiver-help', '{caregiver,nurse}-help')).toBe(true);
    expect(minimatch('other-help', '{caregiver,nurse}-help')).toBe(false);
  });
});
