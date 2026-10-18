// Source: trinity/trinity/Tr2LightManager.h + Tr2LightManager.cpp
//
// The local-light manager: collects per-light records from every
// ITr2LightOwner during the scene gather, culls and premultiplies them,
// selects the volumetric set, packs the light buffer, and uploads it. The
// per-tile light lists are built on the GPU by computelightlists
// (DoUpdateLists); LightBuffer and LightIndexBuffer are the globals the
// shaders read. The shadow atlas texture and the raytraced path are not made.
//
// SHIPPING BEHAVIOUR PIN: Carbon ships with g_useDynamicLightsShadows =
// false (cpp:21-22, a TRI_REGISTER_SETTING - runtime-mutable, hence the
// static below rather than a constant). With it false, ResolveLightData
// returns after the volumetric pass (cpp:568-571) and AddLight always
// strips FLAG_CASTS_SHADOWS (cpp:359-365). The caster/atlas CPU half IS
// ported (settings derivation, guillotine packer, five-pass fit, packed
// 10-bit offsets) and sits behind the same setting; only its GPU
// realization (the pooled D32 atlas texture, cpp:703-706) stays the
// abstraction layer's.
//
// Carbon's thread-local gather vectors (safe under Tr2ParallelFor,
// EveSpaceScene.cpp:1410) collapse to one array: the JS gather is
// sequential. The file-static singleton is getOrCreateInstance; a manager
// can still be constructed directly for CPU-only use and tests.
//
// The packing below follows Carbon's PerLightData layout, packed flag word,
// premultiply and fade band.

import { CjsSchema, meta, type, blue } from "#schema";
import { num } from "#math/num";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { PixelFormat, ShaderType } from "#consts/render-context";
import { ShadowQuality } from "../../generated/trinityCore/enums.js";
import { Tr2TextureArray } from "../Tr2TextureArray/index.js";
import { Tr2GpuBuffer } from "../device/Tr2GpuBuffer.js";
import { Tr2GpuStructuredBuffer } from "../device/Tr2GpuStructuredBuffer.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2Renderer, PER_FRAME_PS } from "../Tr2Renderer.js";
import { Tr2RenderUtils } from "../Tr2RenderUtils.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Succeeded, Tr2ConstantBufferAL, Tr2ConstantUsageAL } from "#trinityal";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";

// Tr2LightManager.cpp:30-48 - copied verbatim; the buffer sizes are the ABI
// the AL uploads against.
const LIGHT_BUFFER_SIZE = 1024;
const INDEX_BUFFER_SIZE = 8 * 1024 * 1024;
const CUTOFF_PIXEL_SIZE = 7;
const FADE_SIZE = 5;
const MAX_NUM_VOLUMETRIC_LIGHTS = 16;
const MAX_NUM_SHADOWCASTING_LIGHTS = 16;
const HIGH_QUALITY_ATLAS_SIZE_LOG2 = 14;
const HIGH_QUALITY_ATLAS_ENTRY_MAX_SIZE = 1 << 13;
const INFINITE_SIZE_CLAMP = 1 << 14; // 1 << HIGH_QUALITY_ATLAS_SIZE_LOG2
const FLOATS_PER_LIGHT = 12; // 48 bytes / 3 RGBA32 texels
const BYTES_PER_LIGHT = FLOATS_PER_LIGHT * 4;
// Tr2LightManager.cpp:39-40 - the light-list tiles, 16x16 pixels.
const TILE_WIDTH = 16;
const TILE_HEIGHT = 16;

// PerFrameData (Tr2LightManager.cpp:50-64), in 32-bit words: viewInverse and
// projInverse (transposed), cameraPos and a pad, then width, height, tilesX,
// tilesY, lightCount, indexBufferSize and two pads. 176 bytes.
const PER_FRAME_VIEW_INVERSE = 0;
const PER_FRAME_PROJ_INVERSE = 16;
const PER_FRAME_CAMERA_POS = 32;
const PER_FRAME_WIDTH = 36;
const PER_FRAME_HEIGHT = 37;
const PER_FRAME_TILES_X = 38;
const PER_FRAME_TILES_Y = 39;
const PER_FRAME_LIGHT_COUNT = 40;
const PER_FRAME_INDEX_BUFFER_SIZE = 41;
const PER_FRAME_WORDS = 44;

/** CCP_ALIGN: round up to a power-of-two alignment. */
function align(value, alignment)
{
  return (value + alignment - 1) & ~(alignment - 1);
}

/**
 * Carbon's anonymous-namespace CalculateShadowMapAtlasSettings (cpp:92-122).
 *
 * Ported branch for branch, including the SHADOW_RAYTRACED quirk: it zeroes
 * with SHADOW_DISABLED but then re-enters the != DISABLED block, so
 * `entryMinSizeLog2 = 0 - 10` wraps unsigned (4294967286) and
 * `1 << entryMinSizeLog2` shifts by that count. MSVC x86 masks the shift
 * count by 31 and SO DOES JavaScript's << - writing the arithmetic plainly
 * reproduces Carbon's shipping behaviour exactly (entryMinSize 1<<22,
 * entryMaxSize 8192 >> 14 = 0).
 *
 * @param {number} shadowQuality ShadowQuality ordinal.
 * @returns {object} ShadowMapAtlasSettings (actualTextureSize starts 0).
 */
function calculateShadowMapAtlasSettings(shadowQuality)
{
  const settings = {
    actualTextureSize: 0,
    sizeLog2: 0,
    size: 0,
    entryMinSizeLog2: 0,
    entryMinSize: 0,
    entryInverseScaleFactorLog2: 0,
    entryMaxSize: 0
  };
  switch (shadowQuality)
  {
    case ShadowQuality.SHADOW_DISABLED:
    case ShadowQuality.SHADOW_RAYTRACED:
      break;
    case ShadowQuality.SHADOW_LOW:
      settings.sizeLog2 = HIGH_QUALITY_ATLAS_SIZE_LOG2 - 2;
      break;
    case ShadowQuality.SHADOW_HIGH:
      settings.sizeLog2 = HIGH_QUALITY_ATLAS_SIZE_LOG2;
      break;
  }
  if (shadowQuality !== ShadowQuality.SHADOW_DISABLED)
  {
    settings.size = 1 << settings.sizeLog2;
    settings.entryMinSizeLog2 = (settings.sizeLog2 - 10) >>> 0;
    settings.entryMinSize = 1 << settings.entryMinSizeLog2;
    settings.entryInverseScaleFactorLog2 = HIGH_QUALITY_ATLAS_SIZE_LOG2 - settings.sizeLog2;
    settings.entryMaxSize = HIGH_QUALITY_ATLAS_ENTRY_MAX_SIZE >> settings.entryInverseScaleFactorLog2;
  }
  return settings;
}

