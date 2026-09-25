// Source: trinity/trinity/Eve/EveEntity.h:9, trinity/trinity/Eve/EveEntity_Blue.cpp:10,
//   trinity/trinity/Resources/Tr2LodResource.h:7,
//   trinity/trinityal/Tr2RenderContextEnum.h:391, trinity/trinity/Tr2RenderContext_Blue.cpp:277-288,
//   trinity/trinity/UI/Tr2MainWindow.h:13-33, trinity/trinity/UI/Tr2MainWindow_Blue.cpp:9-51
// Shared constants stay dependency-free. Consumers import this registration
// module explicitly; importing Blue alone does not load Trinity registrations.
import { blue } from "./blue.js";
import { EnumRegistrationType } from "./enums/CjsBlueEnumRegistry.js";
import { ReflectionMode } from "../consts/graphics/trinityEnums.js";
import { Tr2Lod } from "../consts/trinity.js";
import { PresentInterval, SwapEffect } from "../consts/renderContext/presentation.js";
import { DepthStencilFormat, PixelFormat, TextureType } from "../consts/renderContext/formats.js";
import { Tr2WindowMode, Tr2WindowShowState } from "../consts/renderContext/window.js";
import { RenderingMode, TRIEXTRAPOLATION, TRIOPERATOR } from "../consts/graphics/trinityEnums.js";

blue.enums.RegisterEnum("trinity.EntityComponents.ReflectionMode", ReflectionMode, {
  source: "trinity/trinity/Eve/EveEntity.h", family: "trinity", line: 9,
  exposedName: "ReflectionModeType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/EveEntity_Blue.cpp:10",
  chooser: [
    { name: "Never", value: ReflectionMode.REFLECT_NEVER, description: "Never render into the reflection map" },
    { name: "LowMediumAndHigh", value: ReflectionMode.REFLECT_LOW_MEDIUM_HIGH, description: "Render into the reflection map when reflection settings is set to low, medium or high" },
    { name: "MediumAndHigh", value: ReflectionMode.REFLECT_MEDIUM_AND_HIGH, description: "Render into the reflection map when reflection settings is set to medium or high" },
    { name: "High", value: ReflectionMode.REFLECT_HIGH, description: "Only render into the reflection map when reflection settings is set to high" }
  ]
});

// No native chooser or BLUE_REGISTER_ENUM was found for Tr2Lod in Trinity.
// Register its declared identifiers without inventing Python exposure metadata.
blue.enums.RegisterEnum("trinity.Tr2Lod", Tr2Lod, {
  source: "trinity/trinity/Resources/Tr2LodResource.h", family: "trinity", line: 7
});

