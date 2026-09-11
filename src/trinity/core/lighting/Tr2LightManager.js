// Source: trinity/trinity/Tr2LightManager.h + Tr2LightManager.cpp
//
// The local-light manager: collects per-light records from every
// ITr2LightOwner during the scene gather, culls and premultiplies them,
// selects the volumetric set, and owns the PACKED light buffer bytes the
// abstraction layer uploads. Description-building throughout - under the
// engine-means-AL vocabulary (docs c5a4b66) everything here is Trinity's;
// only realizing LightBuffer/LightIndexBuffer into device objects, the
// tiling compute dispatch, the shadow atlas textures and the raytraced
// path are the AL's, and all of those are deferred below.
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
// sequential. Carbon's file-static singleton (GetOrCreateInstance) is NOT
// ported - the runtime injects a manager into GatherLights, which is the
// shape every call site and test already has.
//
// docs/contracts/carbon-light-data.md owns the PerLightData layout, the
// packed flag word, the premultiply and the fade band; the packing below
// cites it rather than re-deriving it.

import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";
import { num } from "#math/num";
import { vec3 } from "#math/vec3";
import { ShadowQuality } from "../../generated/trinityCore/enums.js";
import { Tr2TextureArray } from "../Tr2TextureArray/index.js";

// Tr2LightManager.cpp:30-48 - copied verbatim; the buffer sizes are the ABI
// the AL uploads against.
const LIGHT_BUFFER_SIZE = 1024;
const CUTOFF_PIXEL_SIZE = 7;
const FADE_SIZE = 5;
const MAX_NUM_VOLUMETRIC_LIGHTS = 16;
const MAX_NUM_SHADOWCASTING_LIGHTS = 16;
const HIGH_QUALITY_ATLAS_SIZE_LOG2 = 14;
const HIGH_QUALITY_ATLAS_ENTRY_MAX_SIZE = 1 << 13;
const INFINITE_SIZE_CLAMP = 1 << 14; // 1 << HIGH_QUALITY_ATLAS_SIZE_LOG2
const FLOATS_PER_LIGHT = 12; // 48 bytes / 3 RGBA32 texels

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
// :328-329), which rounds to nearest. num.toHalfFloat is the runtime's one
// half codec and rounds identically for every in-range value; an earlier
// file-local encoder here TRUNCATED, a 1-ulp divergence from Carbon,
// removed 2026-09-08.
const toHalf = num.toHalfFloat;

/** Owns the frame's local-light records, their selection, and the packed light-buffer bytes the abstraction layer uploads. */
@type.define({ className: "Tr2LightManager", family: "trinityCore" })
export class Tr2LightManager extends CjsModel
{

  // Carbon m_lightData after the TLS flatten: the frame's accepted records,
  // plain-object copies (every producer reuses a static scratch record, so
  // AddLight copies by value exactly as std::vector::push_back does).
  #records = [];

  // Carbon m_volumetricLights / m_shadowCastingLights: indices into #records.
  #volumetricLights = [];

  #shadowCastingLights = [];

  // Carbon m_frustum, by reference (SetFrustum copies by value in C++; the
  // stamped frame frustum is not mutated during the gather, so a reference
  // carries the same guarantee here).
  #frustum = null;

  // Carbon m_adjustedCutoff (cpp:249-252).
  #adjustedCutoff = CUTOFF_PIXEL_SIZE;

  // Carbon m_currentSpaceSceneShadowQuality (h:197).
  #currentSpaceSceneShadowQuality = ShadowQuality.SHADOW_DISABLED;

  // Carbon nextFrameShadowQuality (h:196) - a bitmask collecting every
  // scene's requested quality during the current frame.
  #nextFrameShadowQuality = 0;

  // Carbon m_currentFrameCounter (h:198; ctor sets -1, cpp:164).
  #currentFrameCounter = -1;

