# Texture class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource` classes under `src/resource/texture`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for the texture-array aggregation and procedural texture constructor classes in src/resource/texture.

<!-- class:CjsTextureArrayRes -->
## `CjsTextureArrayRes`

Mutable runtime aggregate resource for an ordered texture-array request that coalesces per-layer path changes and invalidations so a resource manager or engine scheduler can prepare the corresponding immutable texture-array payload on a later frame.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/CjsTextureArrayRes.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsTextureArrayResParameterProxy -->
## `CjsTextureArrayResParameterProxy`

`CjsTextureArrayRes`-owned parameter facade for one array layer that mirrors the public path API while delegating storage, invalidation, readiness, and adapter ownership to its parent, carrying no shader metadata or backend objects itself.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/CjsTextureArrayResParameterProxy.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:SolidColorTextureConstructor -->
## `SolidColorTextureConstructor`

Carbon's `dynamic:/color` resource constructor, which builds the 1x1 `TriTextureRes` a `dynamic:/color/r,g,b,a` path names and is registered on a manager through `RegisterSolidColorTexture`.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/SolidColorTextureConstructor.js`
- Visibility: Public
- Kind: Faithful Carbon port
