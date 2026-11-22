import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { FONTS } from './typography';

/** @type {Readonly<Record<(typeof FONTS)[keyof typeof FONTS], import('expo-font').FontSource>>} */
export const FONT_ASSETS = {
  [FONTS.heading]: Fredoka_600SemiBold,
  [FONTS.display]: Fredoka_700Bold,
  [FONTS.body]: Nunito_400Regular,
  [FONTS.bodySemiBold]: Nunito_600SemiBold,
  [FONTS.bodyBold]: Nunito_700Bold,
};
