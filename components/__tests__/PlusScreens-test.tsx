import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Linking, Text, TextInput, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import PlusScreen from '../../app/plus';
import BehaviorPage from '../../app/(tabs)/behavior/[behavior]';
import SituationPage from '../../app/(tabs)/behavior/[behavior]/[situation]';
import HomePage from '../../app/(tabs)/index';
import CheatsheetCard from '../CheatsheetCard';
import { PLUS_COPY, PLUS_LINKS } from '@/constants/plusCopy';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn() }), VideoView: () => null }));

const mockAddRecentVideo = jest.fn();
jest.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ recentVideos: [], refreshRecentVideos: jest.fn(), addRecentVideo: mockAddRecentVideo }),
}));
jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ favoriteVideos: [], refreshFavorites: jest.fn(), toggleFavorite: jest.fn(), isFavorite: () => false }),
}));

type Tier = 'free' | 'plus' | 'member';
const mockAuth = { hasPlus: false, accessTier: 'free' as Tier, isMember: false, authData: { email: 'caregiver@example.com' }, logout: jest.fn() };
const setTier = (tier: Tier) => {
  mockAuth.accessTier = tier;
  mockAuth.hasPlus = tier !== 'free';
  mockAuth.isMember = tier === 'member';
};
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));

const mockPlus = {
  support: 'ready',
  product: 'help_now_plus_37',
  price: '$37.00' as string | null,
  priceStatus: 'loaded',
  busy: false,
  loadPrice: jest.fn(),
  buy: jest.fn(),
  restore: jest.fn(),
};
jest.mock('@/contexts/PlusContext', () => ({ usePlus: () => mockPlus }));

jest.mock('../../data/videoData.json', () => ({
  anger: {
    'yelling-at-me': {
      videoUrl: 'https://example.com/free.mp4',
      keywords: ['yelling'],
      cheatsheet: { title: 'Anger Cheatsheet', url: 'https://example.com/anger.pdf' },
    },
    'mood-swings': { videoUrl: 'https://example.com/plus.mp4', keywords: ['mood'], tier: 'member' },
  },
  'plus-only-shelf': {
    'late-night-worry': { videoUrl: 'https://example.com/plus2.mp4', keywords: ['worry'], tier: 'member' },
  },
}));

function flatten(children: unknown): string {
  if (Array.isArray(children)) return children.map(flatten).join('');
  return typeof children === 'string' || typeof children === 'number' ? String(children) : '';
}

function texts(tree: renderer.ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map((node) => flatten(node.props.children)).filter(Boolean);
}

function pressable(tree: renderer.ReactTestRenderer, label: string) {
  const match = tree.root
    .findAllByType(TouchableOpacity)
    .find((node) => node.findAllByType(Text).some((text) => flatten(text.props.children) === label));
  if (!match) throw new Error(`Nothing pressable says "${label}"`);
  return match;
}

async function render(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(element);
  });
  return tree as renderer.ReactTestRenderer;
}

const FORBIDDEN = /web|site|online|http|membership|cheaper|kartra|mailchimp|\bmembers?\b/i;

beforeEach(() => {
  jest.clearAllMocks();
  setTier('free');
  mockParams = {};
  Object.assign(mockPlus, { support: 'ready', product: 'help_now_plus_37', price: '$37.00', priceStatus: 'loaded', busy: false });
});

