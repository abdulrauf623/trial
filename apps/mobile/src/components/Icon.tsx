import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import {
  ArrowClockwise,
  BookmarkSimple,
  CalendarDots,
  Camera,
  CaretLeft,
  Check,
  CoatHanger,
  Compass,
  Desktop,
  Flag,
  Heart,
  House,
  ImageSquare,
  LinkSimple,
  MagnifyingGlass,
  Moon,
  PencilSimple,
  Plus,
  ShareNetwork,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  SquaresFour,
  StackSimple,
  Sun,
  Trash,
  TShirt,
  UploadSimple,
  User,
  UserCheck,
  UserPlus,
  X,
  type IconProps as PhosphorIconProps,
  type IconWeight,
} from 'phosphor-react-native';

type IconComponent = React.ComponentType<PhosphorIconProps>;

export type IconName =
  | 'compass'
  | 'hanger'
  | 'user'
  | 'tshirt'
  | 'bookmarkSimple'
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
  | 'calendar'
  | 'back';

const ICONS: Record<IconName, IconComponent> = {
  compass: Compass,
  hanger: CoatHanger,
  user: User,
  tshirt: TShirt,
  bookmarkSimple: BookmarkSimple,
  home: House,
  search: MagnifyingGlass,
  wardrobe: CoatHanger,
  profile: User,
  plus: Plus,
  spark: Sparkle,
  bookmark: BookmarkSimple,
  bookmarkFilled: BookmarkSimple,
  camera: Camera,
  gallery: ImageSquare,
  link: LinkSimple,
  upload: UploadSimple,
  refresh: ArrowClockwise,
  follow: UserPlus,
  following: UserCheck,
  heart: Heart,
  heartFilled: Heart,
  share: ShareNetwork,
  close: X,
  check: Check,
  report: Flag,
  edit: PencilSimple,
  trash: Trash,
  logout: SignOut,
  tune: SlidersHorizontal,
  sun: Sun,
  moon: Moon,
  system: Desktop,
  grid: SquaresFour,
  layers: StackSimple,
  calendar: CalendarDots,
  back: CaretLeft,
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: IconWeight;
  style?: StyleProp<ViewStyle | TextStyle>;
}

const ENFORCED_WEIGHT: IconWeight = 'regular';

export function Icon({
  name,
  size = 26,
  color = '#111827',
  weight = 'regular',
  style,
}: IconProps) {
  const Glyph = ICONS[name];
  const normalizedWeight: IconWeight = weight === 'regular' ? ENFORCED_WEIGHT : ENFORCED_WEIGHT;
  return <Glyph size={size} color={color} weight={normalizedWeight} style={style} />;
}
