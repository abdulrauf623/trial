import React from 'react';
import { StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Icon } from './Icon';

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
  const flattened = StyleSheet.flatten(style || {}) as TextStyle;
  const resolvedSize = typeof flattened.fontSize === 'number' ? flattened.fontSize : size;
  const resolvedColor = typeof flattened.color === 'string' ? flattened.color : color;
  const {
    fontSize: _fontSize,
    color: _textColor,
    fontWeight: _fontWeight,
    lineHeight: _lineHeight,
    textAlign: _textAlign,
    ...iconStyle
  } = flattened;

  return (
    <Icon
      name={name}
      size={resolvedSize}
      color={resolvedColor}
      weight="regular"
      style={iconStyle as StyleProp<ViewStyle | TextStyle>}
    />
  );
}