describe('the paywall', () => {
  it('sells Plus at the store price, with the one-time terms, restore and the policy links', async () => {
    const tree = await render(<PlusScreen />);
    const shown = texts(tree);

    expect(shown).toEqual(expect.arrayContaining([
      PLUS_COPY.name, PLUS_COPY.promise, PLUS_COPY.includes, 'Get Plus for $37.00',
      PLUS_COPY.oneTime, PLUS_COPY.chargedIos, PLUS_COPY.restore, PLUS_COPY.terms, PLUS_COPY.privacy,
    ]));
    expect(mockPlus.loadPrice).toHaveBeenCalled();

    mockPlus.buy.mockResolvedValueOnce('pending');
    await act(async () => {
      pressable(tree, 'Get Plus for $37.00').props.onPress();
    });
    expect(mockPlus.buy).toHaveBeenCalled();
    expect(texts(tree)).toContain(PLUS_COPY.pending);

    mockPlus.restore.mockResolvedValueOnce('nothing-to-restore');
    await act(async () => {
      pressable(tree, PLUS_COPY.restore).props.onPress();
    });
    expect(texts(tree)).toContain(PLUS_COPY.nothingToRestore);

    const privacy = tree.root.findAllByType(Text).find((node) => flatten(node.props.children) === PLUS_COPY.privacy);
    privacy?.props.onPress();
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(PLUS_LINKS.privacy);
  });

  it('shows a preview where there is no store, and no buy button', async () => {
    mockPlus.support = 'preview';
    const shown = texts(await render(<PlusScreen />));

    expect(shown).toContain(PLUS_COPY.preview);
    expect(shown.some((text) => text.startsWith('Get Plus'))).toBe(false);
  });

  it('says so when a build has no store key', async () => {
    mockPlus.support = 'unavailable';
    expect(texts(await render(<PlusScreen />))).toContain(PLUS_COPY.unavailable);
  });

  it('offers a retry when the price does not load, and never shows a price of its own', async () => {
    Object.assign(mockPlus, { price: null, priceStatus: 'failed' });
    const tree = await render(<PlusScreen />);

    expect(texts(tree)).toContain(PLUS_COPY.priceFailed);
    expect(texts(tree).some((text) => /\$\d/.test(text))).toBe(false);
    await act(async () => {
      pressable(tree, PLUS_COPY.retry).props.onPress();
    });
    expect(mockPlus.loadPrice).toHaveBeenCalledTimes(2);
  });

  it('tells Plus buyers and members they already have it', async () => {
    for (const tier of ['plus', 'member'] as const) {
      setTier(tier);
      mockPlus.loadPrice.mockClear();
      const shown = texts(await render(<PlusScreen />));
      expect(shown).toContain(PLUS_COPY.owned);
      expect(shown.some((text) => text.startsWith('Get Plus'))).toBe(false);
      expect(mockPlus.loadPrice).not.toHaveBeenCalled();
    }
  });

  it('never shows a word that points outside the store, in any state', async () => {
    const states: [Tier, Partial<typeof mockPlus>][] = [
      ['free', { support: 'ready', priceStatus: 'loaded' }],
      ['free', { support: 'ready', priceStatus: 'loading', price: null }],
      ['free', { support: 'ready', priceStatus: 'failed', price: null }],
      ['free', { support: 'preview' }],
      ['free', { support: 'unavailable' }],
      ['plus', {}],
    ];
    for (const [tier, plus] of states) {
      setTier(tier);
      Object.assign(mockPlus, plus);
      for (const text of texts(await render(<PlusScreen />))) {
        expect({ text, forbidden: FORBIDDEN.test(text) }).toEqual({ text, forbidden: false });
      }
    }
  });
});

describe('the cheat sheet card', () => {
  const sheet = { title: 'Anger Cheatsheet', url: 'https://example.com/anger.pdf' };

  it('shows free users the sheet and a way to Plus, with no other link', async () => {
    const tree = await render(<CheatsheetCard cheatsheet={sheet} />);

    expect(texts(tree)).toEqual([PLUS_COPY.cheatsheetLabel, sheet.title, PLUS_COPY.cheatsheetLocked, PLUS_COPY.getPlus]);
    pressable(tree, PLUS_COPY.getPlus).props.onPress();
    expect(mockRouter.push).toHaveBeenCalledWith('/plus');
  });

  it('opens the PDF for Plus', async () => {
    setTier('plus');
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const tree = await render(<CheatsheetCard cheatsheet={sheet} />);

    expect(texts(tree)).toContain('Cheat sheet for this situation');
    tree.root.findByType(TouchableOpacity).props.onPress();
    expect(openURL).toHaveBeenCalledWith(sheet.url);
    openURL.mockRestore();
  });
});

