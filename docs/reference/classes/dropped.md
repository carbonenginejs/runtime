# Dropped class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource` classes under `src/dropped`  
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for retained-only Carbon reference shapes that are never exported or bundled.

<!-- class:CmfVertexReader -->
## `CmfVertexReader`

Retained-only reference shape mirroring Carbon's CMF vertex-element pointer-lookup helper, superseded by the JavaScript CMF format's channel decoding.

- Export: None
- Source: `src/dropped/CmfVertexReader.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:Tr2AsyncSave -->
## `Tr2AsyncSave`

Retained-only reference shape mirroring Carbon's abstract prepare/save callback base, superseded by promise-based format `Write`/`WriteAsync` operations and resource-level save-status compatibility methods.

- Export: None
- Source: `src/dropped/Tr2AsyncSave.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:Tr2CmfContents -->
## `Tr2CmfContents`

Retained-only reference shape mirroring Carbon's native CMF section lifetime and decompression holder, superseded by `CjsCmfFormat`'s bounded section access and typed-array data.

- Export: None
- Source: `src/dropped/Tr2CmfContents.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:Tr2LoadPrepareFence -->
## `Tr2LoadPrepareFence`

Retained-only reference shape mirroring Carbon's two-queue load/prepare fence helper, superseded by the snapshot-fence contract owned by `CjsResMan.Wait()`.

- Export: None
- Source: `src/dropped/Tr2LoadPrepareFence.js`
- Visibility: Internal
- Kind: Faithful Carbon port