  // Carbon's anonymous m_ShadowMap block (h:200-205): the atlas settings,
  // the guillotine node tree, and the quality the atlas was last sized for.
  #shadowMap = {
    atlasSettings: calculateShadowMapAtlasSettings(ShadowQuality.SHADOW_DISABLED),
    atlasNodes: [],
    qualityUsedByAtlas: ShadowQuality.SHADOW_DISABLED
  };

  // Non-Carbon: the frame clock the packed sets read for curve sampling.
  #animationTime = 0;

  // Non-Carbon: profile-object -> slice index, assigned on first sight. The
  // slot registry is description-side (Carbon assigns slices through the
  // manager-owned Tr2TextureArray, cpp:682-686, whose realization is AL).
  #profileSlots = new Map();

  // The packed PerLightData buffer (contract: 48 bytes / 3 RGBA32 texels per
  // light), built by ResolveLightData, uploaded by the AL.
  #packed = new Float32Array(LIGHT_BUFFER_SIZE * FLOATS_PER_LIGHT);

  #packedBits = new Uint32Array(this.#packed.buffer);

  #packedCount = 0;

  // Non-Carbon: bumped by ResolveLightData so the AL can skip re-uploads.
  #revision = 0;

  /** Tr2LightManager.h:100-105 - the light flag bits, Carbon's raw uint16 spelling. */
  static Flags = Object.freeze({
    AFFECTS_SURFACES: 1,
    AFFECTS_PARTICLES: 1 << 1,
    CASTS_SHADOWS: 1 << 2,
    IS_VOLUMETRIC: 1 << 3,
    DEFAULT: 1
  });

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
  static useDynamicLightsShadows = false;

  /** The atlas-settings derivation, exposed for tests (Carbon cpp:92-122). */
  static calculateShadowMapAtlasSettings = calculateShadowMapAtlasSettings;

  /**
   * Carbon Tr2LightManager::AreLightFlagsValid (cpp:677-680): a light must
   * affect surfaces or particles to exist at all.
   */
  @carbon.method
  @impl.implemented
  static areLightFlagsValid(flags)
  {
    return (flags & (Tr2LightManager.Flags.AFFECTS_SURFACES | Tr2LightManager.Flags.AFFECTS_PARTICLES)) !== 0;
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
  @carbon.method
  @impl.implemented
  SetShadowQuality(quality, frameCounter = 0)
  {
    const shadowQuality = Number(quality) || 0;
    this.#currentSpaceSceneShadowQuality = shadowQuality;

    if (this.#currentFrameCounter !== frameCounter)
    {
      if (!Tr2LightManager.useDynamicLightsShadows)
      {
        this.#nextFrameShadowQuality = 0;
      }

      if (this.#nextFrameShadowQuality & (1 << ShadowQuality.SHADOW_HIGH))
      {
        this.#shadowMap.qualityUsedByAtlas = ShadowQuality.SHADOW_HIGH;
      }
      else if (this.#nextFrameShadowQuality & (1 << ShadowQuality.SHADOW_LOW))
      {
        this.#shadowMap.qualityUsedByAtlas = ShadowQuality.SHADOW_LOW;
      }
      else
      {
        this.#shadowMap.qualityUsedByAtlas = ShadowQuality.SHADOW_DISABLED;
      }
      this.#nextFrameShadowQuality = 1 << shadowQuality;
      this.#currentFrameCounter = frameCounter;
    }

    this.#nextFrameShadowQuality |= 1 << shadowQuality;

    const clamped = Math.min(shadowQuality, this.#shadowMap.qualityUsedByAtlas);
    this.#shadowMap.atlasSettings = calculateShadowMapAtlasSettings(clamped);
    this.#shadowMap.atlasSettings.actualTextureSize =
      calculateShadowMapAtlasSettings(this.#shadowMap.qualityUsedByAtlas).size;
  }

  /** Carbon GetShadowMapAtlasSettings (cpp:708-711). */
  @carbon.method
  @impl.implemented
  GetShadowMapAtlasSettings()
  {
    return this.#shadowMap.atlasSettings;
  }

  /**
   * Carbon GetUnpackedShadowMapData (cpp:810-815): the packed 10-bit
   * offsets/scale back into texels via the entry-min-size shift.
   *
   * @param {object} record A light record carrying the packed fields.
   * @param {object} [out] Receives scale/offsetX/offsetY.
   * @returns {object} out
   */
  @carbon.method
  @impl.implemented
  GetUnpackedShadowMapData(record, out = {})
  {
    const shift = this.#shadowMap.atlasSettings.entryMinSizeLog2;
    out.shadowMapScale = (record.shadowMapScale ?? 0) << shift;
    out.shadowMapOffsetX = (record.shadowMapOffsetX ?? 0) << shift;
    out.shadowMapOffsetY = (record.shadowMapOffsetY ?? 0) << shift;
    return out;
  }

  /**
   * Carbon Clear (cpp:220-242), the CPU half: drops the frame's records and
   * selections. The index-buffer UAV clear (cpp:224) is device work the AL
   * performs when it consumes the frame.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("ClearLightIndices' UAV clear is AL realization; the vector clears are ported. The render-context parameter is accepted for signature parity and unused.")
  Clear(_renderContext = null)
  {
    this.#records.length = 0;
    this.#volumetricLights.length = 0;
    this.#shadowCastingLights.length = 0;
  }

  /** Carbon SetFrustum (cpp:244-247). */
  @carbon.method
  @impl.implemented
  SetFrustum(frustum)
  {
    this.#frustum = frustum ?? null;
  }

  /** Carbon AdjustLightCutoff (cpp:249-252): the cull threshold is 7px * lodFactor. */
  @carbon.method
  @impl.implemented
  AdjustLightCutoff(lodFactor)
  {
    this.#adjustedCutoff = CUTOFF_PIXEL_SIZE * (Number(lodFactor) || 0);
  }

  /**
   * Carbon AddPointLight (cpp:297-332): authors a record from scratch, in
   * Carbon's exact order - flags gate, brightness gate, frustum cull, pixel
   * cutoff, premultiply+fade, defaults for everything a caller cannot
   * supply. The direction default is (1,0,0), never zero - a zero direction
   * is a legal bit pattern the shader normalises into NaN (contract §"third
   * texel").
   */
  @carbon.method
  @impl.implemented
  AddPointLight(position, radius, color, innerRadius = 0, flags = Tr2LightManager.Flags.DEFAULT)
  {
    if (!Tr2LightManager.areLightFlagsValid(flags)) return;

    const brightness = Math.max(color[0], color[1], color[2]);
    if (!(brightness > 0)) return;

    const dimming = this.#CullAndDim(position, radius);
    if (dimming <= 0) return;

    const scale = radius * dimming;
    this.#records.push({
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
  @carbon.method
  @impl.implemented
  AddLight(record)
  {
    if (!Tr2LightManager.areLightFlagsValid(record.flags)) return;

    const brightness = Math.max(record.color[0], record.color[1], record.color[2]);
    if (!(brightness > 0) || !(record.radius > 0)) return;

    const dimming = this.#CullAndDim(record.position, record.radius);
    if (dimming <= 0) return;

    // Carbon's conditional strip (cpp:359-365): shadows survive only when
    // the setting is on, the scene quality is not DISABLED, and a shadow-map
    // quality has an atlas actually sized for it (qualityUsedByAtlas lags a
    // frame behind). Always taken under the shipping default.
    const usingShadowMap = this.#currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_LOW
      || this.#currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_HIGH;
    if (this.#currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_DISABLED
      || (usingShadowMap && this.#shadowMap.qualityUsedByAtlas === ShadowQuality.SHADOW_DISABLED)
      || !Tr2LightManager.useDynamicLightsShadows)
    {
      record.flags &= ~Tr2LightManager.Flags.CASTS_SHADOWS;
    }

    const scale = record.radius * dimming;
    this.#records.push({
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
  @carbon.method
  @impl.implemented
  ResolveLightData()
  {
    const volumetric = [];
    for (let i = 0; i < this.#records.length; i++)
    {
      if (this.#records[i].flags & Tr2LightManager.Flags.IS_VOLUMETRIC)
      {
        const size = this.#ScreenSize(this.#records[i]);
        volumetric.push([ i, Math.min(size, INFINITE_SIZE_CLAMP) ]);
      }
    }
    volumetric.sort((a, b) => b[1] - a[1]);

    this.#volumetricLights.length = 0;
    for (let i = 0; i < volumetric.length; i++)
    {
      if (i < MAX_NUM_VOLUMETRIC_LIGHTS) this.#volumetricLights.push(volumetric[i][0]);
      else this.#records[volumetric[i][0]].flags &= ~Tr2LightManager.Flags.IS_VOLUMETRIC;
    }

    this.#ResolveShadowCasters();

    this.#Pack();
    this.#revision += 1;
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
  #ResolveShadowCasters()
  {
    this.#shadowCastingLights.length = 0;
    if (!Tr2LightManager.useDynamicLightsShadows
      || this.#currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_DISABLED)
    {
      return;
    }

    const lightTuples = [];
    for (let i = 0; i < this.#records.length; i++)
    {
      if ((this.#records[i].flags & Tr2LightManager.Flags.CASTS_SHADOWS) !== 0)
      {
        let sizeAcross = this.#frustum
          ? this.#frustum.GetPixelSizeAccrossEst(this.#records[i].position, this.#records[i].radius)
          : 0;
        if (!Number.isFinite(sizeAcross)) sizeAcross = 1 << HIGH_QUALITY_ATLAS_SIZE_LOG2;
        lightTuples.push({ lightIndex: i, sizeAcross });
      }
    }

    lightTuples.sort((a, b) => b.sizeAcross - a.sizeAcross);

    const raytraced = this.#currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_RAYTRACED;
    const numShadowCastingLights = Math.min(MAX_NUM_SHADOWCASTING_LIGHTS, lightTuples.length);
    let i = 0;
    for (; i < numShadowCastingLights; i++)
    {
      this.#shadowCastingLights.push(lightTuples[i].lightIndex);
      if (raytraced)
      {
        this.#records[lightTuples[i].lightIndex].raytracingShadowMask = 1 << i;
      }
    }
    for (; i < lightTuples.length; i++)
    {
      const record = this.#records[lightTuples[i].lightIndex];
      record.flags &= ~Tr2LightManager.Flags.CASTS_SHADOWS;
      if (raytraced)
      {
        record.raytracingShadowMask = 0;
      }
    }

    if (this.#currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_LOW
      || this.#currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_HIGH)
    {
      this.#CreateShadowMapAtlas(numShadowCastingLights, lightTuples);
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
  #CreateShadowMapAtlas(numShadowCastingLights, lightTuples)
  {
    const settings = this.#shadowMap.atlasSettings;
    const entry = { x: 0, y: 0 };
    let everythingFit = false;
    for (let j = 0; j < 5 && !everythingFit; j++)
    {
      everythingFit = true;
      const entryInverseScaleFactorLog2 = settings.entryInverseScaleFactorLog2 + j;
      const entryMaxSize = settings.entryMaxSize >> j;

      this.#shadowMap.atlasNodes.length = 0;
      this.#shadowMap.atlasNodes.push({
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
        const record = this.#records[lightIndex];

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

        if (this.#GetShadowMapAtlasEntry(lightIndex, width, height, entry))
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
  #GetShadowMapAtlasEntry(lightIndex, width, height, out)
  {
    const settings = this.#shadowMap.atlasSettings;
    width = align(width, settings.entryMinSize);
    height = align(height, settings.entryMinSize);

    const nodeId = this.#InsertAtlasNode(this.#shadowMap.atlasNodes, 0, lightIndex, width, height);
    if (nodeId !== -1)
    {
      out.x = this.#shadowMap.atlasNodes[nodeId].x;
      out.y = this.#shadowMap.atlasNodes[nodeId].y;
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
  #InsertAtlasNode(atlasNodes, nodeId, lightIndex, width, height)
  {
    const node = atlasNodes[nodeId];
    if (node.children[0] !== -1 || node.children[1] !== -1)
    {
      const newNode = this.#InsertAtlasNode(atlasNodes, node.children[0], lightIndex, width, height);
      if (newNode !== -1)
      {
        return newNode;
      }
      return this.#InsertAtlasNode(atlasNodes, node.children[1], lightIndex, width, height);
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

    return this.#InsertAtlasNode(atlasNodes, node.children[0], lightIndex, width, height);
  }

  /** Carbon GetCurrentSpaceSceneShadowQuality (cpp:713-716): a bare field read; every record producer asks it before building. */
  @carbon.method
  @impl.implemented
  GetCurrentSpaceSceneShadowQuality()
  {
    return this.#currentSpaceSceneShadowQuality;
  }

  /** Carbon GetLightData (cpp:695-698): the frame's resolved records, borrowed. */
  @carbon.method
  @impl.implemented
  GetLightData()
  {
    return this.#records;
  }

  /** Carbon GetVolumetricLights (cpp:707-710): indices into GetLightData, borrowed. */
  @carbon.method
  @impl.implemented
  GetVolumetricLights()
  {
    return this.#volumetricLights;
  }

  /** Carbon GetShadowCastingLights (cpp:688-691): empty under the shipping pin, kept for signature parity. */
  @carbon.method
  @impl.implemented
  GetShadowCastingLights()
  {
    return this.#shadowCastingLights;
  }

  /**
   * Non-Carbon: the frame clock the packed light sets sample their curves
   * with. Carbon's sets read the renderer's clock; the GPU-free runtime
   * threads it through the manager the sets already hold.
   */
  @impl.custom
  @impl.reason("Non-Carbon seam: the packed sets need the frame time for curve sampling and the manager is the one object every GetLights implementation already receives.")
  GetAnimationTime()
  {
    return this.#animationTime;
  }

  /** Sets the frame clock GetAnimationTime reports. */
  @impl.custom
  @impl.reason("Setter half of the non-Carbon frame-clock seam.")
  SetAnimationTime(seconds)
  {
    this.#animationTime = Number(seconds) || 0;
  }

  /** The packed PerLightData bytes for the AL to upload, borrowed (contract layout, 3 RGBA32 texels per light). */
  @impl.custom
  @impl.reason("AL seam: Trinity owns the packed description bytes; the AL realizes LightBuffer from this view (precedent: Tr2DataTextureManager.GetPackedBlocks).")
  GetLightBufferData()
  {
    return this.#packed.subarray(0, this.#packedCount * FLOATS_PER_LIGHT);
  }

  /** The number of packed lights in GetLightBufferData. */
  @impl.custom
  @impl.reason("AL seam companion to GetLightBufferData.")
  GetLightCount()
  {
    return this.#packedCount;
  }

  /** Monotonic revision of the packed data, bumped by ResolveLightData, so the AL can skip unchanged re-uploads. */
  @impl.custom
  @impl.reason("Non-Carbon extension: cheaper than the AL diffing a typed array; Carbon re-uploads unconditionally.")
  GetDataRevision()
  {
    return this.#revision;
  }

  /** Frustum cull + pixel-size cutoff, returning the fade-band dimming factor (0 = rejected). Cull applies only when a frustum was set. */
  #CullAndDim(position, radius)
  {
    if (!this.#frustum) return 1;
    if (!this.#frustum.IsSphereVisible(position, radius)) return 0;
    const size = this.#frustum.GetPixelSizeAccross(position, radius);
    if (!(size > this.#adjustedCutoff)) return 0;
    // Contract §"Colour carries the radius": the fade band sits ABOVE the
    // cutoff - absent at the cutoff, full brightness FADE_SIZE above it.
    return Math.min((size - this.#adjustedCutoff) / FADE_SIZE, 1);
  }

  /**
   * Returns the light's projected pixel size, or its radius when no frustum is
   * set.
   */
  #ScreenSize(record)
  {
    if (!this.#frustum) return record.radius;
    return this.#frustum.GetPixelSizeAccross(record.position, record.radius);
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
   * The first-sight map remains only for foreign profile objects that
   * expose no GetTextureIndex.
   */
  #ProfileSlot(profile)
  {
    if (!profile) return 0;
    if (typeof profile.GetTextureIndex === "function")
    {
      let index = profile.GetTextureIndex();
      if (index < 0 && typeof profile.RegisterProfileElement === "function")
      {
        const payload = typeof profile.GetPayload === "function" ? profile.GetPayload() : null;
        if (payload && payload.samples)
        {
          const element = Tr2LightManager.getLightProfileArray().AddElement(payload);
          if (element.IsValid())
          {
            profile.RegisterProfileElement(element);
            index = element.GetElementIndex();
          }
        }
      }
      return index >= 0 ? index + 1 : 0;
    }
    let slot = this.#profileSlots.get(profile);
    if (slot === undefined)
    {
      slot = this.#profileSlots.size;
      this.#profileSlots.set(profile, slot);
    }
    return slot + 1;
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
    if (!Tr2LightManager.#lightProfileArray)
    {
      Tr2LightManager.#lightProfileArray = new Tr2TextureArray();
    }
    return Tr2LightManager.#lightProfileArray;
  }

  static #lightProfileArray = null;

  /** Packs #records into the 48-byte-per-light buffer per the contract layout. */
  #Pack()
  {
    const count = Math.min(this.#records.length, LIGHT_BUFFER_SIZE);
    for (let i = 0; i < count; i++)
    {
      const record = this.#records[i];
      const f = i * FLOATS_PER_LIGHT;

      // Texel 0: position + radius, four f32.
      this.#packed[f] = record.position[0];
      this.#packed[f + 1] = record.position[1];
      this.#packed[f + 2] = record.position[2];
      this.#packed[f + 3] = record.radius;

      // Texel 1: colour (premultiplied at Add time) + the packed word -
      // innerRadius f16 low, flags u16 high with the biased profile slot in
      // bits 4-15 (contract §"The packed flag word").
      this.#packed[f + 4] = record.color[0];
      this.#packed[f + 5] = record.color[1];
      this.#packed[f + 6] = record.color[2];
      const flagsWord = (record.flags & 0xF) | (this.#ProfileSlot(record.lightProfile) << 4);
      this.#packedBits[f + 7] = toHalf(record.innerRadius) | ((flagsWord & 0xFFFF) << 16);

      // Texel 2: direction as three f16, projectionPlaneDistance, the two
      // angles, then the shadow union (h:70-84, MSVC low-bit-first layout:
      // bits 0-1 padding, 2-11 scale, 12-21 offsetX, 22-31 offsetY; the
      // raytraced mask shares the word - the paths are exclusive by
      // quality). All zeros under the shipping pin, exactly as before.
      this.#packedBits[f + 8] = toHalf(record.direction[0]) | (toHalf(record.direction[1]) << 16);
      this.#packedBits[f + 9] = toHalf(record.direction[2]) | (toHalf(record.projectionPlaneDistance) << 16);
      this.#packedBits[f + 10] = toHalf(record.outerAngle) | (toHalf(record.innerAngle) << 16);
      this.#packedBits[f + 11] = this.#currentSpaceSceneShadowQuality === ShadowQuality.SHADOW_RAYTRACED
        ? (record.raytracingShadowMask ?? 0) & 0xFFFF
        : (((record.shadowMapScale ?? 0) & 0x3FF) << 2)
          | (((record.shadowMapOffsetX ?? 0) & 0x3FF) << 12)
          | (((record.shadowMapOffsetY ?? 0) & 0x3FF) << 22);
    }
    this.#packedCount = count;
  }
}
