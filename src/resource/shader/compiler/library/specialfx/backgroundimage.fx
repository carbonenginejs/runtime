// A 2D image behind the space scene, placed and scaled over the screen: an
// effect for EveSpaceScene.backgroundEffect (EveSpaceScene_Blue.cpp:77-78), the
// hook Carbon's nebula (res:/graphics/effect/managed/space/specialfx/background.fx)
// uses. Not Carbon: CCP ships no 2D background effect for that pass.
//
// The background pass draws it with Tr2Renderer::DrawCameraSpaceScreenQuad
// (EveSpaceScene.cpp:2104-2114), whose four vertices are the screen's corners
// in view space with texture coordinates 0..1 from the top left
// (Tr2RenderUtils.cpp:53-90). Like the nebula, it disables depth and writes
// none, so depth of field and fog see the far plane behind it.
//
// BackgroundPlacement.xy moves the image's centre from the screen's, in screen
// widths and heights (+x right, +y down); .zw scales it. BackgroundSettings.x
// picks how the image fits the screen before placement: 0 stretches it over
// the screen, 1 covers the screen keeping its aspect, 2 fits inside it keeping
// its aspect. Outside the image the pass shows BackgroundColor.

#include "../cbuffers/EveSpaceScenePerFrame.fxh"

float4 BackgroundPlacement = float4( 0.0, 0.0, 1.0, 1.0 );
float4 BackgroundSettings = float4( 1.0, 0.0, 0.0, 0.0 );
float4 BackgroundColor = float4( 0.0, 0.0, 0.0, 1.0 );
float4 BackgroundTint = float4( 1.0, 1.0, 1.0, 1.0 );

Texture2D BackgroundMap;
SamplerState BackgroundMapSampler
{
    Filter = MIN_MAG_MIP_LINEAR;
    AddressU = CLAMP;
    AddressV = CLAMP;
};

#define FIT_STRETCH 0
#define FIT_COVER 1
#define FIT_CONTAIN 2

struct BackgroundImageVSInput
{
    float4 position : POSITION;
    float2 texCoord : TEXCOORD0;
};

struct BackgroundImageVSOutput
{
    float4 position : SV_Position;
    float2 texCoord : TEXCOORD0;
};

BackgroundImageVSOutput BackgroundImageVS( BackgroundImageVSInput input )
{
    BackgroundImageVSOutput output;
    output.position = mul( input.position, PerFrameVS.ProjectionMat );
    // The camera-space quad expects the shader to push z to w
    // (Tr2RenderUtils.cpp:80), as the nebula's vertex shader does.
    output.position.z = output.position.w;
    output.texCoord = input.texCoord;
    return output;
}

// The image's size on the screen, in screen widths and heights, before
// placement scales it.
float2 FitSize( float2 imageSize, float2 screenSize, int fit )
{
    float imageAspect = imageSize.x / max( imageSize.y, 1.0 );
    float screenAspect = screenSize.x / max( screenSize.y, 1.0 );
    float ratio = imageAspect / screenAspect;
    if( fit == FIT_COVER )
    {
        return ratio > 1.0 ? float2( ratio, 1.0 ) : float2( 1.0, 1.0 / ratio );
    }
    if( fit == FIT_CONTAIN )
    {
        return ratio > 1.0 ? float2( 1.0, 1.0 / ratio ) : float2( ratio, 1.0 );
    }
    return float2( 1.0, 1.0 );
}

float4 BackgroundImagePS( BackgroundImageVSOutput input ) : SV_Target
{
    uint width;
    uint height;
    BackgroundMap.GetDimensions( width, height );

    float2 size = FitSize( float2( width, height ), PerFramePS.ViewportSize, (int)BackgroundSettings.x )
        * BackgroundPlacement.zw;
    float2 uv = (input.texCoord - 0.5 - BackgroundPlacement.xy) / size + 0.5;

    if( any( uv < 0.0 ) || any( uv > 1.0 ) )
    {
        return BackgroundColor;
    }
    return BackgroundMap.Sample( BackgroundMapSampler, uv ) * BackgroundTint;
}

technique Main
{
    pass P0
    {
        ZEnable = false;
        ZWriteEnable = false;
        ZFunc = ALWAYS;
        CullMode = NONE;
        AlphaBlendEnable = false;
        VertexShader = compile vs_5_0 BackgroundImageVS();
        PixelShader = compile ps_5_0 BackgroundImagePS();
    }
}
