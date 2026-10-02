import { blueEnums, EnumRegistrationType } from "../../blue/enums/CjsBlueEnumRegistry.js";
// Source: trinity/trinityal/Tr2RenderContextEnum.h (SwapEffect, PresentInterval, RenderState)

export const SwapEffect = {
    SWAP_EFFECT_DISCARD: 0,
    SWAP_EFFECT_SEQUENTIAL: 1
};

export const PresentInterval = {
    PRESENT_INTERVAL_IMMEDIATE: 0,
    PRESENT_INTERVAL_ONE: 1
};

/** Sparse D3D-derived render state ids. */
export const RenderState = Object.freeze({
    RS_ZENABLE: 7,
    RS_FILLMODE: 8,
    RS_SHADEMODE: 9,
    RS_ZWRITEENABLE: 14,
    RS_ALPHATESTENABLE: 15,
    RS_LASTPIXEL: 16,
    RS_SRCBLEND: 19,
    RS_DESTBLEND: 20,
    RS_CULLMODE: 22,
    RS_ZFUNC: 23,
    RS_ALPHAREF: 24,
    RS_ALPHAFUNC: 25,
    RS_DITHERENABLE: 26,
    RS_ALPHABLENDENABLE: 27,
    RS_FOGENABLE: 28,
    RS_SPECULARENABLE: 29,
    RS_FOGCOLOR: 34,
    RS_FOGTABLEMODE: 35,
    RS_FOGSTART: 36,
    RS_FOGEND: 37,
    RS_FOGDENSITY: 38,
    RS_RANGEFOGENABLE: 48,
    RS_STENCILENABLE: 52,
    RS_STENCILFAIL: 53,
    RS_STENCILZFAIL: 54,
    RS_STENCILPASS: 55,
    RS_STENCILFUNC: 56,
    RS_STENCILREF: 57,
    RS_STENCILMASK: 58,
    RS_STENCILWRITEMASK: 59,
    RS_TEXTUREFACTOR: 60,
    RS_DEPTH_CLIP_ENABLE: 61,
    RS_WRAP0: 128,
    RS_WRAP1: 129,
    RS_WRAP2: 130,
    RS_WRAP3: 131,
    RS_WRAP4: 132,
    RS_WRAP5: 133,
    RS_WRAP6: 134,
    RS_WRAP7: 135,
    RS_CLIPPING: 136,
    RS_LIGHTING: 137,
    RS_AMBIENT: 139,
    RS_FOGVERTEXMODE: 140,
    RS_COLORVERTEX: 141,
    RS_LOCALVIEWER: 142,
    RS_NORMALIZENORMALS: 143,
    RS_DIFFUSEMATERIALSOURCE: 145,
    RS_SPECULARMATERIALSOURCE: 146,
    RS_AMBIENTMATERIALSOURCE: 147,
    RS_EMISSIVEMATERIALSOURCE: 148,
    RS_VERTEXBLEND: 151,
    RS_CLIPPLANEENABLE: 152,
    RS_POINTSIZE: 154,
    RS_POINTSIZE_MIN: 155,
    RS_POINTSPRITEENABLE: 156,
    RS_POINTSCALEENABLE: 157,
    RS_POINTSCALE_A: 158,
    RS_POINTSCALE_B: 159,
    RS_POINTSCALE_C: 160,
    RS_MULTISAMPLEANTIALIAS: 161,
    RS_MULTISAMPLEMASK: 162,
    RS_PATCHEDGESTYLE: 163,
    RS_DEBUGMONITORTOKEN: 165,
    RS_POINTSIZE_MAX: 166,
    RS_INDEXEDVERTEXBLENDENABLE: 167,
    RS_COLORWRITEENABLE: 168,
    RS_TWEENFACTOR: 170,
    RS_BLENDOP: 171,
    RS_POSITIONDEGREE: 172,
    RS_NORMALDEGREE: 173,
    RS_SLOPESCALEDEPTHBIAS: 175,
    RS_ANTIALIASEDLINEENABLE: 176,
    RS_MINTESSELLATIONLEVEL: 178,
    RS_MAXTESSELLATIONLEVEL: 179,
    RS_ADAPTIVETESS_X: 180,
    RS_ADAPTIVETESS_Y: 181,
    RS_ADAPTIVETESS_Z: 182,
    RS_ADAPTIVETESS_W: 183,
    RS_ENABLEADAPTIVETESSELLATION: 184,
    RS_TWOSIDEDSTENCILMODE: 185,
    RS_CCW_STENCILFAIL: 186,
    RS_CCW_STENCILZFAIL: 187,
    RS_CCW_STENCILPASS: 188,
    RS_CCW_STENCILFUNC: 189,
    RS_COLORWRITEENABLE1: 190,
    RS_COLORWRITEENABLE2: 191,
    RS_COLORWRITEENABLE3: 192,
    RS_BLENDFACTOR: 193,
    RS_SRGBWRITEENABLE: 194,
    RS_DEPTHBIAS: 195,
    RS_WRAP8: 198,
    RS_WRAP9: 199,
    RS_WRAP10: 200,
    RS_WRAP11: 201,
    RS_WRAP12: 202,
    RS_WRAP13: 203,
    RS_WRAP14: 204,
    RS_WRAP15: 205,
    RS_SEPARATEALPHABLENDENABLE: 206,
    RS_SRCBLENDALPHA: 207,
    RS_DESTBLENDALPHA: 208,
    RS_BLENDOPALPHA: 209,
    RS_ZBIAS: 47,
    // RS_SCISSORTESTENABLE: 174 — present in ccpwgl (src/global/constant/d3d.js)
    // but not in Carbon's Tr2RenderContextEnum::RenderState. Kept commented in
    // case a consumer needs the D3D9 scissor-test state later.
    RS_MAX_STATE: 210,
    // C enum-width padding rather than vocabulary, kept to mirror the header.
    // Carbon declares 0x7fffffff; this read 0 until 2026-09-01.
    RS_FORCE_DWORD: 0x7fffffff
});

// Definition-site Blue registration preserves Carbon chooser order and exposure.
// Tr2MainWindowState's presentation interval uses Carbon's exposed chooser.
blueEnums.Create("trinity.Tr2RenderContextEnum.PresentInterval", PresentInterval, {
  source: "trinity/trinityal/Tr2RenderContextEnum.h", family: "trinity", line: 391,
  exposedName: "PRESENT_INTERVAL", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2RenderContext_Blue.cpp:277",
  chooser: [
    { name: "IMMEDIATE", value: PresentInterval.PRESENT_INTERVAL_IMMEDIATE, description: "" },
    { name: "ONE", value: PresentInterval.PRESENT_INTERVAL_ONE, description: "" }
  ]
});
// Registered as Carbon registers it (trinity/trinity/Tr2RenderContext_Blue.cpp:271).
blueEnums.Create("trinity.Tr2RenderContextEnum.SwapEffect", SwapEffect, {
  source: "trinity/trinityal/Tr2RenderContextEnum.h", family: "trinity", line: 385,
  exposedName: "SWAP_EFFECT", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2RenderContext_Blue.cpp:265",
  chooser: [
    { name: "DISCARD", value: SwapEffect.SWAP_EFFECT_DISCARD, description: "" },
    { name: "SEQUENTIAL", value: SwapEffect.SWAP_EFFECT_SEQUENTIAL, description: "" }
  ]
});
