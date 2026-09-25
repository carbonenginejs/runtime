/**
 * Runtime tools: the file-index family. It reads CCP-style `appfileindex` and
 * `resfileindex` files, diffs them and overlays one on another, and stays in
 * the runtime because tools-core imports it to gather character catalogs.
 *
 * This layer may import only `global/utils` (enforced by layers.json); code
 * that needs resource, trinity or core is not a tool.
 */
export * from "./fileindex/index.js";
