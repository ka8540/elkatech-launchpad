/// <reference types="vite/client" />

/** Build-time deployment identifier, injected by vite's `define`. Attached to
 *  issue reports so a bug can be tied to the build it was seen on. */
declare const __APP_VERSION__: string;
