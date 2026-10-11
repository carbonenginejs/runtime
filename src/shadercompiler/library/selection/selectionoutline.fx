// The selection outline: a full-screen pass over the selection mask
// (SelectionMask.fxh). Every pixel outside the mask that has a mask pixel
// within the outline width gets the line, so the line is solid and even all
// around the selected object's visible shape - over whatever borders it -
// with no lines inside it and no gaps where the hull has hard edges. Its
// outer edge fades over one pixel.
//
// The width is OutlineSettings.y in pixels, at most MAX_REACH.

#include "OutlineParameters.fxh"
#include "SelectionParameters.fxh"

// Zero retains equal-resolution behavior for callers without this parameter.
float4 OutlineTargetSize = float4( 0.0, 0.0, 0.0, 0.0 );

// The furthest the search reaches, in pixels: the widest outline drawn.
#define MAX_REACH 8

// The weighted mask coverage that draws the line fully opaque.
#define SOLID_COVERAGE 2.0

// 1 where the selected object is visible, 0 elsewhere.
Texture2D SelectionMask;
#ifdef VISIBLE_SILHOUETTE
Texture2D SelectionSilhouette;
// The visibility mask follows scene TAA jitter; the silhouette is unjittered.
// xy is the visibility lookup offset in mask pixels (screen Y points down).
float4 OutlineVisibilityOffset = float4( 0.0, 0.0, 0.0, 0.0 );
#endif

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
    float2 targetSize = OutlineTargetSize.x > 0.0 && OutlineTargetSize.y > 0.0
        ? OutlineTargetSize.xy : float2( size );
    float2 samplePixel = (float2( pixel ) + 0.5) * float2( size ) / targetSize;
#ifdef VISIBLE_SILHOUETTE
    samplePixel += OutlineVisibilityOffset.xy;
#endif
    int2 maskPixel = int2( samplePixel );
    int2 clamped = clamp( maskPixel, int2( 0, 0 ), size - 1 );
    return dot( SelectionMask.Load( int3( clamped, 0 ) ).rg, SelectionChannel.rg ) > 0.5;
}

#ifdef VISIBLE_SILHOUETTE
bool SilhouetteCovered( int2 pixel, int2 size )
{
    float2 targetSize = OutlineTargetSize.x > 0.0 && OutlineTargetSize.y > 0.0
        ? OutlineTargetSize.xy : float2( size );
    int2 maskPixel = int2( (float2( pixel ) + 0.5) * float2( size ) / targetSize );
    int2 clamped = clamp( maskPixel, int2( 0, 0 ), size - 1 );
    return dot( SelectionSilhouette.Load( int3( clamped, 0 ) ).rg, SelectionChannel.rg ) > 0.5;
}
#endif

float4 SelectionOutlinePS( float4 position : SV_Position ) : SV_Target
{
    uint width;
    uint height;
    SelectionMask.GetDimensions( width, height );
    int2 size = int2( width, height );
    int2 pixel = int2( position.xy );

    // The visible variant draws inward, only on the selected object itself.
    // Its edge comes from the complete silhouette, never an occluder's cutout.
#ifdef VISIBLE_SILHOUETTE
    if( !Covered( pixel, size ) || !SilhouetteCovered( pixel, size ) )
#else
    if( Covered( pixel, size ) )
#endif
    {
        discard;
    }

    // How much of the mask lies within the width, each pixel weighted by
    // distance with a one-pixel soft rim centered on the radius. Centering
    // keeps a one-pixel line visible. Use coverage rather than the distance to the one
    // nearest mask pixel: a single mask pixel flickering at the hull's edge
    // then moves the line's edge by a fraction, not by the whole width.
    float radius = clamp( OutlineSettings.y, 1.0, (float)MAX_REACH );
    int reach = (int)ceil( radius );
    float coverage = 0.0;
    for( int y = -reach; y <= reach; ++y )
    {
        for( int x = -reach; x <= reach; ++x )
        {
#ifdef VISIBLE_SILHOUETTE
            if( !SilhouetteCovered( pixel + int2( x, y ), size ) )
#else
            if( Covered( pixel + int2( x, y ), size ) )
#endif
            {
                coverage += 1.0 - smoothstep( radius - 0.5, radius + 0.5, length( float2( x, y ) ) );
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
