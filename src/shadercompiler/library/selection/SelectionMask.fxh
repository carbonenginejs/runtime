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
    clip.z += SELECTION_DEPTH_BIAS * clip.w;
    return clip;
}

float4 SelectionMaskPS() : SV_Target
{
    return SelectionChannel;
}

technique Main
{
    pass P0
    {
        ZEnable = true;
        ZWriteEnable = false;
        // Additive UNORM union preserves the other mode and overlapping hulls.
        AlphaBlendEnable = true;
        SrcBlend = ONE;
        DestBlend = ONE;
        VertexShader = compile vs_5_0 SelectionMaskVS();
        PixelShader = compile ps_5_0 SelectionMaskPS();
    }
}

#endif // SELECTIONMASK_FXH
