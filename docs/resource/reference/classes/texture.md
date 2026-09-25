# Texture class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource` classes under `src/resource/texture`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for the texture-array, texture-pack and procedural texture constructor classes in src/resource/texture.

<!-- class:SolidColorTextureConstructor -->
## `SolidColorTextureConstructor`

Carbon's `dynamic:/color` resource constructor, which builds the 1x1 `TriTextureRes` a `dynamic:/color/r,g,b,a` path names and is registered on a manager through `RegisterSolidColorTexture`.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/SolidColorTextureConstructor.js`
- Visibility: Public
- Kind: Faithful Carbon port