// Carbon packs these halves through Float_16(...) (Tr2LightManager.cpp:297,
// :328-329), which rounds to nearest. num.toCarbonHalfFloat is the runtime's Carbon-specific
// half codec and rounds identically for every in-range value; an earlier
// file-local encoder here TRUNCATED, a 1-ulp divergence from Carbon,
// removed 2026-09-08.
const toHalf = num.toCarbonHalfFloat;

/** Owns the frame's local-light records, their selection, and the packed light-buffer bytes the abstraction layer uploads. */
@blue.define("Tr2LightManager")
export class Tr2LightManager
{

  // Carbon m_lightData after the TLS flatten: the frame's accepted records,
  // plain-object copies (every producer reuses a static scratch record, so
  // AddLight copies by value exactly as std::vector::push_back does).
  @type.array({ kind: "rawStruct", className: "Tr2LightManager::PerLightData" })
  _records = [];

  // Carbon m_volumetricLights / m_shadowCastingLights: indices into _records.
  @type.array("uint32")
  _volumetricLights = [];

  @type.array("uint32")
  _shadowCastingLights = [];

  // Carbon m_frustum, by reference (SetFrustum copies by value in C++; the
  // stamped frame frustum is not mutated during the gather, so a reference
  // carries the same guarantee here).
  _frustum = null;

  // Carbon m_adjustedCutoff (cpp:249-252).
  @type.float32
  _adjustedCutoff = CUTOFF_PIXEL_SIZE;

  // Carbon m_currentSpaceSceneShadowQuality (h:197).
  @type.int32
  _currentSpaceSceneShadowQuality = ShadowQuality.SHADOW_DISABLED;

  // Carbon nextFrameShadowQuality (h:196) - a bitmask collecting every
  // scene's requested quality during the current frame.
  @type.uint32
  _nextFrameShadowQuality = 0;

  // Carbon m_currentFrameCounter (h:198; ctor sets -1, cpp:164).
  _currentFrameCounter = -1;

  // Carbon's anonymous m_ShadowMap block (h:200-205): the atlas settings,
  // the guillotine node tree, and the quality the atlas was last sized for.
  _shadowMap = {
    atlasSettings: calculateShadowMapAtlasSettings(ShadowQuality.SHADOW_DISABLED),
    atlasNodes: [],
    qualityUsedByAtlas: ShadowQuality.SHADOW_DISABLED
  };

  // The packed PerLightData buffer (contract: 48 bytes / 3 RGBA32 texels per
  // light), built by ResolveLightData, uploaded by the AL.
  @type.float32Array
  _packed = new Float32Array(LIGHT_BUFFER_SIZE * FLOATS_PER_LIGHT);

  @type.uint32Array
  _packedBits = new Uint32Array(this._packed.buffer);

  _packedCount = 0;

  // Non-Carbon: bumped by ResolveLightData so the AL can skip re-uploads.
  _revision = 0;

  // The light flag bits: Carbon's `static const uint16_t` members
  // (Tr2LightManager.h:100-105), and the one JS home of these values. A light's
  // `flags` member reports the AFFECTS_* pair through the Blue chooser
  // `trinity.Tr2LightFlags` (Tr2Light.js, Tr2Light_Blue.cpp:16-21).

  /** Carbon `FLAG_AFFECTS_SURFACES` (Tr2LightManager.h:100). */
  static FLAG_AFFECTS_SURFACES = 1;

  /** Carbon `FLAG_AFFECTS_PARTICLES` (Tr2LightManager.h:101). */
  static FLAG_AFFECTS_PARTICLES = 1 << 1;

  /** Carbon `FLAG_CASTS_SHADOWS` (Tr2LightManager.h:102). */
  static FLAG_CASTS_SHADOWS = 1 << 2;

  /** Carbon `FLAG_IS_VOLUMETRIC` (Tr2LightManager.h:103). */
  static FLAG_IS_VOLUMETRIC = 1 << 3;

  /** Carbon `FLAG_DEFAULT = FLAG_AFFECTS_SURFACES` (Tr2LightManager.h:105). */
  static FLAG_DEFAULT = Tr2LightManager.FLAG_AFFECTS_SURFACES;

  /** The variable-store names the AL binds the packed buffers under
   * (Tr2LightManager.h:46-47; both isAutoregister). The NAMES are Trinity's
   * contract; the variables are the AL's to create. */
  static LIGHT_BUFFER_NAME = "LightBuffer";

  static LIGHT_INDEX_BUFFER_NAME = "LightIndexBuffer";

  /**
   * Carbon g_useDynamicLightsShadows (cpp:21-22) - a TRI_REGISTER_SETTING,
   * i.e. a runtime-mutable setting rather than a compile constant, shipped
   * FALSE. The whole shadow-caster/atlas half sits behind it; flipping it
   * exercises the ported path (the tests do), and shipping behaviour is
   * unchanged while it stays false.
   */
  @meta.setting("useDynamicLightsShadows")
  static useDynamicLightsShadows = false;

  /** The atlas-settings derivation, exposed for tests (Carbon cpp:92-122). */
  static calculateShadowMapAtlasSettings = calculateShadowMapAtlasSettings;

  /**
   * Carbon Tr2LightManager::AreLightFlagsValid (cpp:677-680): a light must
   * affect surfaces or particles to exist at all.
   */
  @blue.method
  @meta.implemented
  static areLightFlagsValid(flags)
  {
    return (flags & (Tr2LightManager.FLAG_AFFECTS_SURFACES | Tr2LightManager.FLAG_AFFECTS_PARTICLES)) !== 0;
  }

