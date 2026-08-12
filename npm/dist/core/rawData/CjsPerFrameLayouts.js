import { Types, IDENTITY, ZERO4, toRawLayout, buildLayouts } from './constantLayout.js';

// Per-frame constant-data layouts.
//
// The twin of CjsPerObjectLayouts, one tier up: these are the buffers bound
// once per frame rather than once per draw. Every EVE shader's global input
// list opens with `PerFrameVS;PerFramePS;` (ParserUtils.cpp:525-533 recognises
// exactly those two names), so nothing can be bound without them.
//
// Same rules as the per-object catalog, for the same reason - Carbon memcpys
// the C++ struct into the buffer, so declaration order IS the byte layout:
//
//   vs      - bound to the vertex stage (Carbon's perFrameVsMask also covers
//             cs/gs/hs/ds; see EveSpaceScene.cpp:824)
//   ps      - bound to the pixel stage
//
// Every matrix here is TRANSPOSED except the two Carbon comments call out:
// `ViewInverseTransposeMat` is stored UNtransposed, because the shader wants
// column_major and the value wanted is already the transpose - so
// transpose(transpose(m)) == m (EveSpaceScene.cpp:3023-3024, 3079-3080). See
// the carbon-math-conventions skill.
//
// There are two families, and they are NOT interchangeable:
//
//   Tr2PerFrame*      - Tr2ConstantBufferFormats.h:53-92, the generic engine
//                       block used by interiors, WoD baking, and primitives.
//   EveSpaceScene*    - EveSpaceScene.h:240-327, the much larger space-scene
//                       block, with shadow cascades and froxel fog.
//
// A shader reads whichever its scene binds; both start at the same register
// (Tr2Renderer::GetPerFrameVSStartRegister), which is why the names collide in
// HLSL but the layouts do not.

/**
 * EveSpaceScene.h:218-223. Carbon declares a `SunData` struct and both
 * space-scene blocks hold it as a member named `Sun` (`:246`, `:314`), so the
 * field is `Sun.DirWorld`. The catalog resolves flat float offsets rather than
 * nested structs, but the NAME keeps the dot: collapsing it to `SunDirWorld`
 * invents an identifier Carbon does not have, and it disagreed with the dotted
 * form `engine-webgpu`'s bounded serializer already uses for the same field —
 * which surfaces as a bare `unknown field` from `RawData.Set` and costs real
 * time to trace.
 *
 * `DirWorld` is stored NEGATED and normalized - shaders work with the
 * direction TO the light (EveSpaceScene.cpp:3039).
 */
const SUN_DATA = Object.freeze({
  "Sun.DirWorld": {
    type: Types.VECTOR3
  },
  "Sun.unused_pad0": {
    type: Types.FLOAT
  },
  "Sun.DiffuseColor": {
    type: Types.COLOR
  }
});

/** Tr2ShadowMap.h:15. */
const SHADOW_FRUSTUM_COUNT = 16;

/** Tr2ConstantBufferFormats.h:53 - the generic per-frame vertex block. */
const Tr2PerFrame = Object.freeze({
  vs: {
    struct: "Tr2PerFrameVSData",
    fields: {
      ViewInverseTransposeMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      sunDirWorld: {
        type: Types.VECTOR4
      },
      sceneFogColor: {
        type: Types.COLOR
      },
      ViewProjectionMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ViewMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ProjectionMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      }
    }
  },
  /** Tr2ConstantBufferFormats.h:73. */
  ps: {
    struct: "Tr2PerFramePSData",
    fields: {
      ViewInverseTransposeMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      sceneAmbientColor: {
        type: Types.COLOR
      },
      sceneFogColor: {
        type: Types.COLOR
      },
      sunDirWorld: {
        type: Types.VECTOR4
      },
      sunDiffuseColor: {
        type: Types.COLOR
      },
      sunSpecularColor: {
        type: Types.COLOR
      },
      maxFogAmount: {
        type: Types.FLOAT
      },
      maxFogDistance: {
        type: Types.FLOAT
      },
      minFogDistance: {
        type: Types.FLOAT
      },
      /** +1 for normal RH culling, -1 for LH culling. */
      cullDirection: {
        type: Types.FLOAT
      },
      ViewProjectionMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      shScale: {
        type: Types.FLOAT
      },
      shadowCount: {
        type: Types.FLOAT
      },
      invShadowSize: {
        type: Types.FLOAT
      },
      radius: {
        type: Types.FLOAT
      },
      /** xy - viewport width/height, zw - viewport offset. */
      viewPort: {
        type: Types.VECTOR4
      },
      ViewProjInverse: {
        type: Types.MATRIX4,
        default: IDENTITY
      }
    }
  }
});

