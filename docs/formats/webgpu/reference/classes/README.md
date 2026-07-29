# Class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgpu` maintained classes
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for every maintained class in the WebGPU format package.

<!-- class:CjsWebgpuFormat -->
## `CjsWebgpuFormat`

CarbonEngineJS-facing format surface for `.cewgpu` WebGPU packages, plus an offline effect-analysis helper built on `format-hlsl` and `format-dxbc`.

- Export: `@carbonenginejs/runtime-resource/formats/webgpu`
- Source: `src/CjsWebgpuFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuReadError -->
## `CjsWebgpuReadError`

Error raised when a CEWGPU package or WebGPU analysis pass cannot be completed safely.

- Export: None
- Source: `src/core/errors.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:CjsBinaryReader -->
## `CjsBinaryReader`

Minimal little-endian binary reader for the flat CEWGPU chunk container.

- Export: None
- Source: `src/core/cewgpu/binary.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:CewgpuPackage -->
## `CewgpuPackage`

Reader for CarbonEngineJS CEWGPU shader packages.

- Export: None
- Source: `src/core/cewgpu/CewgpuPackage.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:CewgpuPackageBuilder -->
## `CewgpuPackageBuilder`

Builds CarbonEngineJS CEWGPU package bytes.

- Export: None
- Source: `src/core/cewgpu/CewgpuPackageBuilder.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:ReflectionBlobStore -->
## `ReflectionBlobStore`

Builds the deterministic deduplicated byte arena for complete source reflection.

- Export: None
- Source: `src/core/effectReflectionPackage.js`
- Visibility: Internal
- Kind: Internal implementation
