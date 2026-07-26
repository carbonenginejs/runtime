# Audio class catalog

Status: Evolving
Scope: `@carbonenginejs/tools-browser/audio`
Audience: Browser application authors and maintainers
Summary: Catalogs browser-safe audio-library construction and transport classes.

<!-- class:CjsAudioLibrary -->
## `CjsAudioLibrary`

Browser audio-library adapter for construction, loading, and CjsResMan access.

- Export: `@carbonenginejs/tools-browser/audio`
- Source: `src/audio/CjsAudioLibrary.js`
- Visibility: Public
- Kind: CarbonEngineJS
- Notes: Registers configuration before one async initialization permanently
  locks it, loads or builds a prepared document, applies optional enrichment,
  and hides loose, split-API, full-bank, and range ingress from callers.

<!-- class:CjsAudioLibraryBuilder -->
## `CjsAudioLibraryBuilder`

Stateless construction of deterministic audio-library artifacts.

- Export: `@carbonenginejs/tools-browser/audio`
- Source: `src/audio/CjsAudioLibraryBuilder.js`
- Visibility: Public
- Kind: CarbonEngineJS
- Notes: Accepts object or `Map` metadata sections and reads banks only through
  caller-injected capabilities.

## Related documentation

- [Audio-library guide](../../guides/audio-libraries.md)
- [Browser tools API](../api.md)
- Audio resource ownership:
  `@carbonenginejs/runtime-resource/docs/reference/classes/audio.md`
