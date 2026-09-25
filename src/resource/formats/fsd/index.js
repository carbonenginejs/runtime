/**
 * FSD format: legacy 32-bit Carbon FSD and modern 64-bit cFSD.
 *
 * How this module works is in README.md in this folder.
 */
export { CjsFsdFormat, default } from "./CjsFsdFormat.js";
export { CjsFsd32Format } from "./32/index.js";
export { CjsFsd64Format } from "./64/index.js";
export * from "./64/core/index.js";
