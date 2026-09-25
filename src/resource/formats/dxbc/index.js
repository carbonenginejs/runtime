/**
 * DXBC format: pure-JavaScript reading of Microsoft DXBC shader containers.
 *
 * Owns container magic/header/total-size and chunk-directory parsing with
 * bounds-checked chunk payloads; the `ISGN`, `ISG1`, `OSGN`, `OSG1`, `OSG5`,
 * `PCSG` and `PSG1` signature layouts; `SHEX`/`SHDR` program headers; and
 * SM4/SM5 opcode, operand, declaration, extension-token and SM5.1
 * binding-range decoding, with structured `DxbcReadError` details (source,
 * offset). It runs in browsers and Node with no native or filesystem
 * dependency.
 *
 * It never lowers to a target language. GLSL emission belongs to the `webgl`
 * format and WGSL emission to the `webgpu` format; both consume these decoded
 * records and this module imports neither. Compiled effect containers belong to
 * the `hlsl` format, which hands DXBC stage bytes here.
 *
 * Strictness: executable instructions must consume exactly their declared
 * token length. Declarations project the payload forms the decoder knows and
 * keep any remaining well-framed words in `tailTokens`. The opcode-name table
 * covers the SM4/SM5 vocabulary for framing only; it does not mean every
 * opcode is lowered by every backend.
 *
 * Output: `emit: "json"` (default) is the stable integration surface: plain
 * data with typed arrays converted to number arrays. `emit: "raw"` returns the
 * internal decoder objects for lowering backends; their classes are not
 * exported and their shape is not a stable interface.
 */
export { CjsDxbcFormat, default } from "./CjsDxbcFormat.js";