  /**
   * Carbon SetShadowQuality (cpp:262-295), the full body: record the
   * scene's quality, collapse the previous frame's quality bitmask into
   * qualityUsedByAtlas on a frame change (HIGH beats LOW beats DISABLED),
   * and recompute the atlas settings for min(requested, atlas quality)
   * with actualTextureSize taken from the atlas quality - multiple scenes
   * may request different qualities in one frame and the texture must fit
   * the largest.
   */
  @blue.method
  @meta.implemented
  SetShadowQuality(quality, frameCounter = 0)
  {
    const shadowQuality = Number(quality) || 0;
    this._currentSpaceSceneShadowQuality = shadowQuality;

    if (this._currentFrameCounter !== frameCounter)
    {
      if (!Tr2LightManager.useDynamicLightsShadows)
      {
        this._nextFrameShadowQuality = 0;
      }

      if (this._nextFrameShadowQuality & (1 << ShadowQuality.SHADOW_HIGH))
      {
        this._shadowMap.qualityUsedByAtlas = ShadowQuality.SHADOW_HIGH;
      }
      else if (this._nextFrameShadowQuality & (1 << ShadowQuality.SHADOW_LOW))
      {
        this._shadowMap.qualityUsedByAtlas = ShadowQuality.SHADOW_LOW;
      }
      else
      {
        this._shadowMap.qualityUsedByAtlas = ShadowQuality.SHADOW_DISABLED;
      }
      this._nextFrameShadowQuality = 1 << shadowQuality;
      this._currentFrameCounter = frameCounter;
    }

    this._nextFrameShadowQuality |= 1 << shadowQuality;

    const clamped = Math.min(shadowQuality, this._shadowMap.qualityUsedByAtlas);
    this._shadowMap.atlasSettings = calculateShadowMapAtlasSettings(clamped);
    this._shadowMap.atlasSettings.actualTextureSize =
      calculateShadowMapAtlasSettings(this._shadowMap.qualityUsedByAtlas).size;
  }

  /** Carbon GetShadowMapAtlasSettings (cpp:708-711). */
  @blue.method
  @meta.implemented
  GetShadowMapAtlasSettings()
  {
    return this._shadowMap.atlasSettings;
  }

  /**
   * Carbon GetUnpackedShadowMapData (cpp:810-815): the packed 10-bit
   * offsets/scale back into texels via the entry-min-size shift.
   *
   * @param {object} record A light record carrying the packed fields.
   * @param {object} [out] Receives scale/offsetX/offsetY.
   * @returns {object} out
   */
  @blue.method
  @meta.implemented
  GetUnpackedShadowMapData(record, out = {})
  {
    const shift = this._shadowMap.atlasSettings.entryMinSizeLog2;
    out.shadowMapScale = (record.shadowMapScale ?? 0) << shift;
    out.shadowMapOffsetX = (record.shadowMapOffsetX ?? 0) << shift;
    out.shadowMapOffsetY = (record.shadowMapOffsetY ?? 0) << shift;
    return out;
  }

  /**
   * Carbon Clear (cpp:220-242): re-points the light-buffer globals, clears
   * the light indices, drops the frame's records and selections, and resets
   * the atlas to one empty root node.
   *
   * Without a render context (a CPU-only caller) the index clear is skipped;
   * there is no buffer to clear then.
   */
  @blue.method
  @meta.implemented
  Clear(renderContext = null)
  {
    this.SetVariableStore();
    if (renderContext) this.ClearLightIndices(renderContext);

    this._records.length = 0;
    this._volumetricLights.length = 0;
    this._shadowCastingLights.length = 0;

    const size = this._shadowMap.atlasSettings.size;
    this._shadowMap.atlasNodes.length = 0;
    this._shadowMap.atlasNodes.push({ children: [ -1, -1 ], lightIndex: -1, x: 0, y: 0, width: size, height: size });
  }

  /** Carbon SetFrustum (cpp:244-247). */
  @blue.method
  @meta.implemented
  SetFrustum(frustum)
  {
    this._frustum = frustum ?? null;
  }

  /** Carbon AdjustLightCutoff (cpp:249-252): the cull threshold is 7px * lodFactor. */
  @blue.method
  @meta.implemented
  AdjustLightCutoff(lodFactor)
  {
    this._adjustedCutoff = CUTOFF_PIXEL_SIZE * (Number(lodFactor) || 0);
  }

  /**
   * Carbon AddPointLight (cpp:297-332): authors a record from scratch, in
   * Carbon's exact order - flags gate, brightness gate, frustum cull, pixel
   * cutoff, premultiply+fade, defaults for everything a caller cannot
   * supply. The direction default is (1,0,0), never zero - a zero direction
   * is a legal bit pattern the shader normalises into NaN (contract §"third
   * texel").
   */
  @blue.method
  @meta.implemented
  AddPointLight(position, radius, color, innerRadius = 0, flags = Tr2LightManager.FLAG_DEFAULT)
  {
    if (!Tr2LightManager.areLightFlagsValid(flags)) return;

    const brightness = Math.max(color[0], color[1], color[2]);
    if (!(brightness > 0)) return;

    const dimming = this._CullAndDim(position, radius);
    if (dimming <= 0) return;

    const scale = radius * dimming;
    this._records.push({
      owner: null,
      lightData: null,
      lightProfile: null,
      lightType: 0,
      position: vec3.fromValues(position[0], position[1], position[2]),
      direction: vec3.fromValues(1, 0, 0),
      color: vec3.fromValues(color[0] * scale, color[1] * scale, color[2] * scale),
      radius,
      innerRadius,
      flags,
      outerAngle: 0,
      innerAngle: 0,
      projectionPlaneDistance: 0
    });
  }

  /**
   * Carbon AddLight (cpp:334-368): takes a caller-built record, applies the
   * same gates, premultiplies, and - faithfully - MUTATES the caller's
   * record in place where Carbon does (the shadow-flag strip on the non-const
   * reference, cpp:359-365; always taken under the shipping pin). The stored
   * record is a by-value copy: every producer reuses a static scratch record,
   * exactly as Carbon's std::vector push copies.
   */
  @blue.method
  @meta.implemented
  AddLight(record)
  {
    if (!Tr2LightManager.areLightFlagsValid(record.flags)) return;

    const brightness = Math.max(record.color[0], record.color[1], record.color[2]);
    if (!(brightness > 0) || !(record.radius > 0)) return;

    const dimming = this._CullAndDim(record.position, record.radius);
    if (dimming <= 0) return;

    // Carbon's conditional strip (cpp:359-365): shadows survive only when
    // the setting is on, the scene quality is not DISABLED, and a shadow-map
    // quality has an atlas actually sized for it (qualityUsedByAtlas lags a
    // frame behind). Always taken under the shipping default.
    const usingShadowMap = this._currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_LOW
      || this._currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_HIGH;
    if (this._currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_DISABLED
      || (usingShadowMap && this._shadowMap.qualityUsedByAtlas === ShadowQuality.SHADOW_DISABLED)
      || !Tr2LightManager.useDynamicLightsShadows)
    {
      record.flags &= ~Tr2LightManager.FLAG_CASTS_SHADOWS;
    }

    const scale = record.radius * dimming;
    this._records.push({
      owner: record.owner ?? null,
      lightData: record.lightData ?? null,
      lightProfile: record.lightProfile ?? null,
      lightType: record.lightType ?? 0,
      position: vec3.fromValues(record.position[0], record.position[1], record.position[2]),
      direction: vec3.fromValues(record.direction[0], record.direction[1], record.direction[2]),
      color: vec3.fromValues(record.color[0] * scale, record.color[1] * scale, record.color[2] * scale),
      radius: record.radius,
      innerRadius: record.innerRadius ?? 0,
      flags: record.flags,
      outerAngle: record.outerAngle ?? 0,
      innerAngle: record.innerAngle ?? 0,
      projectionPlaneDistance: record.projectionPlaneDistance ?? 0
    });
  }

