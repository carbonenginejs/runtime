// The selection mask: the selected object drawn flat into its own target, so
// the selection outline (selectionoutline.fx) knows exactly which pixels it
// covers. Depth-tested against the scene and not written, so only the
// object's visible pixels enter the mask, and the outline follows the
// visible shape, as Blender's and Unreal's selection outlines do.
//
// Only the position is read, so the tangent form does not matter; define
// SKINNED before including this for skinned hulls.

#ifndef SELECTIONMASK_FXH
#define SELECTIONMASK_FXH

#include "SelectionParameters.fxh"
#include "../cbuffers/EveSpaceScenePerFrame.fxh"
#include "../cbuffers/EveSpaceObject.fxh"
#ifdef SKINNED
#include "../mesh/Skinning.fxh"
#endif

#ifdef PLANET
// Selection-only conversion from native planetary reverse depth to main depth.
float4 SelectionDepthRemap
<
    bool SasUiVisible = false;
    string SasUiDescription = "Planet depth scale, offset, unused, unused";
> = float4( 1.0, 0.0, 0.0, 0.0 );
#endif

// How far toward the camera the mask is pushed, in reverse-Z depth units: far
// smaller than any gap between the hull and what is in front of it.
#define SELECTION_DEPTH_BIAS 0.00002

struct SelectionMaskVSInput
{
    float3 position : POSITION;
#ifdef SKINNED
    uint4 blendIndices : BLENDINDICES;
#endif
};

float4 SelectionMaskVS( SelectionMaskVSInput input ) : SV_Position
{
    float4 position = float4( input.position, 1.0 );
#ifdef SKINNED
    position = SkinPosition( GetBone( input.blendIndices ), position );
#endif
    float4 world = mul( position, PerObjectVS.worldTransform );
    float4 clip = mul( world, PerFrameVS.ViewProjectionMat );
    // The scene's own pass wrote these surfaces' depth with another shader,
    // so the same pixel can land a hair either side of the test and flicker
    // in and out of the mask. Nudge the mask toward the camera: the scene
    // draws reverse-Z (EveSpaceSceneRenderDriver, SetInvertedDepthTest), so
    // nearer is larger.
    #ifndef PLANET
    clip.z += SELECTION_DEPTH_BIAS * clip.w;
    #endif
    return clip;
}

#ifdef PLANET
struct PlanetMaskOutput
{
    float4 colour : SV_Target;
    float depth : SV_Depth;
};

PlanetMaskOutput SelectionMaskPS(float4 position : SV_Position)
{
    PlanetMaskOutput result;
    result.colour = SelectionChannel;
    // Keep native clip coordinates for distant surfaces. A distant surface
    // beyond main far maps to cleared depth (0); foreground main depth wins.
    // No bias: even a small relative bias admits nearby foreground ships.
    result.depth = saturate(position.z * SelectionDepthRemap.x + SelectionDepthRemap.y);
    return result;
}
#else
float4 SelectionMaskPS() : SV_Target
{
    return SelectionChannel;
}

#endif

technique Main
{
    pass P0
    {
        #ifdef SILHOUETTE
        ZEnable = false;
        #else
        ZEnable = true;
        #endif
        ZWriteEnable = false;
        #ifdef PLANET
        ZFunc = LESSEQUAL;
        #endif
        // Additive UNORM union preserves the other mode and overlapping hulls.
        AlphaBlendEnable = true;
        SrcBlend = ONE;
        DestBlend = ONE;
        VertexShader = compile vs_5_0 SelectionMaskVS();
        PixelShader = compile ps_5_0 SelectionMaskPS();
    }
}

#endif // SELECTIONMASK_FXH
