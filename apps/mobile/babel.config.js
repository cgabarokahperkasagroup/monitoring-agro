module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind v4: jsxImportSource di babel-preset-expo mengaktifkan
    // className via JSX runtime. Preset 'nativewind/babel' tidak dipakai
    // (menyeret react-native-worklets/reanimated v4 yg tak kompatibel RN 0.76).
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    // react-native-reanimated adalah peer wajib engine NativeWind (css-interop).
    // Plugin-nya HARUS berada paling akhir.
    plugins: ['react-native-reanimated/plugin'],
  };
};
