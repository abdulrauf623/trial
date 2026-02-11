import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

export type LineIconName =
  | 'home'
  | 'search'
  | 'wardrobe'
  | 'profile'
  | 'plus'
  | 'spark'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'camera'
  | 'gallery'
  | 'link'
  | 'upload'
  | 'refresh'
  | 'follow'
  | 'following'
  | 'heart'
  | 'heartFilled'
  | 'share'
  | 'close'
  | 'check'
  | 'report'
  | 'edit'
  | 'trash'
  | 'logout'
  | 'tune'
  | 'sun'
  | 'moon'
  | 'system'
  | 'grid'
  | 'layers'
  | 'back';

const GLYPHS: Record<LineIconName, string> = {
  home: '⌂',
  search: '⌕',
  wardrobe: '◫',
  profile: '◯',
  plus: '+',
  spark: '✧',
  bookmark: '⌁',
  bookmarkFilled: '⌘',
  camera: '⌖',
  gallery: '▦',
  link: '∞',
  upload: '⇪',
  refresh: '↻',
  follow: '⊕',
  following: '◉',
  heart: '♡',
  heartFilled: '♥',
  share: '↗',
  close: '×',
  check: '✓',
  report: '⚑',
  edit: '✎',
  trash: '⌫',
  logout: '⇥',
  tune: '≡',
  sun: '◌',
  moon: '◐',
  system: '◎',
  grid: '▥',
  layers: '⋮⋮',
  back: '‹',
};

interface LineIconProps {
  name: LineIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function LineIcon({
  name,
  size = 18,
  color = '#111111',
  style,
}: LineIconProps) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          color,
          lineHeight: size + 2,
          fontWeight: '500',
          textAlign: 'center',
        },
        style,
      ]}
    >
      {GLYPHS[name]}
    </Text>
  );
}