/**
 * Tr2ConstantBufferFormats.h:66 - the two-matrix block the debug renderer
 * binds in place of the full VS one (Tr2InteriorScene.cpp:856).
 */
const Tr2PerFrameDebug = Object.freeze({
  vs: {
    struct: "Tr2PerFrameVSDataDebug",
    fields: {
      ViewInverseTransposeMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ViewProjectionMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      }
    }
  }
});

/**
 * Tr2ConstantBufferFormats.h:10 - one register, bound by the shadow and SSAO
 * depth passes.
 */
const Tr2PerFrameShadow = Object.freeze({
  ps: {
    struct: "Tr2PerFrameShadowPSData",
    fields: {
      /** The SSAO depth pass hijacks this to store zNear. */
      lightRadius: {
        type: Types.FLOAT
      },
      zFar: {
        type: Types.FLOAT
      },
      unused2: {
        type: Types.FLOAT
      },
      unused3: {
        type: Types.FLOAT
      }
    }
  }
});

/**
 * EveSpaceScene.h:300-327 / :240-294 - the space-scene per-frame blocks.
 *
 * Ten matrices lead the vertex block because a space frame needs the current
 * and previous view/projection pair (motion vectors) plus the shadow and
 * env-map transforms.
 */
const EveSpaceScenePerFrame = Object.freeze({
  vs: {
    struct: "EveSpaceScenePerFrameVSData",
    fields: {
      ViewInverseTransposeMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ViewProjectionMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ViewMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ProjectionMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ShadowViewMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ShadowViewProjectionMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      EnvMapRotationMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ViewProjectionLast: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ViewLast: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ProjLast: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      // Sun data reaches the vertex stage too, so lighting that is cheap
      // enough can be done per-vertex rather than per-pixel.
      ...SUN_DATA,
      /** x = fogEnd/range, y = 1/range, z = fogMax. */
      FogFactors: {
        type: Types.VECTOR3
      },
      pad: {
        type: Types.FLOAT
      },
      TargetResolution: {
        type: Types.VECTOR2
      },
      FovXY: {
        type: Types.VECTOR2
      },
      /** Reconstructs clip positions without the viewport adjustment. */
      ViewportAdjustment: {
        type: Types.VECTOR4,
        default: [1, 1, 1, 1]
      },
      Time: {
        type: Types.FLOAT
      },
      Upscaling: {
        type: Types.FLOAT,
        default: [1]
      },
      ViewportSize: {
        type: Types.VECTOR2
      }
    }
  },
  ps: {
    struct: "EveSpaceScenePerFramePSData",
    fields: {
      ViewInverseTransposeMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ViewMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      EnvMapRotationMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      ...SUN_DATA,
      AmbientColor: {
        type: Types.VECTOR3
      },
      ReflectionIntensity: {
        type: Types.FLOAT
      },
      /** rgb = fog colour, a = fogMax. */
      FogColor: {
        type: Types.VECTOR4
      },
      // ViewportOffsetSize
      ViewportOffset: {
        type: Types.VECTOR2
      },
      ViewportSize: {
        type: Types.VECTOR2
      },
      // RenderTargetData
      TargetResolution: {
        type: Types.VECTOR2
      },
      /** Legacy; Carbon always writes 1 (EveSpaceScene.cpp:3138). */
      DepthMapSampleCount: {
        type: Types.FLOAT,
        default: [1]
      },
      Debug: {
        type: Types.FLOAT
      },
      ShadowMapSettings: {
        type: Types.VECTOR4,
        default: [1, 1, 0, 0]
      },
      // ShadowMapSettings2
      ShadowCameraRange: {
        type: Types.VECTOR2,
        default: [1, 0]
      },
      ShadowLightness: {
        type: Types.FLOAT
      },
      ShadowQuality: {
        type: Types.UINT32
      },
      // ProjectionData
      ProjectionToView: {
        type: Types.VECTOR2
      },
      FovXY: {
        type: Types.VECTOR2
      },
      // MiscData
      Time: {
        type: Types.FLOAT
      },
      SceneMipLodBias: {
        type: Types.FLOAT
      },
      Upscaling: {
        type: Types.FLOAT,
        default: [1]
      },
      GammaBrightness: {
        type: Types.FLOAT
      },
      FrameIndex: {
        type: Types.UINT32
      },
      /** 0 if off, 1 if on. */
      Jittering: {
        type: Types.UINT32
      },
      /** For the dynamic-light shadow atlas. */
      InverseShadowMapAtlasSize: {
        type: Types.FLOAT
      },
      ShadowMapAtlasEntryMinSizeLog2: {
        type: Types.UINT32
      },
      // Carbon writes 1000/10000/100000/1000000 every frame
      // (EveSpaceScene.cpp:3196-3199). No catalog default: the four
      // slices differ, and a catalog default is one value repeated.
      VolumetricSlices: {
        type: Types.FLOAT,
        count: 4
      },
      /** x..w = the zFar value of each cascade split. */
      ShadowMapValues: {
        type: Types.VECTOR4,
        count: 4,
        default: ZERO4
      },
      ShadowMatrixVal: {
        type: Types.MATRIX4,
        count: SHADOW_FRUSTUM_COUNT,
        default: IDENTITY
      },
      SplitInfo: {
        type: Types.VECTOR4
      },
      ProjectionInverseMat: {
        type: Types.MATRIX4,
        default: IDENTITY
      },
      CascadeRanges: {
        type: Types.VECTOR4,
        count: 16,
        default: ZERO4
      },
      // Tr2VolumetricsRenderer::FroxelPerFrameData, laid out inline
      // (Tr2VolumetricsRenderer.h:119-135). The renderer fills it.
      FroxelFogColor: {
        type: Types.VECTOR3
      },
      FroxelBackgroundVisibility: {
        type: Types.FLOAT
      },
      FroxelBaseDensity: {
        type: Types.FLOAT
      },
      FroxelMaxDistance: {
        type: Types.FLOAT
      },
      FroxelMaxDistanceVisibility: {
        type: Types.FLOAT
      },
      FroxelEnvironmentIntensity: {
        type: Types.FLOAT
      },
      FroxelEnvironmentG: {
        type: Types.FLOAT
      },
      FroxelPad0: {
        type: Types.FLOAT
      },
      FroxelPad1: {
        type: Types.FLOAT
      },
      FroxelPad2: {
        type: Types.FLOAT
      },
      /** CcpMath::Sphere[2] - xyz centre, w radius. */
      FroxelPlanets: {
        type: Types.VECTOR4,
        count: 2,
        default: ZERO4
      }
    }
  }
});
const GROUPS = Object.freeze({
  Tr2PerFrame,
  Tr2PerFrameDebug,
  Tr2PerFrameShadow,
  EveSpaceScenePerFrame
});

