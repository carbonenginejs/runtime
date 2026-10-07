# Runtime shader compiler documentation

Status: Evolving
Scope: `@carbonenginejs/runtime/shadercompiler`
Audience: Users and maintainers compiling Carbon HLSL effects
Summary: A JavaScript port of Carbon's HLSL effect compiler, its WebGPU target, and the shader library compiled with it.

## The effect compiler port

`src/shadercompiler` is a JavaScript port of Carbon's effect compiler,
`trinity/shadercompiler`: the compiler CCP builds `.fx` HLSL effects with. It
runs in the browser and in Node with no native toolchain. Carbon's compiler
parses HLSL into its own syntax tree and writes each target's shading
language from that tree (`EffectCompilerMetal` writes Metal source); the
port's goal is the same front end with WGSL and GLSL writers beside Carbon's.

Shaders keep Carbon's source format: HLSL with `#include`d `.fxh` libraries,
`#pragma permutation` axes, techniques, passes and annotations. Tree shaking
is Carbon's own: `MarkUsedSymbols` marks what an entry point reaches and the
writers skip the rest.

### Status, 2026-10-08

Ported, with tests:

| Carbon source | Here |
|---|---|
| `HLSLScanner.re` | `HLSLScanner.js` |
| `Preprocessor.y` | `Preprocessor.js` |
| `HLSLParser.y` | `HLSLParser.js` |
| `ParserState.h`, `ParserState.cpp` | `ParserState/` |
| `SymbolTable.h`, `SymbolTable.cpp` | `SymbolTable/` |
| `ASTNode.h`, `ASTNode.cpp` | `ASTNode/` |
| `Type.h`, `Type.cpp` | `Type.js` |
| `InlineString.h` | `InlineString.js` |
| `IntrinsicTypes.h` | `IntrinsicTypes.js` |
| `ParserUtils.h`, `ParserUtils.cpp` | `ParserUtils/` |
| `FXAnalyzer.h`, `FXAnalyzer.cpp` | `FXAnalyzer/` |
| `CachingIncludeHandler.h`, `.cpp` | `CachingIncludeHandler/` |
| `CompileMessageQueue.h`, `.cpp` | `CompileMessageQueue.js` |
| `stdafx.h` (non-Windows D3D11 values) | `stdafx.js` |
| `EffectData.h` (the records; saved by the runtime's Carbon effect writer) | `EffectData/` |
| `ShaderCompiler.cpp` (the driver), `Macro.h`, `Platforms.h`, `md5.h`, `ModifiedTime.cpp` (`GetSourceHash`) | `ShaderCompiler/`, `Macro.js`, `Platforms.js`, `MD5.js` |
| `TextureFunctionConversionDX11.h`, `.cpp` | `TextureFunctionConversionDX11/` |
| `EffectCompilerMetal.h`, `.cpp` (without ray tracing), `MSLInclude.h` | `EffectCompilerMetal/` |
| `OutputHLSL.h`, `.cpp` (HLSL and MSL printers) | `OutputHLSL/` |

The Metal compiler is tested with Carbon's own MetalConversionTest sources
(tests 1-3 and 5-15; 4 is ray tracing): every substring and count assertion
passes. Carbon's other check, that Apple's `metal` accepts the output, cannot
run here, so a Metal stage's program is its MSL text.

Not yet ported: the DX11 and DX12 compilers (they call Microsoft's compilers),
the Metal ray-tracing path, and the WebGPU and WebGL2 targets with their WGSL
and GLSL writers.

Every shader embedded in Carbon's own compiler tests parses. Four read-only
reviews of the front end on 2026-10-07 (grammar actions; scanner and
preprocessor; utilities and constant evaluation; parser generator, standards
and tests) found no unfaithful grammar action; their findings were fixed or
registered as Carbon defects.

A header that declares several types is a folder named after it, one file per
type (nested types included), with an `index.js` in declaration order.

### Parse tables

Carbon generates its parsers with LEMON. `src/shadercompiler/lemon` builds LALR(1) tables
from the grammar text at first use (about 45 ms for `HLSLParser.y`) and
resolves conflicts the way lemon does without precedence: the shift wins,
then the earlier rule. Each state's default reduce is chosen as lemon's
`CompressTables` chooses it, and the parser takes it the way `lempar.c`
does, so reduce actions run, and syntax errors are reported, in Carbon's
order.

`scripts/shadercompiler/compare-lemon.mjs` checks a transcribed grammar against Carbon's
`.y` file and against two lemon 3.39.3 reports for it: the uncompressed one
(`lemon -c`) for every action and goto, and the normal one for each state's
default and the states lemon folds away. On 2026-10-07, against Trinity
`2276880b`, both grammars matched rule for rule and state for state (one
conflict in `HLSLParser.y`, the dangling `else`, resolved to shift as lemon
does), and five deliberately corrupted tables were each caught.
`test/shadercompiler/lr1-tables.test.js` needs no lemon or Carbon checkout: it builds
canonical LR(1) tables independently, merges them by core, and requires
CjsFxLemon's tables to match exactly.

### Conventions

- Names are Carbon's. Every overload is its own function, `Name__Variant`
  (`ShowMessage__Location`, `AllocateName__Chars` for a `const char*`,
  `NewNode__Token`); the bare name goes to the overload JavaScript takes
  natively or the shorter one. Carbon's free functions in `ParserUtils`,
  `FXAnalyzer`, `HLSLScanner` and `IntrinsicTypes` keep their names as
  module exports. Free functions that belong to a struct (`MakeInlineString`,
  `IEquals`, `TypeFromTokenType`) are camelCase statics on it
  (`InlineString.makeInlineString`, `Type.typeFromTokenType`).
- Carbon copies `Type`, `ScannerToken`, `InlineString` and similar structs on
  assignment; the port copies where Carbon stores one (`Copy`, `Assign`).
- A C++ out-parameter is an object the function fills: an output `Type`, a
  `{ value }` counter or string, or a result object.
- `InlineString` is a range into a buffer `{ text }`, because the scanner,
  macro expansion and include resolution work on buffer ranges. A
  JavaScript string standing for a `const char*` ends at its first NUL, as
  `strlen` does.
- Buffers are JavaScript strings of UTF-16 code units where Carbon reads
  bytes. Shader source is ASCII, where the two agree; non-ASCII text in a
  string literal or a message differs.
- Where Carbon's behaviour is undefined (a null dereference, a read outside
  a vector, an indeterminate value, a trapping division, a buffer overflow),
  the port throws instead of guessing, and names the defect.
- Includes are read through `CachingIncludeHandler`'s `read` function,
  synchronously; gather the files first (a bundled library map, a resource
  manager cache).

### Carbon defects

The port reproduces Carbon's behaviour, defects included, and cites each one
at its code site as "Carbon known defect CE-nn", from CE-57 to CE-96 (the
organization's `research/carbon-known-defects.md`).
`test/shadercompiler/defects.test.js` reproduces each one except the latent CE-95.

## Shader library

`src/shadercompiler/library/` holds the effects and the `.fxh` headers they include. Includes are
relative to the including file, as in Carbon.

### Constant buffers

`src/shadercompiler/library/cbuffers/` declares Carbon's constant buffers. The engine fills them
by copying Carbon's C++ structs, so the headers are not written by hand:
`scripts/shadercompiler/cbuffer-headers.mjs` generates them from the runtime's layout
catalogs (`@carbonenginejs/runtime/trinity/perframe` and `/perobject`), and
`CjsFxCBufferHeader` lays each member out by HLSL's packing rules. It refuses
any member HLSL would place somewhere other than C++ does.

- Per-frame, one header per family: `Tr2PerFrame`, `Tr2PerFrameDebug`,
  `Tr2PerFrameShadow`, `EveSpaceScenePerFrame`. A shader includes the family
  its scene binds.
- Per-object, one header per renderable: `EveSpaceObject` (ships).

Each header follows Carbon's convention, a struct variable rather than a
`cbuffer`, and Carbon's compiler moves it into its slot by name: `PerFrameVS`
`b1`, `PerFramePS` `b2`, `PerObjectVS` `b3`, `PerObjectPS` `b4`:

```hlsl
#include "../cbuffers/EveSpaceScenePerFrame.fxh"
#include "../cbuffers/EveSpaceObject.fxh"
// ... mul(mul(position, PerObjectVS.worldTransform), PerFrameVS.ViewProjectionMat)
```

On 2026-10-07 the shipped `unpackedskinned_quadv5` was checked against these:
its vertex shader reads `worldTransform` at c0, `boneOffsets` at c26 and
`ViewProjectionMat` at c4 of the per-frame block, where the headers put them.

After changing a catalog, run `node scripts/shadercompiler/cbuffer-headers.mjs`;
`test/shadercompiler/cbuffer-headers.test.js` fails while a header is stale. The test reads
the runtime from `CARBON_RUNTIME_ROOT`, or from `runtime` beside this
package, and skips that check when neither exists.

### Parameters

Every parameter an effect exposes carries the annotations CCP's shipped
effects use (537 effects of build 3579973 surveyed):

| Annotation | Use |
|---|---|
| `bool SasUiVisible = true` | exposes the parameter; the only annotation Carbon reads (`Tr2Effect::PopulateParameters`) |
| `string Group` | the UI section |
| `string SasUiDescription` | what the parameter is |
| `string UIWidget` | `LinearColor`, `Color`, `VectorMixed`, `Slider` |
| `string Component1` to `Component4` | the name of x, y, z and w for `VectorMixed`; `"unused"` when unused |
| `float UIMin`, `UIMax`, `UIStep` | slider ranges |
| `string Validation`, `ValidationMessage` | a check such as `"self.y > 0"`, and its message |

Shared parameters live in one `.fxh` that every effect using them includes.

### Effect names

Effects are named as CCP's are, because the engine asks for them by name: the
base name expects packed tangents, `unpacked` is inserted for meshes with
unpacked tangents, and `skinned_` for animated hulls
(`EveSOFDNA::GetCompleteShaderPath`), together `unpackedskinned_`. A family
shares its pixel shader; the variants differ in their vertex input.

### Outline

`src/shadercompiler/library/outline/` draws the quad ship outline as an inverted hull: the hull
drawn again, pushed out along its normals by a width in pixels, with only its
back faces kept.

- `OutlineParameters.fxh`: `OutlineColour`, `OutlineSettings` (brightness,
  width in pixels, animated, unused) and `OutlineAnimationSettings`
  (reserved), shared by every outline effect.
- `QuadOutline.fxh`: the body, following the shipped quad vertex path.
- `unpacked_quadoutline.fx` and `unpackedskinned_quadoutline.fx`.

`test/shadercompiler/outline.test.js` compiles both, checks the buffers land in Carbon's
slots, the cull state, and that every parameter is fully described.

Not yet: packed and other renderables' outlines, interior lines, bundling the
library as one JSON map for the browser, writing compiled containers, and
checking the layouts against the offsets the compiler computes.

## Tests

`npm test` runs every test. The test that parses Carbon's own compiler test
shaders reads them from a Carbon checkout (`CARBON_SHADERCOMPILER_TESTS`, the
`trinity/shadercompiler/tests` directory; by default a `carbonengine`
checkout beside the organization's) and skips when it is absent.

## Effect JSON format

[carbon-effect-json-format.md](carbon-effect-json-format.md) is the
plan for a readable JSON mirror of the Carbon effect container, with source
program payloads and WebGL2/WebGPU variants; the compiler's output will fill
its program slot. The resource Format and its registration helper belong to
runtime resources. Its first consumers are selection outlines and
technical-line effects; its format names and implementation remain subject to
review.