  /**
   * Carbon ResolveLightData (cpp:520-620): the TLS flatten is a no-op here
   * (one array), the volumetric top-16 selection runs exactly as Carbon's -
   * including clearing IS_VOLUMETRIC on the losers so shader and CPU agree -
   * then the shadow-caster half (ported in full, gated by the same
   * useDynamicLightsShadows setting Carbon ships false), then the packed
   * buffer: byte layout per the contract, profile slots biased by one into
   * flag bits 4-15, the shadow union in word 11.
   */
  @blue.method
  @meta.implemented
  ResolveLightData()
  {
    const volumetric = [];
    for (let i = 0; i < this._records.length; i++)
    {
      if (this._records[i].flags & Tr2LightManager.FLAG_IS_VOLUMETRIC)
      {
        const size = this._ScreenSize(this._records[i]);
        volumetric.push([ i, Math.min(size, INFINITE_SIZE_CLAMP) ]);
      }
    }
    volumetric.sort((a, b) => b[1] - a[1]);

    this._volumetricLights.length = 0;
    for (let i = 0; i < volumetric.length; i++)
    {
      if (i < MAX_NUM_VOLUMETRIC_LIGHTS) this._volumetricLights.push(volumetric[i][0]);
      else this._records[volumetric[i][0]].flags &= ~Tr2LightManager.FLAG_IS_VOLUMETRIC;
    }

    this._ResolveShadowCasters();

    this._Pack();
    this._revision += 1;
  }

  /**
   * Carbon's shadow-caster half of ResolveLightData (cpp:568-620): the
   * useDynamicLightsShadows/DISABLED early-out (Carbon ships with the
   * setting FALSE - it is a TRI_REGISTER_SETTING, hence a mutable static
   * here rather than a constant), then filter casters by flag, estimate
   * screen size (Carbon's FLT_MAX inside-the-sphere sentinel clamps to the
   * high-quality atlas size), sort descending, keep the largest sixteen,
   * strip FLAG_CASTS_SHADOWS from the losers, assign raytracing masks by
   * rank under SHADOW_RAYTRACED, and pack the atlas for LOW/HIGH.
   */
  _ResolveShadowCasters()
  {
    this._shadowCastingLights.length = 0;
    if (!Tr2LightManager.useDynamicLightsShadows
      || this._currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_DISABLED)
    {
      return;
    }

    const lightTuples = [];
    for (let i = 0; i < this._records.length; i++)
    {
      if ((this._records[i].flags & Tr2LightManager.FLAG_CASTS_SHADOWS) !== 0)
      {
        let sizeAcross = this._frustum
          ? this._frustum.GetPixelSizeAccrossEst__CenterRadius(this._records[i].position, this._records[i].radius)
          : 0;
        if (!Number.isFinite(sizeAcross)) sizeAcross = 1 << HIGH_QUALITY_ATLAS_SIZE_LOG2;
        lightTuples.push({ lightIndex: i, sizeAcross });
      }
    }

    lightTuples.sort((a, b) => b.sizeAcross - a.sizeAcross);

    const raytraced = this._currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_RAYTRACED;
    const numShadowCastingLights = Math.min(MAX_NUM_SHADOWCASTING_LIGHTS, lightTuples.length);
    let i = 0;
    for (; i < numShadowCastingLights; i++)
    {
      this._shadowCastingLights.push(lightTuples[i].lightIndex);
      if (raytraced)
      {
        this._records[lightTuples[i].lightIndex].raytracingShadowMask = 1 << i;
      }
    }
    for (; i < lightTuples.length; i++)
    {
      const record = this._records[lightTuples[i].lightIndex];
      record.flags &= ~Tr2LightManager.FLAG_CASTS_SHADOWS;
      if (raytraced)
      {
        record.raytracingShadowMask = 0;
      }
    }

    if (this._currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_LOW
      || this._currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_HIGH)
    {
      this._CreateShadowMapAtlas(numShadowCastingLights, lightTuples);
    }
  }

  /**
   * Carbon CreateShadowMapAtlas (cpp:442-508): five fitting passes, each
   * halving entryMaxSize and incrementing the inverse-scale shift; entry
   * MIN size never scales. A failing pass still inserts every remaining
   * light before retrying. Point lights (innerAngle <= 0) take a 3x2
   * cube-cross, spots a square. Successful entries pack their offsets and
   * scale in entry-min-size units into the record's 10-bit fields; failures
   * zero them.
   */
  _CreateShadowMapAtlas(numShadowCastingLights, lightTuples)
  {
    const settings = this._shadowMap.atlasSettings;
    const entry = { x: 0, y: 0 };
    let everythingFit = false;
    for (let j = 0; j < 5 && !everythingFit; j++)
    {
      everythingFit = true;
      const entryInverseScaleFactorLog2 = settings.entryInverseScaleFactorLog2 + j;
      const entryMaxSize = settings.entryMaxSize >> j;

      this._shadowMap.atlasNodes.length = 0;
      this._shadowMap.atlasNodes.push({
        children: [ -1, -1 ],
        lightIndex: -1,
        x: 0,
        y: 0,
        width: settings.size,
        height: settings.size
      });

      for (let i = 0; i < numShadowCastingLights; i++)
      {
        const lightIndex = lightTuples[i].lightIndex;
        const record = this._records[lightIndex];

        let size = (lightTuples[i].sizeAcross >>> 0) >>> entryInverseScaleFactorLog2;
        size = Math.min(Math.max(size, settings.entryMinSize), entryMaxSize);
        size = align(size, settings.entryMinSize);

        let width, height;
        if (record.innerAngle <= 0)
        {
          // pointlight: a 3x2 cube-face cross
          width = 3 * size;
          height = 2 * size;
        }
        else
        {
          // spotlight
          width = size;
          height = size;
        }

        if (this._GetShadowMapAtlasEntry(lightIndex, width, height, entry))
        {
          record.shadowMapOffsetX = entry.x >>> settings.entryMinSizeLog2;
          record.shadowMapOffsetY = entry.y >>> settings.entryMinSizeLog2;
          record.shadowMapScale = size >>> settings.entryMinSizeLog2;
        }
        else
        {
          record.shadowMapOffsetX = 0;
          record.shadowMapOffsetY = 0;
          record.shadowMapScale = 0;
          everythingFit = false;
        }
      }
    }
  }

