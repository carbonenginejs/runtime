# Dropped class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource` classes under `src/resource/dropped`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for retained-only Carbon reference shapes that are never exported or bundled.

<!-- class:CmfVertexReader -->
## `CmfVertexReader`

Retained-only reference shape mirroring Carbon's CMF vertex-element pointer-lookup helper, superseded by the JavaScript CMF format's channel decoding.

- Source: `src/resource/dropped/CmfVertexReader.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:FrameDeleter -->
## `FrameDeleter`

Carbon's unique_ptr frame deleter; dropped with FrameOwner, because GC reclaims frames.

- Source: `src/resource/dropped/FrameDeleter.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:FrameOwner -->
## `FrameOwner`

Carbon's frame-pool owner interface; dropped because GC reclaims frames.

- Source: `src/resource/dropped/FrameOwner.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2AsyncSave -->
## `Tr2AsyncSave`

Retained-only reference shape mirroring Carbon's abstract prepare/save callback base, superseded by promise-based format `Write`/`WriteAsync` operations and resource-level save-status compatibility methods.

- Source: `src/resource/dropped/Tr2AsyncSave.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2CmfContents -->
## `Tr2CmfContents`

Retained-only reference shape mirroring Carbon's native CMF section lifetime and decompression holder, superseded by `CjsCmfFormat`'s bounded section access and typed-array data.

- Source: `src/resource/dropped/Tr2CmfContents.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2LoadPrepareFence -->
## `Tr2LoadPrepareFence`

Retained-only reference shape mirroring Carbon's two-queue load/prepare fence helper, superseded by the snapshot-fence contract owned by `CjsResMan.Wait()`.

- Source: `src/resource/dropped/Tr2LoadPrepareFence.js`
- Visibility: Internal
- Kind: Carbon dropped
