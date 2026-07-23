# Texture class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource` classes under `src/texture`  
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for the texture-array aggregation classes in src/texture.

<!-- class:CjsTextureArrayRes -->
## `CjsTextureArrayRes`

Mutable runtime aggregate resource for an ordered texture-array request that coalesces per-layer path changes and invalidations so a resource manager or engine scheduler can prepare the corresponding immutable texture-array payload on a later frame.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/texture/CjsTextureArrayRes.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsTextureParameterProxy -->
## `CjsTextureParameterProxy`

Texture-parameter facade for one array layer that mirrors the public path API while delegating storage, invalidation, readiness, and adapter ownership to its parent `CjsTextureArrayRes`, carrying no shader metadata or backend objects itself.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/texture/CjsTextureParameterProxy.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class