  /**
   * Carbon GetShadowMapAtlasEntry (cpp:790-808): align the request to the
   * entry min size, insert from the root, and report position ONLY on
   * success - the out object is untouched on failure, exactly as Carbon
   * leaves its out-references.
   */
  _GetShadowMapAtlasEntry(lightIndex, width, height, out)
  {
    const settings = this._shadowMap.atlasSettings;
    width = align(width, settings.entryMinSize);
    height = align(height, settings.entryMinSize);

    const nodeId = this._InsertAtlasNode(this._shadowMap.atlasNodes, 0, lightIndex, width, height);
    if (nodeId !== -1)
    {
      out.x = this._shadowMap.atlasNodes[nodeId].x;
      out.y = this._shadowMap.atlasNodes[nodeId].y;
    }
    return nodeId !== -1;
  }

  /**
   * Carbon InsertAtlasNode (cpp:718-788) - the blackpawn.com guillotine
   * packer, ported branch for branch: descend into split nodes (first
   * child, then second), reject occupied or too-small leaves, claim exact
   * fits, otherwise split along the larger remainder axis and recurse into
   * the first child.
   */
  _InsertAtlasNode(atlasNodes, nodeId, lightIndex, width, height)
  {
    const node = atlasNodes[nodeId];
    if (node.children[0] !== -1 || node.children[1] !== -1)
    {
      const newNode = this._InsertAtlasNode(atlasNodes, node.children[0], lightIndex, width, height);
      if (newNode !== -1)
      {
        return newNode;
      }
      return this._InsertAtlasNode(atlasNodes, node.children[1], lightIndex, width, height);
    }

    if (node.lightIndex !== -1)
    {
      return -1;
    }
    if (node.width < width || node.height < height)
    {
      return -1;
    }
    if (node.width === width && node.height === height)
    {
      node.lightIndex = lightIndex;
      return nodeId;
    }

    const child0 = { children: [ -1, -1 ], lightIndex: -1, x: 0, y: 0, width: 0, height: 0 };
    const child1 = { children: [ -1, -1 ], lightIndex: -1, x: 0, y: 0, width: 0, height: 0 };
    atlasNodes.push(child0, child1);
    node.children[0] = atlasNodes.length - 2;
    node.children[1] = atlasNodes.length - 1;

    const deltaWidth = node.width - width;
    const deltaHeight = node.height - height;

    if (deltaWidth > deltaHeight)
    {
      child0.x = node.x;
      child0.y = node.y;
      child0.width = width;
      child0.height = node.height;
      child1.x = node.x + width;
      child1.y = node.y;
      child1.width = node.width - width;
      child1.height = node.height;
    }
    else
    {
      child0.x = node.x;
      child0.y = node.y;
      child0.width = node.width;
      child0.height = height;
      child1.x = node.x;
      child1.y = node.y + height;
      child1.width = node.width;
      child1.height = node.height - height;
    }

    return this._InsertAtlasNode(atlasNodes, node.children[0], lightIndex, width, height);
  }

  /** Carbon GetCurrentSpaceSceneShadowQuality (cpp:713-716): a bare field read; every record producer asks it before building. */
  @blue.method
  @meta.implemented
  GetCurrentSpaceSceneShadowQuality()
  {
    return this._currentSpaceSceneShadowQuality;
  }

  /** Carbon GetLightData (cpp:695-698): the frame's resolved records, borrowed. */
  @blue.method
  @meta.implemented
  GetLightData()
  {
    return this._records;
  }

  /** Carbon GetVolumetricLights (cpp:707-710): indices into GetLightData, borrowed. */
  @blue.method
  @meta.implemented
  GetVolumetricLights()
  {
    return this._volumetricLights;
  }

  /** Carbon GetShadowCastingLights (cpp:688-691): empty under the shipping pin, kept for signature parity. */
  @blue.method
  @meta.implemented
  GetShadowCastingLights()
  {
    return this._shadowCastingLights;
  }

  // The frame clock used to be threaded through here, as a non-Carbon seam:
  // the packed sets needed it for curve sampling and the manager was the one
  // object every GetLights implementation already received. Carbon's sets read
  // the renderer's clock, which is `gTriDev->GetAnimationTime()`, and they do
  // that here now. Nothing in src ever called the setter, so the five readers
  // had been sampling a constant zero.

  /** m_effect (Tr2EffectPtr): computelightlists (EveSpaceScene.cpp:1380), Clear then Main. */
  @type.rootRef("Tr2Effect")
  _effect = new Tr2Effect();

  /** m_lightBuffer (Tr2GpuStructuredBufferPtr): one PerLightData per light. */
  @type.rootRef("Tr2GpuStructuredBuffer")
  _lightBuffer = new Tr2GpuStructuredBuffer();

  /** m_indexBuffer (Tr2GpuStructuredBufferPtr): tile headers, then list nodes. */
  @type.rootRef("Tr2GpuStructuredBuffer")
  _indexBuffer = new Tr2GpuStructuredBuffer();

  /** m_indexBufferCounter (Tr2GpuBufferPtr): LightIndexCount, the kernel's node allocator. */
  @type.rootRef("Tr2GpuBuffer")
  _indexBufferCounter = new Tr2GpuBuffer();

  /** m_perFrameData (Tr2ConstantBufferAL, Tr2LightManager.h:188): PerFrameData for the dispatch, by value. */
  _perFrameData = new Tr2ConstantBufferAL();

  /** The PerFrameData record filled each dispatch, and its float and uint views. */
  _perFrameRecord = new ArrayBuffer(PER_FRAME_WORDS * 4);

  @type.float32Array
  _perFrameFloats = new Float32Array(this._perFrameRecord);

  @type.uint32Array
  _perFrameWords = new Uint32Array(this._perFrameRecord);

  @type.mat4
  _perFrameViewInverse = this._perFrameFloats.subarray(PER_FRAME_VIEW_INVERSE, PER_FRAME_VIEW_INVERSE + 16);

  @type.mat4
  _perFrameProjInverse = this._perFrameFloats.subarray(PER_FRAME_PROJ_INVERSE, PER_FRAME_PROJ_INVERSE + 16);

  /** m_lightBufferVariable / m_indexBufferVariable (TriVariableHandle). */
  _lightBufferVariable = null;

  _indexBufferVariable = null;

