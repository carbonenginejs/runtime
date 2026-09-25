/**
 * Runtime audio: Carbon audio graph plus browser realization.
 *
 * Composition: `CjsAudioMan` is the public root. It installs one complete
 * schema-v2 library document, takes one structural media provider, and
 * composes `CjsAudioSystem`, which owns `AudManager`,
 * `AudStaticDataRepository`, `CjsAudioBackend` (Web Audio) and an optional
 * music engine. Specialized hosts may use `CjsAudioSystem` directly.
 * Format parsing (WEM, BNK, Ogg) belongs to the resource package.
 *
 * How this module works is in README.md in this folder.
 */

// Complete audio-domain entry. The Carbon graph remains independently
// available through ./trinity; this root also exports the lazy WebAudio
// realization. Importing the root must not create an AudioContext or touch DOM
// state even though backend modules are evaluated.
export * from "./trinity/index.js";

// CarbonEngineJS-original realization layer (WebAudio). Importing these does
// NOT create an AudioContext - construction stays headless until Enable().
export { CjsAudioBackend } from "./CjsAudioBackend.js";
export { CjsAudioMan } from "./CjsAudioMan.js";
export { CjsAudioSystem } from "./CjsAudioSystem.js";
export { createAudioUpdateContext } from "./CjsAudioUpdateContext.js";
export { CjsJukebox } from "./CjsJukebox.js";
export { CjsMusicEngine, wwiseIdFromName } from "./CjsMusicEngine.js";
export { CjsSfxEngine } from "./CjsSfxEngine.js";
export { audioMetadataFromSoundbanksInfo } from "./audioMetadata.js";
export { CjsAudioLibrary } from "./library/CjsAudioLibrary.js";
