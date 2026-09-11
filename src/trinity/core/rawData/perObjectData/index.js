// Carbon's per-object data family, in declaration order: the Trinity base and
// its two generic subclasses first, then the Eve classes that derive straight
// from the base, each owning the payload shape its own producer needs.
//
// See README.md in this folder for the donor map, the ownership patterns, and
// the one divergence the family carries.
export { Tr2PerObjectData } from "./Tr2PerObjectData.js";
export { Tr2PerObjectDataPSBuffer } from "./Tr2PerObjectDataPSBuffer.js";
export { Tr2PerObjectDataStandard } from "./Tr2PerObjectDataStandard.js";
