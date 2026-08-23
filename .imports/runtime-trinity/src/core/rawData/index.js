// Deliberately NARROW. CjsPerObjectLayouts and CjsPerFrameLayouts export one
// constant per Carbon struct, named after the class that owns it -
// EveTurretSet, EveSpaceObjectDecal, EveLensflare and six more - which collide
// with the actual Eve classes. A blanket `export *` here makes those names
// ambiguous at the root barrel, and `export *` resolves an ambiguity by
// silently exporting NEITHER, so the Eve classes vanish from the public
// surface with no error anywhere.
//
// The catalogs are reached through their own narrow subpaths instead:
// @carbonenginejs/runtime-trinity/perobject and /perframe.
export { RawData, RawDataType, RawDataEncoders } from "./RawData.js";
export { TriPoolAllocator } from "./TriPoolAllocator.js";
export { Tr2PerObjectData } from "./Tr2PerObjectData.js";
