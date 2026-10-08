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

#include "../cbuffers/EveSpaceScenePerFrame.fxh"
#include "../cbuffers/EveSpaceObject.fxh"
#ifdef SKINNED
#include "../mesh/Skinning.fxh"
#endif

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
    return mul( world, PerFrameVS.ViewProjectionMat );
}

float4 SelectionMaskPS() : SV_Target
{
    return float4( 1.0, 1.0, 1.0, 1.0 );
}

technique Main
{
    pass P0
    {
        ZEnable = true;
        ZWriteEnable = false;
        AlphaBlendEnable = false;
        VertexShader = compile vs_5_0 SelectionMaskVS();
        PixelShader = compile ps_5_0 SelectionMaskPS();
    }
}

#endif // SELECTIONMASK_FXH
