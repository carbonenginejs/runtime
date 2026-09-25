# Dropped class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime` global classes under `src/global/dropped`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for donor classes that are written but deliberately not live, each carrying the reason it was dropped.

<!-- class:BlueResManRegistrar -->
## `BlueResManRegistrar`

Carbon's file-extension registrar; dropped because a module body registers directly.

- Source: `src/global/dropped/BlueResManRegistrar.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:BlueScriptCallbackStatus -->
## `BlueScriptCallbackStatus`

The call outcome Carbon returns from every script callback invocation; dropped because JavaScript propagates the exception itself.

- Source: `src/global/dropped/BlueScriptCallbackStatus.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EnumRegistration -->
## `EnumRegistration`

Records the enum template registration responsibilities absorbed by CjsBlueEnumRegistry.

- Source: `src/global/dropped/EnumRegistration.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EnumTypeRegistration -->
## `EnumTypeRegistration`

Records the static enum registrar absorbed by CjsBlueEnumRegistry.RegisterEnum.

- Source: `src/global/dropped/EnumTypeRegistration.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:PyBlueEnumObject -->
## `PyBlueEnumObject`

Records the Python BlueEnum wrapper absorbed by CjsBlueEnumRegistry and plain enum objects.

- Source: `src/global/dropped/PyBlueEnumObject.js`
- Visibility: Internal
- Kind: Carbon dropped
