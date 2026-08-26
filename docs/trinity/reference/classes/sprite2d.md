# Sprite2D classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity`
Audience: Runtime and engine authors
Summary: Catalogs maintained portable Sprite2D state, traversal, and wrapped value helpers.

<!-- class:Tr2Sprite2dContainerBase -->
## `Tr2Sprite2dContainerBase`

Shared Sprite2D container state and child-parent propagation.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dContainerBase.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Sprite2dLineTrace -->
## `Tr2Sprite2dLineTrace`

Stores editable Sprite2D line-strip vertices and validates wrapped append input.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dLineTrace.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Sprite2dPolygon -->
## `Tr2Sprite2dPolygon`

Stores editable Sprite2D polygon vertices and triangles and validates wrapped append input.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dPolygon.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Sprite2dRenderJob -->
## `Tr2Sprite2dRenderJob`

A Sprite2D leaf that executes an authored render job.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dRenderJob.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Sprite2dScene -->
## `Tr2Sprite2dScene`

Owns a 2D sprite tree together with display transforms, clipping, picking, batching limits, background, and render-mode state.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dScene.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Sprite2dTransform -->
## `Tr2Sprite2dTransform`

Applies authored Sprite2D rotation and scaling around configurable centers.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dTransform.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Sprite2dVertex -->
## `Tr2Sprite2dVertex`

Represents one Sprite2D polygon vertex with two validated texture-coordinate channels.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dVertex.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SpriteObjectBase -->
## `Tr2SpriteObjectBase`

Shared portable state and dirty propagation for Sprite2D objects.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2SpriteObjectBase.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Sprite2dClipRect -->
## `Tr2Sprite2dClipRect`

Carries the left, top, right, and bottom bounds of one Sprite2D clipping rectangle.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dClipRect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Sprite2dD3DVertex -->
## `Tr2Sprite2dD3DVertex`

Extends a Sprite2D vertex with the clip, glow, transform, blend, tiling, and outline data consumed by the renderer.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dD3DVertex.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Sprite2dLineTraceVertex -->
## `Tr2Sprite2dLineTraceVertex`

Stores one editable Sprite2D line-trace point's position, color, and optional name.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dLineTraceVertex.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Sprite2dTriangle -->
## `Tr2Sprite2dTriangle`

Stores the three uint16 vertex indices of one Sprite2D polygon triangle.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dTriangle.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Sprite2dVertexBase -->
## `Tr2Sprite2dVertexBase`

Stores a Sprite2D vertex's position, color, and two texture-coordinate channels.

- Export: `@carbonenginejs/runtime/trinity`
- Source: `src/trinity/sprite2d/Tr2Sprite2dVertexBase.js`
- Visibility: Public
- Kind: Carbon
