# Generated Trinity classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity/generated`
Audience: Runtime authors and maintainers
Summary: Catalogs generator-owned Trinity schema intake and records its actual package visibility.

These classes preserve reviewed Carbon schema identities while their portable
behavior is still generator-owned. Package visibility is recorded from the
actual export graph; a source-level `export class` alone does not make a class
part of the public package API.

<!-- class:EveCloudEditableVolume -->
## `EveCloudEditableVolume`

Holds the editable voxel dimensions, bitmap and texture backing, control balls, and curve sets used to author a cloud volume.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/eve/child/EveCloudEditableVolume.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:EveCloudVolumeTextureParameter -->
## `EveCloudVolumeTextureParameter`

Binds an editable cloud volume to a named effect texture parameter and records whether the effect consumes it.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/eve/child/EveCloudVolumeTextureParameter.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:EveOccluder -->
## `EveOccluder`

Groups sprite occlusion elements that can be displayed as one named EVE scene effect.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/eve/effect/EveOccluder.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:EveStarfield -->
## `EveStarfield`

Defines a procedurally seeded starfield with distance, flashing, effect, and star-count controls.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/eve/effect/EveStarfield.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:EvePendingPickingReadback -->
## `EvePendingPickingReadback`

Carries the coordinates, frame, buffers, decoded data, and debug geometry for a pending asynchronous picking readback.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/eve/scene/EvePendingPickingReadback.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2FontManager -->
## `Tr2FontManager`

Tracks font-loading policy together with the glyph-cache memory budget and occupancy.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/font/Tr2FontManager.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2FontMeasurer -->
## `Tr2FontMeasurer`

Accumulates cursor position, vertical metrics, spacing, limits, and decoration bounds while measuring laid-out text.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/font/Tr2FontMeasurer.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2SBitWrapper -->
## `Tr2SBitWrapper`

Models Carbon's cached font-glyph wrapper, including placement coordinates and buffer-copy entry points.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/font/Tr2SBitWrapper.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2GpuParticleSystem -->
## `Tr2GpuParticleSystem`

Describes the GPU particle pipeline's capacity, visible-count controls, and compute and render effect stages.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/particle/Tr2GpuParticleSystem.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2RaytracingGeometry -->
## `Tr2RaytracingGeometry`

Collects mesh-area, material, transforms, skinning buffers, bindless resources, and acceleration-structure state for ray-traced geometry.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/raytracing/Tr2RaytracingGeometry.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2RaytracingManager -->
## `Tr2RaytracingManager`

Carries shadow-effect, denoiser, enablement, and sun-angle state for Carbon's ray-tracing manager.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/raytracing/Tr2RaytracingManager.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2RaytracingMesh -->
## `Tr2RaytracingMesh`

Tracks one ray-tracing mesh's geometry, transforms, skinning and morph offsets, screen size, and selected LOD.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/raytracing/Tr2RaytracingMesh.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2RaytracingPipelineStateManager -->
## `Tr2RaytracingPipelineStateManager`

Tracks a ray-tracing pipeline descriptor, compiled state, pending name, and dirty-rebuild flag.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/raytracing/Tr2RaytracingPipelineStateManager.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:TriStepRemoteUpdate -->
## `TriStepRemoteUpdate`

Carries the view, projection, viewport, and shared-memory handles for a render step that publishes remote frame updates.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/renderJob/TriStepRemoteUpdate.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2d -->
## `Tr2Sprite2d`

Adds opacity, saturation, texture-sized dimensions, and picking radius to a textured 2D sprite.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2d.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dArc -->
## `Tr2Sprite2dArc`

Defines a filled or outlined 2D arc with angular span, radius, colors, widths, and primary and secondary textures.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dArc.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dContainer -->
## `Tr2Sprite2dContainer`

Defines a pickable 2D sprite container with clipping, depth range, coordinate mode, and optional content caching.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dContainer.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dDisplayList -->
## `Tr2Sprite2dDisplayList`

Caches batched 2D sprite vertices, indices, textures, effect state, transforms, and draw ranges for one owner.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dDisplayList.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dFrame -->
## `Tr2Sprite2dFrame`

Defines a textured frame with corner sizing, corner scaling, center-fill, and offset controls.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dFrame.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dLayer -->
## `Tr2Sprite2dLayer`

Defines a sprite container layer with blend and effect state plus optional background clearing.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dLayer.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dLine -->
## `Tr2Sprite2dLine`

Defines a textured 2D line segment with endpoint positions, colors, widths, and texture offsets.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dLine.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dPickingMask -->
## `Tr2Sprite2dPickingMask`

