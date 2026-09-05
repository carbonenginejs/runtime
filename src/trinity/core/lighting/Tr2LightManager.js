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
// SHIPPING BEHAVIOUR PIN: Carbon builds with g_useDynamicLightsShadows =
// false (cpp:21-22). With it false, ResolveLightData returns after the
// volumetric pass (cpp:568-571), AddLight always strips FLAG_CASTS_SHADOWS
// (cpp:359-365), and the whole atlas/raytracing surface is dead. This port
// pins the same value, which is why the atlas half is absent rather than
// stubbed.
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
import { vec3 } from "#math/vec3";
import { ShadowQuality } from "../../generated/trinityCore/enums.js";

// Tr2LightManager.cpp:30-48 - copied verbatim; the buffer sizes are the ABI
// the AL uploads against.
const LIGHT_BUFFER_SIZE = 1024;
const CUTOFF_PIXEL_SIZE = 7;
const FADE_SIZE = 5;
const MAX_NUM_VOLUMETRIC_LIGHTS = 16;
const INFINITE_SIZE_CLAMP = 1 << 14;
const FLOATS_PER_LIGHT = 12; // 48 bytes / 3 RGBA32 texels

/** Encodes one float as IEEE binary16 bits (no Float16Array in this runtime). */
function toHalf(value)
{
  const f32 = toHalf.f32 ?? (toHalf.f32 = new Float32Array(1));
  const u32 = toHalf.u32 ?? (toHalf.u32 = new Uint32Array(f32.buffer));
  f32[0] = value;
  const bits = u32[0];
  const sign = (bits >>> 16) & 0x8000;
  let exponent = (bits >>> 23) & 0xFF;
  let mantissa = bits & 0x7FFFFF;
  if (exponent === 0xFF) return sign | 0x7C00 | (mantissa ? 0x200 : 0);
  exponent = exponent - 127 + 15;
  if (exponent >= 0x1F) return sign | 0x7C00;
  if (exponent <= 0)
  {
    if (exponent < -10) return sign;
    mantissa |= 0x800000;
    return sign | (mantissa >> (14 - exponent));
  }
  return sign | (exponent << 10) | (mantissa >> 13);
}

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
   * Carbon SetShadowQuality (cpp:262-295) records the scene's quality; the
   * frame-mask collapse and atlas-settings recompute exist only to size the
   * shadow atlas, which is dead under the pinned
   * g_useDynamicLightsShadows=false, so only the observable half is kept.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The nextFrameShadowQuality mask collapse and atlas-settings recompute size the shadow atlas, which is dead under Carbon's shipping g_useDynamicLightsShadows=false pin; the observable per-scene quality is kept.")
  SetShadowQuality(quality, _frameCounter = 0)
  {
    this.#currentSpaceSceneShadowQuality = Number(quality) || 0;
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

    record.flags &= ~Tr2LightManager.Flags.CASTS_SHADOWS;

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
   * and the shadow-caster/atlas half is dead under the shipping pin
   * (cpp:568-571 early-outs before it). The packed buffer is then built:
   * byte layout per the contract, profile slots biased by one into flag bits
   * 4-15.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Shadow-caster selection and atlas packing sit past Carbon's own g_useDynamicLightsShadows=false early-out and are deferred with it; the volumetric selection and the packed-buffer build are ported.")
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

    this.#Pack();
    this.#revision += 1;
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

  #ScreenSize(record)
  {
    if (!this.#frustum) return record.radius;
    return this.#frustum.GetPixelSizeAccross(record.position, record.radius);
  }

  /** The slice a profile object occupies, assigned on first sight; the +1 bias is applied at pack time. */
  #ProfileSlot(profile)
  {
    if (!profile) return 0;
    let slot = this.#profileSlots.get(profile);
    if (slot === undefined)
    {
      slot = this.#profileSlots.size;
      this.#profileSlots.set(profile, slot);
    }
    return slot + 1;
  }

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
      // angles, then the shadow union (zeroed - dead under the shipping pin).
      this.#packedBits[f + 8] = toHalf(record.direction[0]) | (toHalf(record.direction[1]) << 16);
      this.#packedBits[f + 9] = toHalf(record.direction[2]) | (toHalf(record.projectionPlaneDistance) << 16);
      this.#packedBits[f + 10] = toHalf(record.outerAngle) | (toHalf(record.innerAngle) << 16);
      this.#packedBits[f + 11] = 0;
    }
    this.#packedCount = count;
  }
}
