// Source: trinity/trinityal/Tr2HalHelperStructures.h
//
// The header's six types, one file each, re-exported together so an importer sees
// the same surface a C++ `#include` of the header would give it.
//
// Declaration order is Carbon's, so this file reads as the header's table of
// contents - and a type Carbon declares with no file here is visible as a gap.
export { Tr2SubresourceData } from "./Tr2SubresourceData.js";
export { Tr2Viewport } from "./Tr2Viewport.js";
export { Tr2TextureCoordBox } from "./Tr2TextureCoordBox.js";
export { Crop, Tr2TextureSubresource } from "./Tr2TextureSubresource.js";
export {
  NormalizeSamplerDescription,
  SAMPLER_LOD_UNBOUNDED,
  SamplerDescriptionKey,
  Tr2SamplerDescription
} from "./Tr2SamplerDescription.js";
export { Tr2MsaaDesc } from "./Tr2MsaaDesc.js";