/**
 * Resolved per-frame layouts, keyed by struct name. Offsets are FLOAT offsets
 * from the start of the buffer.
 *
 * Deliberately a sibling of CjsPerObjectLayouts rather than more entries in
 * it: the two tiers have different lifetimes, different owners (scene vs
 * renderable), and an engine binds them to different slots.
 */
class CjsPerFrameLayouts {
  static Types = Types;
  static Groups = GROUPS;

  /** Tr2ShadowMap.h:15 - the cascade count ShadowMatrixVal is sized by. */
  static SHADOW_FRUSTUM_COUNT = SHADOW_FRUSTUM_COUNT;

  /** Resolved layouts by struct name, built once. */
  static #layouts = null;

  /**
   * The layout for one struct name, or null when it is not catalogued. A
   * caller must treat null as "not covered" and fail rather than guess.
   */
  static Get(struct) {
    return CjsPerFrameLayouts.#Resolved().get(struct) ?? null;
  }

  /** Every catalogued struct name. */
  static Names() {
    return [...CjsPerFrameLayouts.#Resolved().keys()];
  }

  /** A layout in the shape RawData consumes. */
  static ToRawLayout(struct) {
    const layout = CjsPerFrameLayouts.Get(struct);
    return layout ? toRawLayout(layout) : null;
  }

  /** The group a struct belongs to, with its stage key, or null. */
  static Find(struct) {
    for (const [group, buffers] of Object.entries(GROUPS)) {
      for (const [key, buffer] of Object.entries(buffers)) {
        if (buffer.struct === struct) {
          return {
            group,
            key,
            buffer
          };
        }
      }
    }
    return null;
  }

  /**
   * The resolved layout map, built once on first use and cached.
   * @returns {Map} struct name -> resolved layout
   */
  static #Resolved() {
    if (!CjsPerFrameLayouts.#layouts) {
      CjsPerFrameLayouts.#layouts = buildLayouts(GROUPS, "CjsPerFrameLayouts");
    }
    return CjsPerFrameLayouts.#layouts;
  }
}

export { CjsPerFrameLayouts, EveSpaceScenePerFrame, Tr2PerFrame, Tr2PerFrameDebug, Tr2PerFrameShadow };
//# sourceMappingURL=CjsPerFrameLayouts.js.map