  /**
   * Carbon's constructor half that makes this a device resource and
   * publishes the globals (cpp:145-176): the effect takes the light-list
   * path, LightBuffer and LightIndexBuffer are registered once and pointed at
   * the buffers, and the buffers are made when a device allows it. Carbon
   * also publishes LightProfileArray; the JS texture array is not yet a
   * texture provider, so it is not registered. Profile-less lights, most of
   * them, never sample it.
   *
   * @param {string} effectPath The light-list compute effect.
   * @returns {Tr2LightManager} This manager.
   */
  _InitializeDevice(effectPath)
  {
    this._effect.SetEffectPathName(effectPath);
    const store = Tr2VariableStore.globalStore();
    this._lightBufferVariable = store.RegisterVariableInternal(Tr2LightManager.LIGHT_BUFFER_NAME, TriVariableContentType.TRIVARIABLE_GPUBUFFER, this._lightBuffer);
    this._indexBufferVariable = store.RegisterVariableInternal(Tr2LightManager.LIGHT_INDEX_BUFFER_NAME, TriVariableContentType.TRIVARIABLE_GPUBUFFER, this._indexBuffer);
    TriDevice.RegisterResource(this);
    this.PrepareResources();
    return this;
  }

  /** Carbon GetOrCreateInstance (cpp:192-200): the process-wide manager. */
  @blue.method
  @meta.implemented
  static getOrCreateInstance(effectPath)
  {
    Tr2LightManager._instance ??= new Tr2LightManager()._InitializeDevice(effectPath);
    return Tr2LightManager._instance;
  }

  /** Carbon GetInstance (cpp:202-205): the manager, or null when none exists. */
  @blue.method
  @meta.implemented
  static getInstance()
  {
    return Tr2LightManager._instance;
  }

  /**
   * Carbon DeleteInstance (cpp:207-212). The destructor's ResetVariableStore
   * (cpp:174-190) republishes empty buffers, so the globals stop naming this
   * manager's.
   *
   * Adapted: JavaScript has no destructor, so the manager unregisters from
   * the device and resets the variable store here. ResetVariableStore's
   * LightProfileArray and ShadowMapAtlas re-registrations are not made; the
   * manager does not publish either.
   */
  @blue.method
  @meta.adapted
  static deleteInstance()
  {
    const instance = Tr2LightManager._instance;
    if (!instance) return;
    Tr2LightManager._instance = null;
    TriDevice.UnregisterResource(instance);
    const store = Tr2VariableStore.globalStore();
    store.RegisterVariableInternal(Tr2LightManager.LIGHT_BUFFER_NAME, TriVariableContentType.TRIVARIABLE_GPUBUFFER, new Tr2GpuStructuredBuffer());
    store.RegisterVariableInternal(Tr2LightManager.LIGHT_INDEX_BUFFER_NAME, TriVariableContentType.TRIVARIABLE_GPUBUFFER, new Tr2GpuStructuredBuffer());
  }

  static _instance = null;

  static scratch = { words4_0: new Uint32Array(4) };

  /** Carbon SetVariableStore (cpp:214-218): the globals name this manager's buffers. */
  @blue.method
  @meta.implemented
  SetVariableStore()
  {
    this._lightBufferVariable?.SetValue(this._lightBuffer);
    this._indexBufferVariable?.SetValue(this._indexBuffer);
  }

