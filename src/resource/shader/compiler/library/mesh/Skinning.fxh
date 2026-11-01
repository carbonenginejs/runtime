// Skinning as the shipped quad family does it, following unpackedskinned_quadv5
// (graphics/effect.dx11, Depth technique): one bone per vertex,
// BLENDINDICES.x into BoneTransforms from PerObjectVS.boneOffsets.x. Include
// after the per-object block (cbuffers/EveSpaceObject.fxh).

#ifndef SKINNING_FXH
#define SKINNING_FXH

// One bone: a 3x4 matrix, three rows with the translation in w, 48 bytes as
// the shipped shader declares the buffer.
struct BoneTransform
{
    float4 row0;
    float4 row1;
    float4 row2;
};

StructuredBuffer<BoneTransform> BoneTransforms : register( t0 );

// The bone a vertex's first blend index names.
BoneTransform GetBone( uint4 blendIndices )
{
    return BoneTransforms[PerObjectVS.boneOffsets.x + blendIndices.x];
}

// A position through its bone.
float4 SkinPosition( BoneTransform bone, float4 position )
{
    return float4( dot( bone.row0, position ), dot( bone.row1, position ), dot( bone.row2, position ), 1.0 );
}

// A direction through its bone, without the translation.
float3 SkinDirection( BoneTransform bone, float3 direction )
{
    return float3( dot( bone.row0.xyz, direction ), dot( bone.row1.xyz, direction ), dot( bone.row2.xyz, direction ) );
}

#endif // SKINNING_FXH
