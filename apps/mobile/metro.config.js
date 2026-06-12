// Metro config Expo + NativeWind. PowerSync + quick-sqlite bekerja dengan
// config standar Expo SDK 52; withNativeWind menambah pipeline CSS (Tailwind).
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
