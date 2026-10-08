// Source: mesh/src/cmf/tangents.cpp:415-436 (UnpackTangentsLegacy)
//
// Packed tangent frames as Carbon's legacy compression stores them: one
// float4 of angles in TANGENT0, read by every effect without the `unpacked`
// prefix. PackTangentsLegacy (tangents.cpp:394-411) stores the tangent's and
// bitangent's spherical angles, each remapped from [-pi, pi] to [0, 1], and
// negates both polar angles when the frame is left-handed.
//
// Carbon also has a quaternion compression (PackedTangent, tangents.cpp:302);
// both reach a shader as the same TANGENT usage
// (Tr2VertexDefinitionUtilities.cpp:363-368), and shipped effect names tell
// only packed from unpacked, so the packed effects decode the legacy form.

#ifndef TANGENTS_FXH
#define TANGENTS_FXH

// Carbon's UnpackTangentsLegacy: the frame from its packed angles.
void UnpackTangentsLegacy( float4 t, out float3 normal, out float3 tangent, out float3 bitangent )
{
    const float PI = 3.14159265358979;
    float4 angles = t * ( 2.0 * PI ) - PI;

    float sc0x = sin( angles.x );
    float sc0y = cos( angles.x );
    float sc0z = sin( angles.y );
    float sc0w = cos( angles.y );
    float sc1x = sin( angles.z );
    float sc1y = cos( angles.z );
    float sc1z = sin( angles.w );
    float sc1w = cos( angles.w );

    tangent = float3( sc0y * abs( sc0z ), sc0x * abs( sc0z ), sc0w );
    bitangent = float3( sc1y * abs( sc1z ), sc1x * abs( sc1z ), sc1w );
    normal = cross( bitangent, tangent );

    if( angles.w > 0.0 && angles.y > 0.0 )
    {
        normal = -normal;
    }
}

#endif // TANGENTS_FXH
