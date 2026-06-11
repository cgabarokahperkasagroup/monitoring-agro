// Deklarasi modul untuk paket polyfill tanpa tipe bawaan (agar tsc lolos).
declare module 'react-native-fetch-api';
declare module 'text-encoding';
declare module 'web-streams-polyfill/ponyfill';
declare module '@azure/core-asynciterator-polyfill';
declare module 'base-64';

declare module 'react-native/Libraries/Utilities/PolyfillFunctions' {
  export function polyfillGlobal(name: string, getValue: () => unknown): void;
}