  /** Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-32). */
  @blue.method
  @meta.implemented
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed())
    {
      if (!this.OnPrepareResources()) return false;
    }
    return true;
  }

  /**
   * Carbon OnPrepareResources (cpp:657-675): the light buffer, the 8M-entry
   * GPU-writable index buffer, the R32_SINT node counter, and the per-frame
   * constants; the effect is pointed at all three buffers, its depth map
   * left empty until a dispatch sets it.
   *
   * @returns {boolean} True.
   */
  @blue.method
  @meta.implemented
  OnPrepareResources()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    const structured = Tr2GpuStructuredBuffer.CreationFlag;
    this._lightBuffer.Create(LIGHT_BUFFER_SIZE, BYTES_PER_LIGHT, structured.CPU_WRITABLE, renderContext);
    this._lightBuffer.SetName("Light buffer");
    this._indexBuffer.Create(INDEX_BUFFER_SIZE, 4, structured.GPU_WRITABLE, renderContext);
    this._indexBuffer.SetName("Light indices");
    this._indexBufferCounter.Create(1, PixelFormat.PIXEL_FORMAT_R32_SINT, Tr2GpuBuffer.CreationFlags.GPU_WRITABLE, renderContext);
    this.ClearLightIndices(renderContext);
    this._perFrameData.Create(this._perFrameRecord.byteLength, Tr2ConstantUsageAL.ONE_SHOT, null, renderContext);

    this._effect.SetParameter__GpuBuffer("LightBuffer", this._lightBuffer);
    this._effect.SetParameter__GpuBuffer("LightIndices", this._indexBuffer);
    this._effect.SetParameter__GpuBuffer("LightIndexCount", this._indexBufferCounter);
    this._effect.SetParameter__TextureAL("DepthMap", null);
    return true;
  }

  /**
   * Carbon ReleaseResources (cpp:641-655): only the per-frame constants are
   * released, when their memory class is; the buffers and the effect stay.
   *
   * @param {number} storage The TriStorage classes being released.
   */
  @blue.method
  @meta.implemented
  ReleaseResources(storage)
  {
    // m_perFrameData = Tr2ConstantBufferAL() (cpp:645).
    if (storage & this._perFrameData.GetMemoryClass()) this._perFrameData.Destroy();
  }

  /**
   * Carbon ClearLightIndices (cpp:370-378): the index buffer cleared to zero
   * as a UAV, so every tile head reads "no lights".
   *
   * @param {Tr2RenderContext} renderContext The context to clear through.
   * @returns {boolean} Whether the clear succeeded, or there was no buffer.
   */
  @blue.method
  @meta.implemented
  ClearLightIndices(renderContext)
  {
    const buffer = this._indexBuffer.GetGpuBuffer(0);
    if (!buffer) return true;
    const { words4_0 } = Tr2LightManager.scratch;
    words4_0.fill(0);
    return Succeeded(renderContext.ClearUav(buffer, words4_0));
  }

  /**
   * Carbon UpdateLightBuffer (cpp:380-399): grows the light buffer to the
   * frame's light count, then uploads the packed records.
   *
   * @param {Tr2RenderContext} renderContext The context to write through.
   * @returns {boolean} Whether the upload succeeded.
   */
  @blue.method
  @meta.implemented
  UpdateLightBuffer(renderContext)
  {
    const count = this._packedCount;
    if (this._lightBuffer.GetCount() < count)
    {
      const grown = Math.max(this._lightBuffer.GetCount() + 1024, count);
      this._lightBuffer.Create(grown, BYTES_PER_LIGHT, Tr2GpuStructuredBuffer.CreationFlag.CPU_WRITABLE, renderContext);
      this._lightBuffer.SetName("Light buffer");
    }
    const buffer = this._lightBuffer.GetGpuBuffer(0);
    if (!buffer) return false;
    // cpp:393-396: a WRITE_OFTEN buffer is written through a map.
    return Tr2LightManager._WriteMapped(buffer, this.GetLightBufferData(), renderContext);
  }

  /**
   * Carbon UpdateLists (cpp:622-639): the globals name the buffers, then the
   * lists are built - or cleared when there are no lights or the build fails.
   *
   * @param {object} depthMap The scene depth, the render target's size.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {boolean} Whether the lists were built.
   */
  @blue.method
  @meta.implemented
  UpdateLists(depthMap, renderContext)
  {
    this.SetVariableStore();
    if (this._packedCount === 0)
    {
      this.ClearLightIndices(renderContext);
      return true;
    }
    const built = this.DoUpdateLists(depthMap, renderContext);
    if (!built) this.ClearLightIndices(renderContext);
    return built;
  }

  /**
   * Carbon DoUpdateLists (cpp:401-440): uploads the light buffer, fills
   * PerFrameData, binds it at the per-frame pixel register for the compute
   * stage, and runs computelightlists - Clear (1x1x1) zeroes the node
   * counter, then Main runs one 16x16 group per tile over the depth map,
   * linking each tile's lights into the index buffer.
   *
   * The tile count follows the render target's size, as Carbon's does. The
   * depth map is bound for the dispatch only.
   *
   * @param {Tr2TextureAL} depthMap The scene depth.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {boolean} Whether both dispatches ran.
   */
  @blue.method
  @meta.implemented
  DoUpdateLists(depthMap, renderContext)
  {
    if (!this._lightBuffer.IsValid() || !this._indexBuffer.IsValid() || !this._indexBufferCounter.IsValid()) return false;

    if (!this.UpdateLightBuffer(renderContext)) return false;

    const floats = this._perFrameFloats;
    const words = this._perFrameWords;
    const esm = renderContext.GetEffectStateManager();

    // Tr2LightManager.cpp:410-412.
    mat4.transpose(this._perFrameProjInverse, Tr2Renderer.GetInverseProjectionTransform());
    mat4.transpose(this._perFrameViewInverse, Tr2Renderer.GetInverseViewTransform());
    floats.set(Tr2Renderer.GetViewPosition(), PER_FRAME_CAMERA_POS);
    words[PER_FRAME_WIDTH] = esm.renderTargetWidth >>> 0;
    words[PER_FRAME_HEIGHT] = esm.renderTargetHeight >>> 0;
    words[PER_FRAME_TILES_X] = Math.floor((words[PER_FRAME_WIDTH] + (TILE_WIDTH - 1)) / TILE_WIDTH);
    words[PER_FRAME_TILES_Y] = Math.floor((words[PER_FRAME_HEIGHT] + (TILE_HEIGHT - 1)) / TILE_HEIGHT);
    words[PER_FRAME_LIGHT_COUNT] = Math.min(this._lightBuffer.GetCount(), this._packedCount);
    words[PER_FRAME_INDEX_BUFFER_SIZE] = INDEX_BUFFER_SIZE;

    this._effect.SetParameter__TextureAL("DepthMap", depthMap);
    try
    {
      // The per-frame constants are released with their memory class
      // (ReleaseResources); the fill recreates them (cpp:425).
      if (!Tr2RenderUtils.fillAndSetConstants(this._perFrameData, words, this._perFrameRecord.byteLength, 1 << ShaderType.COMPUTE_SHADER, PER_FRAME_PS, renderContext))
      {
        return false;
      }
      if (!Tr2Renderer.runComputeShader(this._effect, "Clear", 1, 1, 1, renderContext)) return false;
      return Tr2Renderer.runComputeShader(this._effect, words[PER_FRAME_TILES_X], words[PER_FRAME_TILES_Y], 1, renderContext);
    }
    finally
    {
      // ON_BLOCK_EXIT (cpp:422): the depth map is unbound however the dispatch ends.
      this._effect.SetParameter__TextureAL("DepthMap", null);
    }
  }

  /**
   * MapForWriting, copy, UnmapForWriting - Carbon's upload for a
   * CPU_WRITABLE (WRITE_OFTEN) buffer, which UpdateBuffer refuses. A null
   * source zeroes the mapping.
   */
  static _WriteMapped(buffer, source, renderContext)
  {
    const { result, data } = buffer.MapForWriting(renderContext);
    if (!Succeeded(result)) return false;
    if (source) data.set(new Uint8Array(source.buffer, source.byteOffset, source.byteLength));
    else data.fill(0);
    buffer.UnmapForWriting(renderContext);
    return true;
  }

  /** The packed flags of light `index`: the high 16 bits of row 1's w (contract). */
  _LightFlags(index)
  {
    return this._packedBits[index * FLOATS_PER_LIGHT + 7] >>> 16;
  }

  /**
   * The packed PerLightData bytes for the AL to upload, borrowed (contract layout, 3 RGBA32 texels per light).
   *
   * Adapted: AL seam: Trinity owns the packed description bytes; the AL realizes LightBuffer
   * from this view. Carbon has no such seam; Tr2DataTextureManager now writes its own
   * texture, so this has no precedent.
   */
  GetLightBufferData()
  {
    return this._packed.subarray(0, this._packedCount * FLOATS_PER_LIGHT);
  }

  /**
   * The number of packed lights in GetLightBufferData.
   *
   * Adapted: AL seam companion to GetLightBufferData.
   */
  GetLightCount()
  {
    return this._packedCount;
  }

  /**
   * Monotonic revision of the packed data, bumped by ResolveLightData, so the AL can skip unchanged re-uploads.
   *
   * Adapted: Non-Carbon extension: cheaper than the AL diffing a typed array; Carbon
   * re-uploads unconditionally.
   */
  GetDataRevision()
  {
    return this._revision;
  }

  /** Frustum cull + pixel-size cutoff, returning the fade-band dimming factor (0 = rejected). Cull applies only when a frustum was set. */
  _CullAndDim(position, radius)
  {
    if (!this._frustum) return 1;
    if (!this._frustum.IsSphereVisible__CenterRadius(position, radius)) return 0;
    const size = this._frustum.GetPixelSizeAccross__CenterRadius(position, radius);
    if (!(size > this._adjustedCutoff)) return 0;
    // Contract §"Colour carries the radius": the fade band sits ABOVE the
    // cutoff - absent at the cutoff, full brightness FADE_SIZE above it.
    return Math.min((size - this._adjustedCutoff) / FADE_SIZE, 1);
  }

  /**
   * Returns the light's projected pixel size, or its radius when no frustum is
   * set.
   */
  _ScreenSize(record)
  {
    if (!this._frustum) return record.radius;
    return this._frustum.GetPixelSizeAccross__CenterRadius(record.position, record.radius);
  }

  /**
   * The slice a profile occupies, +1 biased so 0 means "no profile"
   * (Tr2Light.cpp:137: `m_lightProfile ? GetTextureIndex() + 1 : 0`).
   *
   * The index comes from the RESOURCE (`GetTextureIndex`, the texture-array
   * slice - stable, shared across managers, reused after release), never
   * from an invented per-manager counter: Carbon assigns slices through the
   * process-wide light profile array (cpp:682-686), and a manager-local
   * numbering diverges from what the shader samples the moment two managers
   * or a released slot exist. A profile carrying a baked payload but no
   * slice yet is registered here - Carbon does this in the resource's
   * DoPrepare (Tr2LightProfileRes.cpp:95-99), which the layering forbids
   * (resource cannot import trinity), so the manager performs it at the
   * first pack instead; same array, same first-fit slot, one seam later.
   * The profile is Carbon's m_lightProfile, a Tr2LightProfileRes.
   */
  _ProfileSlot(profile)
  {
    if (!profile) return 0;
    // Asked where it is used, once per packed light per frame: renews the
    // profile and packs "no profile" while it is not good, which is what a
    // loading profile without a bitmap already packed (CjsResource.IsGood).
    if (!profile.IsGood()) return 0;
    let index = profile.GetTextureIndex();
    if (index < 0)
    {
      // Carbon hands the profile's m_bitmap to the array (Tr2LightProfileRes.cpp:95-99).
      const bitmap = profile.GetBitmap();
      if (bitmap.IsValid())
      {
        const element = Tr2LightManager.getLightProfileArray().AddElement(bitmap);
        if (element.IsValid())
        {
          profile.RegisterProfileElement(element);
          index = element.GetElementIndex();
        }
      }
    }
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * The process-wide light profile array (Tr2LightManager.cpp:682-686).
   *
   * Carbon's is a function-local static that deliberately survives manager
   * destruction (ResetVariableStore re-registers the SAME live array,
   * cpp:186) - so under instance-per-scene managers this stays a class
   * static: two scenes share slices, and a profile's texture index means
   * the same thing everywhere. Realizing it as a GPU texture array is the
   * abstraction layer's job; consumers poll GetRevision or subscribe via
   * OnTextureChange.
   *
   * @returns {Tr2TextureArray} The shared profile array.
   */
  static getLightProfileArray()
  {
    if (!Tr2LightManager._lightProfileArray)
    {
      Tr2LightManager._lightProfileArray = new Tr2TextureArray();
    }
    return Tr2LightManager._lightProfileArray;
  }

  static _lightProfileArray = null;

  /** Packs _records into the 48-byte-per-light buffer per the contract layout. */
  _Pack()
  {
    const count = Math.min(this._records.length, LIGHT_BUFFER_SIZE);
    for (let i = 0; i < count; i++)
    {
      const record = this._records[i];
      const f = i * FLOATS_PER_LIGHT;

      // Texel 0: position + radius, four f32.
      this._packed[f] = record.position[0];
      this._packed[f + 1] = record.position[1];
      this._packed[f + 2] = record.position[2];
      this._packed[f + 3] = record.radius;

      // Texel 1: colour (premultiplied at Add time) + the packed word -
      // innerRadius f16 low, flags u16 high with the biased profile slot in
      // bits 4-15 (contract §"The packed flag word").
      this._packed[f + 4] = record.color[0];
      this._packed[f + 5] = record.color[1];
      this._packed[f + 6] = record.color[2];
      const flagsWord = (record.flags & 0xF) | (this._ProfileSlot(record.lightProfile) << 4);
      this._packedBits[f + 7] = toHalf(record.innerRadius) | ((flagsWord & 0xFFFF) << 16);

      // Texel 2: direction as three f16, projectionPlaneDistance, the two
      // angles, then the shadow union (h:70-84, MSVC low-bit-first layout:
      // bits 0-1 padding, 2-11 scale, 12-21 offsetX, 22-31 offsetY; the
      // raytraced mask shares the word - the paths are exclusive by
      // quality). All zeros under the shipping pin, exactly as before.
      this._packedBits[f + 8] = toHalf(record.direction[0]) | (toHalf(record.direction[1]) << 16);
      this._packedBits[f + 9] = toHalf(record.direction[2]) | (toHalf(record.projectionPlaneDistance) << 16);
      this._packedBits[f + 10] = toHalf(record.outerAngle) | (toHalf(record.innerAngle) << 16);
      this._packedBits[f + 11] = this._currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_RAYTRACED
        ? (record.raytracingShadowMask ?? 0) & 0xFFFF
        : (((record.shadowMapScale ?? 0) & 0x3FF) << 2)
          | (((record.shadowMapOffsetX ?? 0) & 0x3FF) << 12)
          | (((record.shadowMapOffsetY ?? 0) & 0x3FF) << 22);
    }
    this._packedCount = count;
  }
}

CjsSchema.decorateMethod(Tr2LightManager, "_CreateShadowMapAtlas", blue.method, meta.renamed("CreateShadowMapAtlas"));
CjsSchema.decorateMethod(Tr2LightManager, "_GetShadowMapAtlasEntry", blue.method, meta.renamed("GetShadowMapAtlasEntry"));
CjsSchema.decorateMethod(Tr2LightManager, "_InsertAtlasNode", blue.method, meta.renamed("InsertAtlasNode"));
CjsSchema.decorateMethod(Tr2LightManager, "areLightFlagsValid", blue.method, meta.renamed("AreLightFlagsValid"));
CjsSchema.decorateMethod(Tr2LightManager, "getOrCreateInstance", blue.method, meta.renamed("GetOrCreateInstance"));
CjsSchema.decorateMethod(Tr2LightManager, "getInstance", blue.method, meta.renamed("GetInstance"));
CjsSchema.decorateMethod(Tr2LightManager, "deleteInstance", blue.method, meta.renamed("DeleteInstance"));
CjsSchema.decorateMethod(Tr2LightManager, "getLightProfileArray", blue.method, meta.renamed("GetLightProfileArray"));
