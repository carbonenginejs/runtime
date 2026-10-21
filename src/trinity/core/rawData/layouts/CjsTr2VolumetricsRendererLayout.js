import { CjsSchema } from "#schema";
// Per-object constant-buffer layout for `FogPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Types } = CjsConstantLayout;

/** Tr2LightManager::PerLightData is 48 bytes: 12 lanes per light, kept bit-exact as uint32 (contract layout). */
const PER_LIGHT_DATA_LANES = 12;

/** FogPerObjectData's DynamicLights[16] (Tr2VolumetricsRenderer.h:282). */
const MAX_FOG_DYNAMIC_LIGHTS = 16;

/** SHADOW_FRUSTUM_COUNT (Tr2ShadowMap.h:15), the size of ShadowMatrix. */
const SHADOW_FRUSTUM_COUNT = 16;


/**
 * Tr2VolumetricsRenderer.h:226-285 - the froxel fog's compute constants, bound to the compute stage at the per-object
 * VS register (Tr2VolumetricsRenderer.cpp:676), so they sit in the vertex group. Every matrix is written transposed.
 * DynamicLights carries each light's packed PerLightData words; its flag, half-float and shadow-atlas words are bit
 * fields, so the lanes are uint32 and copy without passing through a float. Extinction, LinearizeDepthParams and
 * pad0 are never written by Carbon.
 *
 * Modelled on: Tr2VolumetricsRenderer::FogPerObjectData (trinity/trinity/Tr2VolumetricsRenderer.h:226)
 */
export class CjsTr2VolumetricsRendererLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "FogPerObjectData",
        fields: {
            ResolutionX: { type: Types.UINT32 },
            ResolutionY: { type: Types.UINT32 },
            ResolutionZ: { type: Types.UINT32 },
            NumDynamicLights: { type: Types.UINT32 },

            Jitter: { type: Types.VECTOR3 },
            Far: { type: Types.FLOAT },

            Scattering: { type: Types.VECTOR3 },
            BaseDensity: { type: Types.FLOAT },

            MaxDistanceVisibility: { type: Types.FLOAT },
            LightG: { type: Types.FLOAT },
            EnvironmentIntensity: { type: Types.FLOAT },
            InverseShadowMapAtlasSize: { type: Types.FLOAT },

            Extinction: { type: Types.VECTOR3 },
            ShadowMapAtlasEntryMinSizeLog2: { type: Types.UINT32 },

            InverseViewMatrix: { type: Types.MATRIX4 },

            GodRayNoiseFrequency: { type: Types.FLOAT },
            GodRayNoiseLerp: { type: Types.FLOAT },
            GodRayNoiseAnimation: { type: Types.FLOAT },
            GodRayNoiseIntensity: { type: Types.FLOAT },

            GodRayNoiseMatrix: { type: Types.MATRIX4 },

            FogNoiseOffset: { type: Types.VECTOR3 },
            FogNoiseFrequency: { type: Types.FLOAT },

            FogNoiseLerp: { type: Types.FLOAT },
            FogNoiseIntensity: { type: Types.FLOAT },
            LinearizeDepthParams: { type: Types.VECTOR2 },

            UnprojectParams: { type: Types.VECTOR4 },
            PreviousProjectParams: { type: Types.VECTOR4 },
            ReprojectionMatrix: { type: Types.MATRIX4 },

            SunViewDirection: { type: Types.VECTOR3 },
            SunAngle: { type: Types.FLOAT },

            SunWorldDirection: { type: Types.VECTOR3 },
            pad0: { type: Types.FLOAT },

            SunColor: { type: Types.VECTOR3 },
            LightProfileTextureWidth: { type: Types.FLOAT },

            ShadowMapValues: { type: Types.VECTOR4, count: 4 },
            ShadowMatrix: { type: Types.MATRIX4, count: SHADOW_FRUSTUM_COUNT },
            SplitInfo: { type: Types.VECTOR4 },

            DynamicLights: { type: Types.UINT32, count: MAX_FOG_DYNAMIC_LIGHTS * PER_LIGHT_DATA_LANES },

            /** CcpMath::Sphere[2] - xyz centre, w radius. */
            planets: { type: Types.VECTOR4, count: 2 }
        }
    }
  });

  static PER_LIGHT_DATA_LANES = PER_LIGHT_DATA_LANES;
  static MAX_FOG_DYNAMIC_LIGHTS = MAX_FOG_DYNAMIC_LIGHTS;
  static SHADOW_FRUSTUM_COUNT = SHADOW_FRUSTUM_COUNT;
}

CjsSchema.meta.define(CjsTr2VolumetricsRendererLayout, {"className": "CjsTr2VolumetricsRendererLayout"});
