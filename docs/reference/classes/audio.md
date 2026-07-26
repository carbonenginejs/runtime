# Audio class catalog

Status: Evolving
Scope: `@carbonenginejs/tools-browser/audio`
Audience: Browser application authors and maintainers
Summary: Catalogs browser-safe audio-library construction and transport classes.

<!-- class:CjsAudioLibrary -->
## `CjsAudioLibrary`

Immutable, browser-loadable view of one prepared audio-library document.

- Export: `@carbonenginejs/tools-browser/audio`
- Source: `src/audio/CjsAudioLibrary.js`
- Visibility: Public
- Kind: CarbonEngineJS
- Notes: Loads plain objects, JSON text, Blob/File-like values, Response-like
  values, and URLs through injected or global Fetch.

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
