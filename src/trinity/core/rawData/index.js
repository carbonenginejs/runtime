// Deliberately NARROW. CjsPerObjectLayouts and CjsPerFrameLayouts export one
// constant per Carbon struct, named after the class that owns it -
// EveTurretSet, EveSpaceObjectDecal, EveLensflare and six more - which collide
// with the actual Eve classes. A blanket `export *` here makes those names
// ambiguous at the root barrel, and `export *` resolves an ambiguity by
// silently exporting NEITHER, so the Eve classes vanish from the public
// surface with no error anywhere.
//
// The catalogs are reached through their own narrow subpaths instead:
// @carbonenginejs/runtime/trinity/perobject and /perframe.
/**
 * Constant-data layout is Trinity's: field names, element counts, encodings
 * and byte offsets. There is one layout for every backend, because every
 * backend declares these buffers as a flat vec4 array and std140's vec4-array
 * stride equals tight C++ packing. A struct that cannot be laid out fails when
 * it is registered, not at draw time.
 *
 * Engine storage (buffer type, ring or arena, binding offset and alignment,
 * upload, lifetime) is the backend's. It may pad between record allocations,
 * never inside one: field order, offsets, encodings and stride are fixed. A
 * consumer that needs another representation transforms after the canonical
 * `RawData`.
 */
export { RawData, RawDataType, RawDataEncoders } from "./RawData.js";
export { TriPoolAllocator } from "./TriPoolAllocator.js";
export * from "./perObjectData/index.js";