// The three enums Tr2MainWindowState's attributes take. Carbon registers each
// by its exposed name with a chooser that omits Tr2WindowMode::_COUNT.
blue.enums.RegisterEnum("trinity.Tr2RenderContextEnum.PresentInterval", PresentInterval, {
  source: "trinity/trinityal/Tr2RenderContextEnum.h", family: "trinity", line: 391,
  exposedName: "PRESENT_INTERVAL", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2RenderContext_Blue.cpp:277",
  chooser: [
    { name: "IMMEDIATE", value: PresentInterval.PRESENT_INTERVAL_IMMEDIATE, description: "" },
    { name: "ONE", value: PresentInterval.PRESENT_INTERVAL_ONE, description: "" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2WindowMode", Tr2WindowMode, {
  source: "trinity/trinity/UI/Tr2MainWindow.h", family: "trinity", line: 13,
  exposedName: "Tr2WindowMode", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/UI/Tr2MainWindow_Blue.cpp:9",
  chooser: [
    { name: "FULL_SCREEN", value: Tr2WindowMode.FULL_SCREEN, description: "" },
    { name: "WINDOWED", value: Tr2WindowMode.WINDOWED, description: "" },
    { name: "FIXED_WINDOW", value: Tr2WindowMode.FIXED_WINDOW, description: "" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2WindowShowState", Tr2WindowShowState, {
  source: "trinity/trinity/UI/Tr2MainWindow.h", family: "trinity", line: 26,
  exposedName: "Tr2WindowShowState", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/UI/Tr2MainWindow_Blue.cpp:22",
  chooser: [
    { name: "NORMAL", value: Tr2WindowShowState.NORMAL, description: "" },
    { name: "MAXIMIZED", value: Tr2WindowShowState.MAXIMIZED, description: "" },
    { name: "MINIMIZED", value: Tr2WindowShowState.MINIMIZED, description: "" }
  ]
});

// Blue's ITriConstants.h enums, shared by audio and Trinity. Neither is
// registered; the choosers are Trinity's (audio's AudConstants.cpp:6 copy of
// TriExtrapolation is identical).
blue.enums.RegisterEnum("blue.TRIEXTRAPOLATION", TRIEXTRAPOLATION, {
  source: "blue/include/ITriConstants.h", family: "blue", line: 33,
  chooserSource: "trinity/trinity/TriConstants.cpp:94",
  chooser: [
    { name: "TRIEXT_NONE", value: TRIEXTRAPOLATION.TRIEXT_NONE, description: "no comment" },
    { name: "TRIEXT_CONSTANT", value: TRIEXTRAPOLATION.TRIEXT_CONSTANT, description: "no comment" },
    { name: "TRIEXT_GRADIENT", value: TRIEXTRAPOLATION.TRIEXT_GRADIENT, description: "no comment" },
    { name: "TRIEXT_CYCLE", value: TRIEXTRAPOLATION.TRIEXT_CYCLE, description: "no comment" }
  ]
});

blue.enums.RegisterEnum("blue.TRIOPERATOR", TRIOPERATOR, {
  source: "blue/include/ITriConstants.h", family: "blue", line: 80,
  chooserSource: "trinity/trinity/TriConstants.cpp:185",
  chooser: [
    { name: "TRIOP_MULTIPLY", value: TRIOPERATOR.TRIOP_MULTIPLY, description: "multiply" },
    { name: "TRIOP_ADD", value: TRIOPERATOR.TRIOP_ADD, description: "add" },
    { name: "TRIOP_AVERAGE", value: TRIOPERATOR.TRIOP_AVERAGE, description: "average" }
  ]
});

// Registered as Carbon registers it (trinity/trinity/Tr2RenderContext_Blue.cpp:271).
blue.enums.RegisterEnum("trinity.Tr2RenderContextEnum.SwapEffect", SwapEffect, {
  source: "trinity/trinityal/Tr2RenderContextEnum.h", family: "trinity", line: 385,
  exposedName: "SWAP_EFFECT", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2RenderContext_Blue.cpp:265",
  chooser: [
    { name: "DISCARD", value: SwapEffect.SWAP_EFFECT_DISCARD, description: "" },
    { name: "SEQUENTIAL", value: SwapEffect.SWAP_EFFECT_SEQUENTIAL, description: "" }
  ]
});

// Registered as Carbon registers it (trinity/trinity/RenderJob/TriStepSetStandardRenderStates_Blue.cpp:23).
blue.enums.RegisterEnum("trinity.Tr2EffectStateManager.RenderingMode", RenderingMode, {
  source: "trinity/trinity/Shader/Tr2EffectStateManager.h", family: "trinity", line: 59,
  exposedName: "RENDERING_MODE", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/RenderJob/TriStepSetStandardRenderStates_Blue.cpp:9",
  chooser: [
    { name: "RM_OPAQUE", value: RenderingMode.RM_OPAQUE, description: "Opaque rendering" },
    { name: "RM_DECAL", value: RenderingMode.RM_DECAL, description: "Decal rendering" },
    { name: "RM_DECAL_NO_DEPTH", value: RenderingMode.RM_DECAL_NO_DEPTH, description: "Decal rendering (Normals Only)" },
    { name: "RM_ALPHA", value: RenderingMode.RM_ALPHA, description: "Alpha-blended rendering" },
    { name: "RM_ALPHA_ADDITIVE", value: RenderingMode.RM_ALPHA_ADDITIVE, description: "Additive rendering" },
    { name: "RM_DEPTH_ONLY", value: RenderingMode.RM_DEPTH_ONLY, description: "Depth-only rendering" },
    { name: "RM_PICKING", value: RenderingMode.RM_PICKING, description: "Rendering for picking" },
    { name: "RM_FULLSCREEN", value: RenderingMode.RM_FULLSCREEN, description: "Full-screen effects (2D) rendering" },
    { name: "RM_SPRITE2D", value: RenderingMode.RM_SPRITE2D, description: "2D sprite rendering" }
  ]
});

// Tr2RenderContext_Blue.cpp builds these two choosers with macros: VAL( x ) is
// { #x, PIXEL_FORMAT_##x, #x } (:139) and DS_ITEM( x ) is
// { #x, DSFMT_##x, #x " depthStencil format" } (:66). The names below are
// Carbon's, in Carbon's order.
const PIXEL_FORMAT_CHOOSER = [
  "UNKNOWN", "R32G32B32A32_TYPELESS", "R32G32B32A32_FLOAT", "R32G32B32A32_UINT", "R32G32B32A32_SINT", "R32G32B32_TYPELESS",
  "R32G32B32_FLOAT", "R32G32B32_UINT", "R32G32B32_SINT", "R16G16B16A16_TYPELESS", "R16G16B16A16_FLOAT", "R16G16B16A16_UNORM",
  "R16G16B16A16_UINT", "R16G16B16A16_SNORM", "R16G16B16A16_SINT", "R32G32_TYPELESS", "R32G32_FLOAT", "R32G32_UINT",
  "R32G32_SINT", "R32G8X24_TYPELESS", "D32_FLOAT_S8X24_UINT", "R32_FLOAT_X8X24_TYPELESS", "X32_TYPELESS_G8X24_UINT", "R10G10B10A2_TYPELESS",
  "R10G10B10A2_UNORM", "R10G10B10A2_UINT", "R11G11B10_FLOAT", "R8G8B8A8_TYPELESS", "R8G8B8A8_UNORM", "R8G8B8A8_UNORM_SRGB",
  "R8G8B8A8_UINT", "R8G8B8A8_SNORM", "R8G8B8A8_SINT", "R16G16_TYPELESS", "R16G16_FLOAT", "R16G16_UNORM",
  "R16G16_UINT", "R16G16_SNORM", "R16G16_SINT", "R32_TYPELESS", "D32_FLOAT", "R32_FLOAT",
  "R32_UINT", "R32_SINT", "R24G8_TYPELESS", "D24_UNORM_S8_UINT", "R24_UNORM_X8_TYPELESS", "X24_TYPELESS_G8_UINT",
  "R8G8_TYPELESS", "R8G8_UNORM", "R8G8_UINT", "R8G8_SNORM", "R8G8_SINT", "R16_TYPELESS",
  "R16_FLOAT", "D16_UNORM", "R16_UNORM", "R16_UINT", "R16_SNORM", "R16_SINT",
  "R8_TYPELESS", "R8_UNORM", "R8_UINT", "R8_SNORM", "R8_SINT", "A8_UNORM",
  "R1_UNORM", "R9G9B9E5_SHAREDEXP", "R8G8_B8G8_UNORM", "G8R8_G8B8_UNORM", "BC1_TYPELESS", "BC1_UNORM",
  "BC1_UNORM_SRGB", "BC2_TYPELESS", "BC2_UNORM", "BC2_UNORM_SRGB", "BC3_TYPELESS", "BC3_UNORM",
  "BC3_UNORM_SRGB", "BC4_TYPELESS", "BC4_UNORM", "BC4_SNORM", "BC5_TYPELESS", "BC5_UNORM",
  "BC5_SNORM", "B5G6R5_UNORM", "B5G5R5A1_UNORM", "B8G8R8A8_UNORM", "B8G8R8X8_UNORM", "R10G10B10_XR_BIAS_A2_UNORM",
  "B8G8R8A8_TYPELESS", "B8G8R8A8_UNORM_SRGB", "B8G8R8X8_TYPELESS", "B8G8R8X8_UNORM_SRGB", "BC6H_TYPELESS", "BC6H_UF16",
  "BC6H_SF16", "BC7_TYPELESS", "BC7_UNORM", "BC7_UNORM_SRGB"
];

// Carbon lists D24FS8 twice (Tr2RenderContext_Blue.cpp:70,82): a quirk, kept.
const DEPTH_STENCIL_FORMAT_CHOOSER = [
  "D24S8", "D24X8", "D24FS8", "D32F", "D32", "READABLE", "AUTO",
  "D16_LOCKABLE", "D15S1", "D24X4S4", "D16", "D32F_LOCKABLE", "D24FS8"
];

// ImageIO declares the type; Trinity registers it (Tr2RenderContext_Blue.cpp:244).
blue.enums.RegisterEnum("trinity.ImageIO.PixelFormat", PixelFormat, {
  source: "imageio/include/PixelFormat.h", family: "trinity", line: 11,
  exposedName: "PIXEL_FORMAT", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2RenderContext_Blue.cpp:141",
  chooser: PIXEL_FORMAT_CHOOSER.map(name => ({ name, value: PixelFormat["PIXEL_FORMAT_" + name], description: name }))
});

// Registered as Carbon registers it (trinity/trinity/Tr2RenderContext_Blue.cpp:88).
blue.enums.RegisterEnum("trinity.Tr2RenderContextEnum.DepthStencilFormat", DepthStencilFormat, {
  source: "trinity/trinityal/Tr2RenderContextEnum.h", family: "trinity", line: 77,
  exposedName: "DEPTH_STENCIL_FORMAT", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2RenderContext_Blue.cpp:65",
  chooser: DEPTH_STENCIL_FORMAT_CHOOSER.map(name => ({ name, value: DepthStencilFormat["DSFMT_" + name], description: name + " depthStencil format" }))
});

// ImageIO declares the type; Trinity registers it (Tr2RenderContext_Blue.cpp:103).
blue.enums.RegisterEnum("trinity.ImageIO.TextureType", TextureType, {
  source: "imageio/include/TextureType.h", family: "trinity", line: 9,
  exposedName: "TEXTURE_TYPE", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2RenderContext_Blue.cpp:94",
  chooser: [
    { name: "TEX_TYPE_1D", value: TextureType.TEX_TYPE_1D, description: "1D texture" },
    { name: "TEX_TYPE_2D", value: TextureType.TEX_TYPE_2D, description: "2D texture" },
    { name: "TEX_TYPE_3D", value: TextureType.TEX_TYPE_3D, description: "3D texture" },
    { name: "TEX_TYPE_CUBE", value: TextureType.TEX_TYPE_CUBE, description: "Cube texture" },
    { name: "TEX_TYPE_INVALID", value: TextureType.TEX_TYPE_INVALID, description: "Invalid texture" }
  ]
});
