# Dropped class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime` global classes under `src/global/dropped`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for donor classes that are written but deliberately not live, each carrying the reason it was dropped.

<!-- class:BlueScriptCallbackStatus -->
## `BlueScriptCallbackStatus`

Retained-only reference shape mirroring Carbon's script-callback result, which carries OK/CALL_ERROR/EXCEPTION and the captured Python exception so a C++ caller can mute or report it; dropped because JavaScript shares one exception mechanism across that boundary and a throwing callback propagates by itself.

- Export: None
- Source: `src/global/dropped/BlueScriptCallbackStatus.js`
- Visibility: Internal
- Kind: Faithful Carbon port
