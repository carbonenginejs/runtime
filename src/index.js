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
export { CjsMusicEngine, wwiseIdFromName } from "./CjsMusicEngine.js";
export { CjsSfxEngine } from "./CjsSfxEngine.js";
export { audioMetadataFromSoundbanksInfo } from "./audioMetadata.js";
