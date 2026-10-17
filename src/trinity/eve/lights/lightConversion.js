// Source: trinity/trinity/Lights/Tr2Light.cpp (LightData::
//   AsPerPointLightData cpp:37-69, AsPerSpotLightData cpp:71-80)
// Source: trinity/trinity/Tr2LightManager.h (PerLightData h:55-85)
//
// The per-light record CjsLightData.AsPerPointLightData /
// AsPerSpotLightData write (Carbon LightData's own methods, ported onto
// CjsLightData). The record follows the EveSmartLightPointLight convention:
// typed CPU floats, flags unpacked, the light profile carried by reference;
// Carbon's Float_16 narrowing and profileIndex << 4 packing wait on the light
// manager's port. Records are scratch; Tr2LightManager.AddLight copies them,
// as Carbon's copies by value. The light flag bits live on Tr2LightManager
// (Tr2LightManager.FLAG_*), their Carbon owner.
import { vec3 } from "#math/vec3";

/** A fresh per-light record in the EveSmartLightPointLight shape
 * (Tr2LightManager::PerLightData, h:55-85 + the JS-side owner/profile refs). */
export function CreateLightRecord()
{
  return {
    owner: null,
    lightData: null,
    lightProfile: null,
    lightType: 0,
    position: vec3.create(),
    direction: vec3.create(),
    color: vec3.create(),
    radius: 0,
    innerRadius: 0,
    flags: 0,
    outerAngle: 0,
    innerAngle: 0,
    projectionPlaneDistance: 0
  };
}

/** Carbon TriMatrixCopyFrom3x4 (Utilities/MatrixUtils.cpp:81-96): unpacks a
 * 12-float Float4x3 bone (elements[b*4+r], column-stride - skill gotcha 7)
 * into a mat4, leaving the 4th column untouched: gl m[0]=e[0], m[4]=e[1],
 * m[8]=e[2], m[12]=e[3], m[1]=e[4], m[5]=e[5], m[9]=e[6], m[13]=e[7],
 * m[2]=e[8], m[6]=e[9], m[10]=e[10], m[14]=e[11]. `bones` is a flat
 * Float32Array with stride 12; `boneIndex` selects the bone. */
export function MatrixCopyFrom3x4(out, bones, boneIndex)
{
  const base = boneIndex * 12;
  out[0] = bones[base + 0];
  out[4] = bones[base + 1];
  out[8] = bones[base + 2];
  out[12] = bones[base + 3];
  out[1] = bones[base + 4];
  out[5] = bones[base + 5];
  out[9] = bones[base + 6];
  out[13] = bones[base + 7];
  out[2] = bones[base + 8];
  out[6] = bones[base + 9];
  out[10] = bones[base + 10];
  out[14] = bones[base + 11];
  return out;
}
