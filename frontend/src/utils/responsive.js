import { Dimensions, PixelRatio, Platform } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Static helpers based on current dimensions
export const getWindowDimensions = () => Dimensions.get('window');

export const scale = (size) => {
  const { width } = Dimensions.get('window');
  return (width / BASE_WIDTH) * size;
};

export const verticalScale = (size) => {
  const { height } = Dimensions.get('window');
  return (height / BASE_HEIGHT) * size;
};

export const moderateScale = (size, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

export const moderateVerticalScale = (size, factor = 0.5) => {
  return size + (verticalScale(size) - size) * factor;
};

export const fontScale = (size, factor = 0.35) => {
  const newSize = size + (scale(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const wp = (percentage) => {
  const { width } = Dimensions.get('window');
  return Math.round((percentage * width) / 100);
};

export const hp = (percentage) => {
  const { height } = Dimensions.get('window');
  return Math.round((percentage * height) / 100);
};

export const isTabletDevice = () => {
  const { width, height } = Dimensions.get('window');
  const aspectRatio = height / width;
  const isLandscape = width > height;
  const effectiveWidth = isLandscape ? height : width;
  return effectiveWidth >= 600 || aspectRatio < 1.6;
};

/**
 * React hook that dynamically reacts to dimension changes (rotation, split-screen, tablet, web resize)
 * and safe area insets.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const isSmallDevice = width < 360;
  const isMediumDevice = width >= 360 && width < 420;
  const isLargeDevice = width >= 420 && width < 600;
  const isTablet = width >= 600 || (height / (width || 1) < 1.5 && width >= 480);

  const dynamicScale = (size) => (width / BASE_WIDTH) * size;
  const dynamicVerticalScale = (size) => (height / BASE_HEIGHT) * size;
  const dynamicModerateScale = (size, factor = 0.5) => size + (dynamicScale(size) - size) * factor;
  const dynamicFontScale = (size, factor = 0.35) =>
    Math.round(PixelRatio.roundToNearestPixel(size + (dynamicScale(size) - size) * factor));

  // Constrains width on tablets and desktop web for cleaner UI
  const maxContentWidth = isTablet ? 640 : width;

  return {
    width,
    height,
    insets,
    isLandscape,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isTablet,
    maxContentWidth,
    scale: dynamicScale,
    verticalScale: dynamicVerticalScale,
    moderateScale: dynamicModerateScale,
    fontScale: dynamicFontScale,
    wp: (pct) => Math.round((pct * width) / 100),
    hp: (pct) => Math.round((pct * height) / 100),
  };
}