describe('member-layer videos', () => {
  it('stay listed for free users with a Plus badge, and open the paywall', async () => {
    mockParams = { behavior: 'anger' };
    const tree = await render(<BehaviorPage />);

    expect(texts(tree)).toEqual(expect.arrayContaining(['Yelling At Me', 'Mood Swings', PLUS_COPY.badge]));
    pressable(tree, 'Mood Swings').props.onPress();
    expect(mockRouter.push).toHaveBeenLastCalledWith('/plus');
    pressable(tree, 'Yelling At Me').props.onPress();
    expect(mockRouter.push).toHaveBeenLastCalledWith(expect.objectContaining({ params: { behavior: 'anger', situation: 'yelling-at-me' } }));
  });

  it('open normally for Plus, without a badge', async () => {
    setTier('plus');
    mockParams = { behavior: 'anger' };
    const tree = await render(<BehaviorPage />);

    expect(texts(tree)).not.toContain(PLUS_COPY.badge);
    pressable(tree, 'Mood Swings').props.onPress();
    expect(mockRouter.push).toHaveBeenLastCalledWith(expect.objectContaining({ params: { behavior: 'anger', situation: 'mood-swings' } }));
  });

  it('show a locked page, not the video, when a free user reaches one directly', async () => {
    mockParams = { behavior: 'anger', situation: 'mood-swings' };
    const tree = await render(<SituationPage />);

    expect(texts(tree)).toEqual(expect.arrayContaining([PLUS_COPY.lockedVideoTitle, PLUS_COPY.getPlus]));
    expect(mockAddRecentVideo).not.toHaveBeenCalled();
    pressable(tree, PLUS_COPY.getPlus).props.onPress();
    expect(mockRouter.push).toHaveBeenCalledWith('/plus');
  });

  it('play for Plus', async () => {
    setTier('plus');
    mockParams = { behavior: 'anger', situation: 'mood-swings' };
    const tree = await render(<SituationPage />);

    expect(texts(tree)).not.toContain(PLUS_COPY.lockedVideoTitle);
    expect(mockAddRecentVideo).toHaveBeenCalledWith(expect.objectContaining({ situation: 'mood-swings' }));
  });
});

describe('Home', () => {
  it('shows free users the Plus row, badges Plus-only shelves and Plus search results', async () => {
    const tree = await render(<HomePage />);

    pressable(tree, PLUS_COPY.homeRowTitle).props.onPress();
    expect(mockRouter.push).toHaveBeenLastCalledWith('/plus');
    await act(async () => {
      pressable(tree, 'Plus Only Shelf').props.onPress();
    });
    expect(mockRouter.push).toHaveBeenLastCalledWith('/plus');

    await act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('mood');
    });
    expect(texts(tree)).toEqual(expect.arrayContaining(['Mood swings (Anger)', PLUS_COPY.badge]));
    pressable(tree, 'Mood swings (Anger)').props.onPress();
    expect(mockRouter.push).toHaveBeenLastCalledWith('/plus');
  });

  it('shows Plus buyers and members none of it', async () => {
    for (const tier of ['plus', 'member'] as const) {
      setTier(tier);
      const tree = await render(<HomePage />);
      expect(texts(tree)).not.toContain(PLUS_COPY.homeRowTitle);
      expect(texts(tree)).not.toContain(PLUS_COPY.badge);

      await act(async () => {
        tree.root.findByType(TextInput).props.onChangeText('mood');
      });
      pressable(tree, 'Mood swings (Anger)').props.onPress();
      expect(mockRouter.push).toHaveBeenLastCalledWith(expect.objectContaining({ params: { behavior: 'anger', situation: 'mood-swings' } }));
    }
  });
});
