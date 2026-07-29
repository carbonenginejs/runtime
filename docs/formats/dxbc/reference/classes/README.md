# Class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/dxbc` maintained classes
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for every maintained class in the DXBC format package.

<!-- class:CjsDxbcFormat -->
## `CjsDxbcFormat`

CarbonEngineJS-facing DXBC (Direct3D shader bytecode) reader.

- Export: `@carbonenginejs/runtime-resource/formats/dxbc`
- Source: `src/CjsDxbcFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsBinaryReader -->
## `CjsBinaryReader`

Little-endian binary reader with optional shared string-table references.

- Export: None
- Source: `src/carbon/CjsBinaryReader.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:DxbcContainer -->
## `DxbcContainer`

DirectX shader bytecode container reader.

- Export: None
- Source: `src/core/container.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:DxbcInstructionDecoder -->
## `DxbcInstructionDecoder`

SM4/SM5 instruction-stream decoder over a `DxbcShaderProgram` token array.

- Export: None
- Source: `src/core/decoder.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:DxbcReadError -->
## `DxbcReadError`

Error raised when DirectX shader bytecode cannot be decoded safely.

- Export: None
- Source: `src/core/errors.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:DxbcShaderProgram -->
## `DxbcShaderProgram`

DXBC shader program chunk reader for `SHEX`/`SHDR` token streams.

- Export: None
- Source: `src/core/program.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:DxbcSignatureChunk -->
## `DxbcSignatureChunk`

DXBC input/output signature chunk reader for `ISGN`-family chunks.

- Export: None
- Source: `src/core/signature.js`
- Visibility: Internal
- Kind: Internal implementation
