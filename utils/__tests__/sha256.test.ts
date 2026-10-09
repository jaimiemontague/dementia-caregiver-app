import { sha256Hex } from '../sha256';

// Node's own SHA-256 (the login function's), loaded through jest: the app's tsconfig has no Node types.
const { createHash } = jest.requireActual('crypto');
const nodeSha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

describe('sha256Hex', () => {
  it('matches the published test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it("matches Node's crypto across block boundaries and for non-ASCII text", () => {
    const inputs = ['member@example.com', 'Jane.Doe+app@Gmail.com', 'josé@example.com', '名前@example.jp', 'emoji 😀 test', '\ud800 lone', 'tail \udc00'];
    for (let length = 50; length <= 130; length++) inputs.push('x'.repeat(length));
    for (const text of inputs) {
      expect(sha256Hex(text)).toBe(nodeSha256(text));
    }
  });
});
