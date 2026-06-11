// =====================================================================
// Polyfills WAJIB untuk PowerSync di React Native.
// Dimuat paling awal (dari index.js) sebelum modul lain.
// Ref resmi: https://docs.powersync.com/client-sdk-references/react-native-and-expo
// =====================================================================
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import '@azure/core-asynciterator-polyfill';

import { polyfillGlobal } from 'react-native/Libraries/Utilities/PolyfillFunctions';
import { ReadableStream } from 'web-streams-polyfill/ponyfill';
import { TextEncoder, TextDecoder } from 'text-encoding';
import {
  fetch as fetchPolyfill,
  Headers as HeadersPolyfill,
  Request as RequestPolyfill,
  Response as ResponsePolyfill,
} from 'react-native-fetch-api';

polyfillGlobal('ReadableStream', () => ReadableStream);
polyfillGlobal('TextEncoder', () => TextEncoder);
polyfillGlobal('TextDecoder', () => TextDecoder);
polyfillGlobal('Headers', () => HeadersPolyfill);
polyfillGlobal('Request', () => RequestPolyfill);
polyfillGlobal('Response', () => ResponsePolyfill);
// PowerSync butuh streaming fetch (text streaming) untuk sync.
polyfillGlobal(
  'fetch',
  () =>
    (...args: any[]) =>
      fetchPolyfill(args[0], {
        ...args[1],
        reactNative: { textStreaming: true },
      }),
);
