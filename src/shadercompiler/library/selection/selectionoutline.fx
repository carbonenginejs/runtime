// The selection outline: a full-screen pass over the selection mask
// (SelectionMask.fxh). Every pixel outside the mask that has a mask pixel
// within the outline width gets the line, so the line is solid and even all
// around the selected object's visible shape - over whatever borders it -
// with no lines inside it and no gaps where the hull has hard edges. Its
// outer edge fades over one pixel.
//
// The width is OutlineSettings.y in pixels, at most MAX_REACH.

#include "OutlineParameters.fxh"

// The furthest the search reaches, in pixels: the widest outline drawn.
#define MAX_REACH 8

// The weighted mask coverage that draws the line fully opaque.
#define SOLID_COVERAGE 2.0

// 1 where the selected object is visible, 0 elsewhere.
Texture2D SelectionMask;

// Carbon's screen quad (Tr2Blitter, Tr2RenderUtils SetupScreenQuad): four
// vertices already in clip space, with texture coordinates this pass does
// not need, as it reads the mask by pixel.
struct SelectionOutlineVSInput
{
    float4 position : POSITION;
    float2 texCoord : TEXCOORD0;
};

float4 SelectionOutlineVS( SelectionOutlineVSInput input ) : SV_Position
{
    return input.position;
}

// Whether the mask covers a pixel, clamped to the target.
bool Covered( int2 pixel, int2 size )
{
    int2 clamped = clamp( pixel, int2( 0, 0 ), size - 1 );
    return SelectionMask.Load( int3( clamped, 0 ) ).r > 0.5;
}

float4 SelectionOutlinePS( float4 position : SV_Position ) : SV_Target
{
    uint width;
    uint height;
    SelectionMask.GetDimensions( width, height );
    int2 size = int2( width, height );
    int2 pixel = int2( position.xy );

    if( Covered( pixel, size ) )
    {
        discard;
    }

    // How much of the mask lies within the width, each pixel weighted by
    // distance with a one-pixel soft rim, rather than the distance to the one
    // nearest mask pixel: a single mask pixel flickering at the hull's edge
    // then moves the line's edge by a fraction, not by the whole width.
    float radius = clamp( OutlineSettings.y, 1.0, (float)MAX_REACH );
    int reach = (int)ceil( radius );
    float coverage = 0.0;
    for( int y = -reach; y <= reach; ++y )
    {
        for( int x = -reach; x <= reach; ++x )
        {
            if( Covered( pixel + int2( x, y ), size ) )
            {
                coverage += 1.0 - smoothstep( radius - 1.0, radius, length( float2( x, y ) ) );
            }
        }
    }

    // A straight edge within the width covers at least SOLID_COVERAGE weighted
    // pixels, so the line is solid up to about one pixel short of the width
    // and fades over the last.
    float alpha = saturate( coverage / SOLID_COVERAGE );
    if( alpha <= 0.0 )
    {
        discard;
    }
    return float4( OutlineColour.rgb * OutlineSettings.x, OutlineColour.a * alpha );
}

technique Main
{
    pass P0
    {
        ZEnable = false;
        ZWriteEnable = false;
        CullMode = NONE;
        AlphaBlendEnable = true;
        SrcBlend = SRCALPHA;
        DestBlend = INVSRCALPHA;
        VertexShader = compile vs_5_0 SelectionOutlineVS();
        PixelShader = compile ps_5_0 SelectionOutlinePS();
    }
}
