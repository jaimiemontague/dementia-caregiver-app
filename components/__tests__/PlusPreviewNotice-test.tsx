import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import WebNotice, { PLUS_STORE_LINKS, PLUS_WEB_COPY } from '../PlusPreviewNotice.web';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

function flatten(children: unknown): string {
  if (Array.isArray(children)) return children.map(flatten).join('');
  return typeof children === 'string' || typeof children === 'number' ? String(children) : '';
}

async function render(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(element);
  });
  return tree;
}

const texts = (tree: renderer.ReactTestRenderer) => tree.root.findAllByType(Text).map((node) => flatten(node.props.children)).filter(Boolean);

describe('Plus on the web', () => {
  it('sends web users to the phone app, with a button for each store', async () => {
    const tree = await render(<WebNotice />);
    expect(texts(tree)).toEqual([PLUS_WEB_COPY.heading, PLUS_WEB_COPY.steps, PLUS_WEB_COPY.appStore, PLUS_WEB_COPY.googlePlay]);
    expect(texts(tree).some((text) => text.startsWith('Get Plus for'))).toBe(false);

    const buttons = tree.root.findAllByType(TouchableOpacity);
    expect(buttons).toHaveLength(2);
    buttons.forEach((button) => button.props.onPress());
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(PLUS_STORE_LINKS.appStore);
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(PLUS_STORE_LINKS.googlePlay);
  });
});
