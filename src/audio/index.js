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
 * Subpaths:
 * - `audio`: everything below plus the Web Audio realization;
 * - `audio/trinity`: Carbon graph classes and portable behavior, without
 *   evaluating the backend;
 * - `audio/audioMetadata`: `audioMetadataFromSoundbanksInfo()`;
 * - `audio/library`: library hydration plus audio-library, SFX-program and
 *   music-library validation/installation;
 * - `audio/library-builder`: document construction from decoded values or
 *   raw resources, kept out of ordinary bundles.
 *
 * Every entry is browser-safe: import and construction do no DOM, fetch,
 * Node or device work. `Enable()` is the first point an AudioContext is
 * created; without one, enablement fails and the graph keeps Carbon's
 * null-manager behavior.
 *
 * Realization is strict by default. Wwise behavior the browser cannot
 * reproduce faithfully is either omitted or admitted only through an explicit
 * host policy (see the `CjsAudioMan` constructor). A route the shared bus
 * mixer rejects stays audible on the legacy SFX or music path, with the
 * blocked authored bus stages omitted.
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
