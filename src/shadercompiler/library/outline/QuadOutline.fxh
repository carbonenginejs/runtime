// The outline for quad ships, drawn as an inverted hull: the ship drawn again
// with each vertex pushed out along its normal and only its back faces kept,
// so only a rim shows around the real hull.
//
// One body serves the effect family; the effects differ only in their vertex
// input, as CCP's quad family does. Define SKINNED before including this for
// the skinned variants, and UNPACKED for hulls with unpacked tangents. The vertex path follows the shipped
// unpackedskinned_quadv5 (graphics/effect.dx11, Depth technique): one bone per
// vertex, BLENDINDICES.x into BoneTransforms from PerObjectVS.boneOffsets.x;
// then worldTransform, then ViewProjectionMat.
//
// Tangents follow CCP's naming: the base name reads packed tangents, one
// float4 of angles in TANGENT0 decoded by UnpackTangentsLegacy; the
// `unpacked` names read NORMAL as a float3.

#ifndef QUADOUTLINE_FXH
#define QUADOUTLINE_FXH

#include "../cbuffers/EveSpaceScenePerFrame.fxh"
#include "../cbuffers/EveSpaceObject.fxh"
#include "OutlineParameters.fxh"
#ifndef UNPACKED
#include "../mesh/Tangents.fxh"
#endif

#ifdef SKINNED
// One bone: a 3x4 matrix, three rows with the translation in w, 48 bytes as
// the shipped shader declares the buffer.
struct BoneTransform
{
    float4 row0;
    float4 row1;
    float4 row2;
};

StructuredBuffer<BoneTransform> BoneTransforms : register( t0 );
#endif

struct QuadOutlineVSInput
{
    float3 position : POSITION;
#ifdef SKINNED
    uint4 blendIndices : BLENDINDICES;
#endif
#ifdef UNPACKED
    float3 normal : NORMAL;
#else
    float4 packedTangent : TANGENT;
#endif
};

float4 QuadOutlineVS( QuadOutlineVSInput input ) : SV_Position
{
    float4 position = float4( input.position, 1.0 );
#ifdef UNPACKED
    float3 normal = input.normal;
#else
    float3 normal;
    float3 tangent;
    float3 bitangent;
    UnpackTangentsLegacy( input.packedTangent, normal, tangent, bitangent );
#endif

#ifdef SKINNED
    BoneTransform bone = BoneTransforms[PerObjectVS.boneOffsets.x + input.blendIndices.x];
    position = float4( dot( bone.row0, position ), dot( bone.row1, position ), dot( bone.row2, position ), 1.0 );
    normal = float3( dot( bone.row0.xyz, normal ), dot( bone.row1.xyz, normal ), dot( bone.row2.xyz, normal ) );
#endif

    float4 world = mul( position, PerObjectVS.worldTransform );
    float3 worldNormal = mul( normal, (float3x3)PerObjectVS.worldTransform );

    float4 clip = mul( world, PerFrameVS.ViewProjectionMat );
    float2 clipNormal = mul( float4( worldNormal, 0.0 ), PerFrameVS.ViewProjectionMat ).xy;

    // Push the vertex out along its normal as seen on screen, by the width in
    // pixels: clip space spans 2 units across the target, and scaling by w
    // keeps the width constant at any distance.
    float normalLength = length( clipNormal );
    if( normalLength > 0.0 )
    {
        clip.xy += clipNormal / normalLength * ( OutlineSettings.y * 2.0 / PerFrameVS.TargetResolution ) * clip.w;
    }
    return clip;
}

float4 QuadOutlinePS() : SV_Target
{
    return float4( OutlineColour.rgb * OutlineSettings.x, OutlineColour.a );
}

technique Main
{
    pass P0
    {
        // Carbon stores `CW` as D3DCULL_CCW (FXAnalyzer.cpp:239-241), the
        // opposite of its opaque default (Tr2EffectStateManager.cpp:29-31),
        // as the shipped Shadow passes do: the hull's front faces are culled
        // and its back faces drawn.
        CullMode = CW;
        ZWriteEnable = false;
        AlphaBlendEnable = true;
        SrcBlend = SRCALPHA;
        DestBlend = INVSRCALPHA;
        VertexShader = compile vs_5_0 QuadOutlineVS();
        PixelShader = compile ps_5_0 QuadOutlinePS();
    }
}

#endif // QUADOUTLINE_FXH
