# Class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgl` maintained classes
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for every maintained class.

<!-- class:CjsWebglFormat -->
## `CjsWebglFormat`

CarbonEngineJS-facing format surface for `.cewg` WebGL shader packages, and a DXBC -> GLSL ES 3.00 emitter for the WebGL2 vertex/pixel/map-style-compute stages ccpwgl targets.

- Export: `@carbonenginejs/runtime-resource/formats/webgl`
- Source: `src/CjsWebglFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CewgPackage -->
## `CewgPackage`

Reader for CarbonEngineJS CEWG shader packages emitted by `hlsl2webgl`.

- Export: None
- Source: `src/core/cewg/CewgPackage.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:CewgPackageBuilder -->
## `CewgPackageBuilder`

Builds CarbonEngineJS CEWG shader package bytes.

- Export: None
- Source: `src/core/cewg/CewgPackageBuilder.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:CjsBinaryReader -->
## `CjsBinaryReader`

Minimal little-endian binary reader for the flat CEWG chunk container.

- Export: None
- Source: `src/core/cewg/binary.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:ReflectionBlobStore -->
## `ReflectionBlobStore`

Builds a deterministic deduplicated byte arena for portable reflection.

- Export: None
- Source: `src/core/effectReflectionPackage.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:CjsWebglReadError -->
## `CjsWebglReadError`

Error raised when a CEWG package or a DXBC-to-GLSL emission cannot be completed safely.

- Export: None
- Source: `src/core/errors.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:DxbcGlslEmitter -->
## `DxbcGlslEmitter`

DXBC -> GLSL ES 3.00 emitter for vertex and pixel stages.

- Export: None
- Source: `src/core/glsl/DxbcGlslEmitter.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:DxbcGlslHelperRegistry -->
## `DxbcGlslHelperRegistry`

Registry of GLSL helper functions the emitter can require per shader.

- Export: None
- Source: `src/core/glsl/DxbcGlslHelpers.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:DxbcGlslOperandFormatter -->
## `DxbcGlslOperandFormatter`

Formats decoded DXBC operands as GLSL ES 3.00 expressions and assignments.

- Export: None
- Source: `src/core/glsl/DxbcGlslOperandFormatter.js`
- Visibility: Internal
- Kind: Internal implementation
