/**
 * Shared binary format infrastructure: the little-endian byte cursor, the
 * growable writer, Carbon's deduplicating blob arena, and the v15 compiled-effect
 * container built from them.
 *
 * This is deliberately separate from the `./formats` subpaths, which expose
 * concrete registerable format classes. Nothing here is a `CjsFormat`; these are
 * the primitives those formats are written with.
 *
 * See `docs/formats/carbon-effect-container.md`.
 */

export * from "./CjsReader.js";
export * from "./CjsFormatError.js";
export * from "./CjsByteReader.js";
export * from "./CjsByteWriter.js";
export * from "./CjsStringTable.js";
export * from "./carbonEffect/index.js";