Defines channel, threshold, edge, and texture-mask constraints used when hit-testing a 2D sprite.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dPickingMask.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dStretch -->
## `Tr2Sprite2dStretch`

Defines a horizontally stretchable textured sprite with independent edge widths, center fill, offset, opacity, and DPI scaling.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dStretch.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dStretchVertical -->
## `Tr2Sprite2dStretchVertical`

Defines a vertically stretchable textured sprite with independent edge heights, center fill, opacity, and saturation.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dStretchVertical.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dTextObject -->
## `Tr2Sprite2dTextObject`

Defines a 2D text sprite's measured extent, primary texture, picking radius, shadow-effect mode, and tooltip flag.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dTextObject.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Sprite2dTexture -->
## `Tr2Sprite2dTexture`

Describes a named 2D texture transform around separate rotation and scaling centers.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2Sprite2dTexture.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2SpriteObject -->
## `Tr2SpriteObject`

Provides shared color, depth, blending, effect, glow, outline, shadow, and render-target state for drawable 2D sprites.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2SpriteObject.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2TexturedSpriteObject -->
## `Tr2TexturedSpriteObject`

Adds primary and secondary texture bindings to the shared 2D sprite render state.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/sprite2d/Tr2TexturedSpriteObject.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2AtlasTexture -->
## `Tr2AtlasTexture`

Describes one named subtexture's resource path, pixel rectangle, and owning atlas dimensions.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2AtlasTexture.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2Denoiser -->
## `Tr2Denoiser`

Carries depth, normal, and plane weights together with radius, step size, and bypass state for spatial denoising.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2Denoiser.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2GpuProfiler -->
## `Tr2GpuProfiler`

Carries nested GPU timing zones, frame fences, messages, and capture state for one profiling owner.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2GpuProfiler.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2GpuStructuredBuffer -->
## `Tr2GpuStructuredBuffer`

Describes the element count, stride, and creation flags of a GPU structured buffer.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2GpuStructuredBuffer.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2GrannyPrimitiveSet -->
## `Tr2GrannyPrimitiveSet`

Associates a primitive set with a Granny resource path and object while controlling solid rendering.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2GrannyPrimitiveSet.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2HostBitmap -->
## `Tr2HostBitmap`

Describes a CPU-resident bitmap's dimensions, format, mip count, image type, and diagnostic name.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2HostBitmap.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2ImpostorManager -->
## `Tr2ImpostorManager`

Carries an impostor atlas, tile dimensions, capture effect, and per-frame update budget.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2ImpostorManager.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2PrimitiveScene -->
## `Tr2PrimitiveScene`

Groups display primitives, positioned text labels, and an optional manipulation tool into one scene.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2PrimitiveScene.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2PrimitiveText -->
## `Tr2PrimitiveText`

Positions a displayable text label with its font and content inside a primitive scene.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2PrimitiveText.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2ReflectionProbe -->
## `Tr2ReflectionProbe`

Carries periodic reflection-capture textures, position locking, resolution, and backlight treatment.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2ReflectionProbe.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2SSSSS -->
## `Tr2SSSSS`

Configures screen-space subsurface scattering width, front-scatter color, scene presence, and enablement.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2SSSSS.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2StreamingBitmapSaver -->
## `Tr2StreamingBitmapSaver`

Models Carbon's incremental bitmap saver through its dimensions, pixel format, current offset, and batch-copy entry points.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2StreamingBitmapSaver.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2TextureArray -->
## `Tr2TextureArray`

Describes a texture array's elements, dimensions, resource usage, upload increment, backing texture, and change callback.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2TextureArray.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2TextureAtlas -->
## `Tr2TextureAtlas`

Carries texture-atlas dimensions, format, mip levels, margins, empty-area painting, and removal-compaction policy.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2TextureAtlas.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2TextureAtlasMan -->
## `Tr2TextureAtlasMan`

Holds the collection of texture atlases exposed through Carbon's atlas allocation service.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2TextureAtlasMan.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2TextureReference -->
## `Tr2TextureReference`

Models Carbon's reference-counted texture holder and its texture-change notification surface.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2TextureReference.js`
- Visibility: Public
- Kind: Carbon generated

<!-- class:Tr2TransientTextureReference -->
## `Tr2TransientTextureReference`

Models Carbon's caller-owned texture pointer wrapper without claiming responsibility for the texture's lifetime.

- Export: `@carbonenginejs/runtime/trinity/generated`
- Source: `src/trinity/generated/trinityCore/Tr2TransientTextureReference.js`
- Visibility: Public
- Kind: Carbon generated
