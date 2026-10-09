import videoData from '../../data/videoData.json';
import { canView, hasPlusAccess, isPlusShelf, needsPlus, tierAfterStoreCheck, tierFromLogin, type AccessTier } from '../access';

const freeVideo = { videoUrl: 'https://example.com/free.mp4', keywords: ['anger'] };
const memberVideo = { videoUrl: 'https://example.com/member.mp4', keywords: ['anger'], tier: 'member' };
const sheet = { title: 'Anger Cheatsheet', url: 'https://example.com/anger.pdf' };
const TIERS: AccessTier[] = ['free', 'plus', 'member'];

describe('canView', () => {
  it('lets every tier watch the free videos', () => {
    for (const tier of TIERS) expect(canView(freeVideo, tier)).toBe(true);
  });

  it('keeps member-layer videos and cheat sheets for Plus and members', () => {
    expect(canView(memberVideo, 'free')).toBe(false);
    expect(canView(sheet, 'free')).toBe(false);
    for (const tier of ['plus', 'member'] as const) {
      expect(canView(memberVideo, tier)).toBe(true);
      expect(canView(sheet, tier)).toBe(true);
    }
  });

  it('opens nothing that is missing, and nothing gated without a tier', () => {
    expect(canView(undefined, 'member')).toBe(false);
    expect(canView(null, 'member')).toBe(false);
    expect(canView(memberVideo, null)).toBe(false);
    expect(canView(sheet, undefined)).toBe(false);
  });

  it('gates every cheat sheet in the data file', () => {
    const sheets = Object.values(videoData).flatMap((situations) =>
      Object.values(situations as Record<string, { cheatsheet?: { title: string; url: string } }>)
        .map((entry) => entry.cheatsheet)
        .filter((entry): entry is { title: string; url: string } => Boolean(entry)),
    );
    expect(sheets.length).toBeGreaterThan(0);
    for (const cheatsheet of sheets) {
      expect(needsPlus(cheatsheet)).toBe(true);
      expect(canView(cheatsheet, 'free')).toBe(false);
    }
  });
});

describe('hasPlusAccess', () => {
  it('is Plus buyers and members', () => {
    expect(TIERS.map(hasPlusAccess)).toEqual([false, true, true]);
    expect(hasPlusAccess(null)).toBe(false);
  });
});

describe('isPlusShelf', () => {
  it('is a shelf where every situation needs Plus', () => {
    expect(isPlusShelf({ a: memberVideo, b: memberVideo })).toBe(true);
    expect(isPlusShelf({ a: memberVideo, b: freeVideo })).toBe(false);
    expect(isPlusShelf({})).toBe(false);
    expect(isPlusShelf(undefined)).toBe(false);
  });
});

describe('tierFromLogin', () => {
  it('keeps the three tiers, reads a missing tier as a member and an unknown one as free', () => {
    expect(tierFromLogin('free')).toBe('free');
    expect(tierFromLogin('plus')).toBe('plus');
    expect(tierFromLogin('member')).toBe('member');
    expect(tierFromLogin(undefined)).toBe('member');
    expect(tierFromLogin('gold')).toBe('free');
  });
});

describe('tierAfterStoreCheck', () => {
  const session = (tier: AccessTier | undefined, plusFromStore?: boolean) => ({ email: 'a@example.com', tier, plusFromStore });

  it('unlocks Plus for a free user who owns it in the store', () => {
    expect(tierAfterStoreCheck(session('free'), true)).toEqual({ email: 'a@example.com', tier: 'plus', plusFromStore: true });
    expect(tierAfterStoreCheck(session('free'), false)).toBeNull();
  });

  it('takes store-bought Plus away when the store no longer has it', () => {
    expect(tierAfterStoreCheck(session('plus', true), false)).toEqual({ email: 'a@example.com', tier: 'free', plusFromStore: false });
    expect(tierAfterStoreCheck(session('plus', true), true)).toBeNull();
  });

  it('never touches Plus from the login, members, or sessions from before tiers', () => {
    expect(tierAfterStoreCheck(session('plus'), false)).toBeNull();
    expect(tierAfterStoreCheck(session('member'), true)).toBeNull();
    expect(tierAfterStoreCheck(session('member'), false)).toBeNull();
    expect(tierAfterStoreCheck(session(undefined), true)).toBeNull();
  });
});
