// Metro config default Expo. PowerSync + quick-sqlite bekerja dengan config
// standar Expo SDK 52. Tambahkan kustomisasi di sini bila diperlukan.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
