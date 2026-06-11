// Entry point. Polyfill HARUS dimuat sebelum apa pun (PowerSync butuh
// fetch/streams/encoding/crypto). Lalu serahkan ke expo-router.
import './lib/polyfills';
import 'expo-router/entry';
