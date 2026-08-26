// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud2.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, type } from "#schema";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { ReflectionMode, RenderingMode, TriBatchType } from "#consts/graphics";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { Tr2PerObjectData } from "../../core/rawData/Tr2PerObjectData.js";
import { Tr2RenderBatch } from "../../core/batch/Tr2RenderBatch.js";
import { TriFrustumOrtho } from "../../core/view/TriFrustumOrtho.js";
import { Tr2RenderReason, Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { withITr2Renderable } from "../../core/ITr2Renderable.js";

// Carbon std::numeric_limits<float>::max() (cpp:916). The renderable-side sort
// value is a finite float32, NOT Infinity - downstream distance sums must stay
// finite.
const FLOAT32_MAX = 3.4028234663852886e38;

const IDENTITY = mat4.create();

// Module scratch (per-frame paths - never allocate in the hot loop).
const INV_SCRATCH = mat4.create();
const WV_SCRATCH = mat4.create();
const BASIS_SCRATCH = mat4.create();
const LIGHT_VIEW_SCRATCH = mat4.create();
const WORLD_LIGHT_SCRATCH = mat4.create();
const ORTHO_SCRATCH = mat4.create();
const CORNER_MIN_SCRATCH = vec3.create();
const CORNER_MAX_SCRATCH = vec3.create();
const CORNER_SCRATCH = vec3.create();
const SHIFT_SCRATCH = vec3.create();
const SUN_SCRATCH = vec3.create();
const SCALE_SCRATCH = vec3.create();
const BOUNDS_MIN_SCRATCH = vec3.create();
const BOUNDS_MAX_SCRATCH = vec3.create();
const LIGHT_SCRATCH = { position: vec3.create(), radius: 0, color: vec3.create() };

/** Carbon OrthoNormalBasisZ (math Matrix_inline.h:531-546): identity; row Z =
 * Normalize(z); X seeded (0,1,0) when |Z.x| > 0.99 else (1,0,0); Y =
 * Normalize(Cross(X, Z)); X = Cross(Y, Z). Carbon's basis rows land at gl flat
 * [0..2]/[4..6]/[8..10] on the shared byte layout - single-matrix build, no
 * composition, no operand swap. A zero-length z NaNs exactly as Carbon's
 * Normalize does. */
function OrthoNormalBasisZ(out, z)
{
  mat4.identity(out);
  const zl = Math.hypot(z[0], z[1], z[2]);
  const zx = z[0] / zl;
  const zy = z[1] / zl;
  const zz = z[2] / zl;
  out[8] = zx;
  out[9] = zy;
  out[10] = zz;
  const xx = Math.abs(zx) > 0.99 ? 0 : 1;
  const xy = Math.abs(zx) > 0.99 ? 1 : 0;
  // Y = Normalize(Cross(X, Z)) with xz = 0 on either seed.
  let yx = xy * zz;
  let yy = -xx * zz;
  let yz = xx * zy - xy * zx;
  const yl = Math.hypot(yx, yy, yz);
  yx /= yl;
  yy /= yl;
  yz /= yl;
  out[4] = yx;
  out[5] = yy;
  out[6] = yz;
  // X = Cross(Y, Z).
  out[0] = yy * zz - yz * zy;
  out[1] = yz * zx - yx * zz;
  out[2] = yx * zy - yy * zx;
  return out;
}

/** Carbon OrthoOffCenterMatrix (math Matrix_inline.h:749-765): D3D-style
 * z-in-[0,1] off-center orthographic projection. Deliberately NOT gl-matrix's
 * mat4.ortho (GL z-in-[-1,1], different off-center terms). Carbon m[i][j]
 * lands at gl flat [i*4+j] on the shared byte layout. */
function OrthoOffCenterMatrix(out, l, r, b, t, zn, zf)
{
  mat4.identity(out);
  out[0] = 2 / (r - l);
  out[5] = 2 / (t - b);
  out[10] = 1 / (zn - zf);
  out[12] = -1 - 2 * l / (r - l);
  out[13] = 1 + 2 * t / (b - t);
  out[14] = zn / (zn - zf);
  return out;
}

/** Carbon TransformNormal(v, M) - row-vector basis-only transform (no
 * translation): out_j = sum_i v_i * M[i][j], rows at gl flat [0..2]/[4..6]/
 * [8..10]. vec3.transformMat4 would add the translation - do not use it. */
function TransformNormal(out, v, m)
{
  const x = v[0];
  const y = v[1];
  const z = v[2];
  out[0] = x * m[0] + y * m[4] + z * m[8];
  out[1] = x * m[1] + y * m[5] + z * m[9];
  out[2] = x * m[2] + y * m[6] + z * m[10];
  return out;
}

/** A volumetric cloud entity that renders as a raymarched unit-cube volume with its own lightmap, shadow map and lighting, and can also contribute reflection batches. */
@type.define({ className: "EveChildCloud2", family: "eve/child" })
export class EveChildCloud2 extends withITr2Renderable(EveSpaceObjectChild)
{

  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("ReflectionMode")
  reflectionMode = 0;

  /** m_minVisibleQuality (Tr2VolumerticQuality - enum Tr2VolumerticQuality) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("Tr2VolumerticQuality")
  minVisibleQuality = 0;

  /** m_sortingModifier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sortingModifier = 0;

  /** m_animation (Tr2TextureAnimationPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2TextureAnimation")
  animation = null;

  /** m_shadowMapDS (Tr2DepthStencilPtr) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.objectRef("Tr2DepthStencil")
  shadowMapDS = null;

  /** m_lightMap (Tr2TextureReferencePtr) [READ] */
  @io.read
  @type.objectRef("Tr2TextureReference")
  lightmap = null;

  /** m_lightmapSizeScale (float) [READ] */
  @io.read
  @type.float32
  lightmapSizeScale = 0;

  /** m_lights (PTr2LightVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2Light")
  lights = [];

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minScreenSize = 0;

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  translation = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.create();

  /** m_reflectionEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  reflectionEffect = null;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  effect = null;

  /** m_noiseTextureSize (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  noiseTextureSize = 0;

  /** m_mapOffsets[0] (Vector3) [READ] */
  @io.read
  @type.vec3
  mapOffset0 = vec3.create();

  /** m_mapOffsets[1] (Vector3) [READ] */
  @io.read
  @type.vec3
  mapOffset1 = vec3.create();

  /** m_mapOffsets[2] (Vector3) [READ] */
  @io.read
  @type.vec3
  mapOffset2 = vec3.create();

  /** m_castShadows (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  castShadows = false;

  /** m_receiveShadows (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  receiveShadows = false;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_mapTiling[1] (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  detailTiling1 = vec3.create();

  /** m_mapTiling[2] (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  detailTiling2 = vec3.create();

  /** m_mapTiling[0] (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  textureTiling = vec3.create();

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = false;

  // --- Runtime state (Carbon ctor cpp:72-118; not persisted). NOTE: the
  // generated persisted defaults above are schema zero-values and DIVERGE from
  // Carbon's ctor defaults (display/castShadows/receiveShadows true,
  // sortingModifier 1, noiseTextureSize 32, lightmapSizeScale 0.5,
  // reflectionMode REFLECT_NEVER, scaling (1,1,1), mapTiling all (1,1,1)).
  // Hydrated documents overwrite them; the divergence for default-constructed
  // objects is deliberate schema policy, recorded here rather than "fixed". ---

  /** m_localTransform - stamped by UpdateAsyncronous (cpp:689). */
  localTransform = mat4.create();

  /** m_worldTransform - stamped by UpdateAsyncronous (cpp:693). */
  worldTransform = mat4.create();

  /** m_boundingSphere (CcpMath::Sphere) - the TriFrustum sphere-duck shape. */
  boundingSphere = { center: vec3.create(), radius: 0 };

  /** m_hasUpdated (false until the first UpdateAsyncronous). */
  hasUpdated = false;

  /** m_adjustedMinScreenSize = minScreenSize * lodFactor (cpp:706). */
  adjustedMinScreenSize = 0;

  /** m_currentQuality (cpp:85) - Tr2VolumerticQuality.High. */
  currentQuality = 2;

  /** m_lightmapDirty (cpp:89). */
  lightmapDirty = true;

  /** m_renderedLastFrame (cpp:90). */
  renderedLastFrame = true;

  /** m_effectHash - effect identity tracked by UpdateSyncronous (cpp:625-633). */
  effectHash = 0;

  /** Unscaled lightmap dimensions - Carbon discovers them from the effect's
   * DensityMap resource (cpp:634-665, engine-owned in JS; 0 fail-closes
   * UpdateVolumetricLightmap). */
  lightmapWidth = 0;

  /** m_lightmapHeight - see lightmapWidth. */
  lightmapHeight = 0;

  /** m_lightmapDepth - see lightmapWidth. */
  lightmapDepth = 0;

  /** m_lightmapDirtyOffset - the incremental lightmap update cursor. */
  lightmapDirtyOffset = 0;

  /** m_prevSunDirection (SetSceneInformation's re-dirty threshold state). */
  prevSunDirection = vec3.create();

  /** m_localSunDirection (SetSceneInformation cpp:407). */
  localSunDirection = vec3.create();

  /** m_depthSlices - SceneInformation::depthSliceCount = 4
   * (ITr2VolumetricRenderable.h:26). */
  depthSlices = new Float32Array(4);

  /** m_targetWidth - Carbon leaves it uninitialized until SetSceneInformation;
   * JS zeroes (targetInvSize then divides by zero to Infinity, matching
   * Carbon's float semantics on garbage-free zero). */
  targetWidth = 0;

  /** m_targetHeight - see targetWidth. */
  targetHeight = 0;

  /** m_lightViewProj - Carbon: uninitialized memory until SetupShadowFrustum;
   * JS: identity. */
  lightViewProj = mat4.create();

  /** m_shadowMapSize (cpp:101). */
  shadowMapSize = 512;

  /** The global "DepthShadowMap" variable handle Carbon registers in the ctor
   * (cpp:115) - the variable store is engine-owned in JS, so the handle is an
   * engine-injected duck. */
  depthShadowMapHandle = null;

  /** Carbon EveChildCloud2::RegisterComponents (EveChildCloud2.cpp:148-163):
   * LightOwner when lights are authored; VolumetricRenderable UNCONDITIONAL;
   * ReflectionRenderable only when ShouldReflect && display &&
   * reflectionEffect. Note: no whole-block display gate in Carbon. No
   * UnRegisterComponents override (base no-op; EveEntity::UnRegister already
   * removes the components, EveEntity.cpp:90). */
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      if (this.lights.length)
      {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
      registry.RegisterComponent(EveComponentType.VolumetricRenderable, this);
      if (ShouldReflect(this.reflectionMode) && this.display && this.reflectionEffect)
      {
        registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
      }
    }
  }

  /** Carbon EveChildCloud2::UpdateSyncronous (cpp:621-685): an effect-hash
   * change invalidates the lightmap and zeroes its dimensions (cpp:625-633);
   * the DensityMap-driven dimension discovery and the empty-lightmap fallback
   * (cpp:634-674) are GPU/resource work; the texture animation advances gated
   * on UpdateOnlyWhenRendered/renderedLastFrame (cpp:677-683) and
   * renderedLastFrame is cleared every pass (cpp:684) - the flag is only
   * re-stamped by the volumetric batch path (GetVolumetricBatches cpp:283),
   * deliberately NOT by the reflection path. */
  @impl.adapted
  @impl.reason("DensityMap texture discovery and empty-lightmap creation (cpp:634-674) are engine-owned resource work - lightmapWidth stays 0 until the engine stamps it, which fail-closes UpdateVolumetricLightmap; the hash invalidation, animation gate and renderedLastFrame contract are ported.")
  UpdateSyncronous(updateContext, _params)
  {
    if (this.effect)
    {
      const hash = this.effect.GetHashValue?.() ?? this.effect;
      if (this.effectHash !== hash)
      {
        this.effectHash = hash;
        this.lightmapDirty = true;
        this.lightmapWidth = 0;
        this.lightmapHeight = 0;
        this.lightmapDepth = 0;
      }
    }

    if (this.animation)
    {
      if (!this.animation.UpdateOnlyWhenRendered?.() || this.renderedLastFrame)
      {
        this.animation.AdvanceTime?.(updateContext?.GetDeltaT?.() ?? 0);
      }
    }
    this.renderedLastFrame = false;
  }

  /** Carbon EveChildCloud2::UpdateAsyncronous (cpp:687-708): local SRT
   * transform (cpp:689); world = localTransform * parent - Carbon row-vector,
   * local applies first, so the gl-matrix operands swap (cpp:693); bounding
   * sphere = CcpMath::Sphere(unit cube, world) which transforms ONLY the min
   * and max corners (math Sphere.cpp:10-17 - the cheap two-corner form, not an
   * 8-corner bound; preserved); map-offset scroll from the origin-shift-
   * corrected world movement rotated into local space (cpp:697-704 - QUIRK
   * kept verbatim: the .z offset scrolls by mapTiling.y, cpp:703); adjusted
   * min screen size (cpp:706); hasUpdated stamp (cpp:707). */
  @impl.implemented
  UpdateAsyncronous(updateContext, params = {})
  {
    // Carbon TransformationMatrix(m_scaling, m_rotation, m_translation)
    // (cpp:689) - argument order differs, matrix identical.
    mat4.fromRotationTranslationScale(this.localTransform, this.rotation, this.translation, this.scaling);

    const parent = params?.localToWorldTransform ?? IDENTITY;
    const w = this.worldTransform;
    const prevX = w[12];
    const prevY = w[13];
    const prevZ = w[14];
    // Carbon (row-vector): m_localTransform * parent - local first.
    mat4.multiply(w, parent, this.localTransform);

    // CcpMath::Sphere(AxisAlignedBox(-0.5..0.5), world) (cpp:695).
    vec3.set(CORNER_MIN_SCRATCH, -0.5, -0.5, -0.5);
    vec3.transformMat4(CORNER_MIN_SCRATCH, CORNER_MIN_SCRATCH, w);
    vec3.set(CORNER_MAX_SCRATCH, 0.5, 0.5, 0.5);
    vec3.transformMat4(CORNER_MAX_SCRATCH, CORNER_MAX_SCRATCH, w);
    const center = this.boundingSphere.center;
    center[0] = (CORNER_MIN_SCRATCH[0] + CORNER_MAX_SCRATCH[0]) * 0.5;
    center[1] = (CORNER_MIN_SCRATCH[1] + CORNER_MAX_SCRATCH[1]) * 0.5;
    center[2] = (CORNER_MIN_SCRATCH[2] + CORNER_MAX_SCRATCH[2]) * 0.5;
    this.boundingSphere.radius = vec3.distance(CORNER_MIN_SCRATCH, CORNER_MAX_SCRATCH) * 0.5;

    // shift = -originShift + (new - previous world translation), then rotated
    // into local space with TransformNormal(shift, Inverse(world)) (cpp:697-698).
    const originShift = updateContext?.GetOriginShift?.();
    SHIFT_SCRATCH[0] = (originShift ? -originShift[0] : 0) + w[12] - prevX;
    SHIFT_SCRATCH[1] = (originShift ? -originShift[1] : 0) + w[13] - prevY;
    SHIFT_SCRATCH[2] = (originShift ? -originShift[2] : 0) + w[14] - prevZ;
    // Carbon's one-arg Inverse returns the INPUT unchanged on a singular
    // matrix (math Matrix.cpp:12-16) and the scroll still runs - mirrored.
    const inverse = mat4.invert(INV_SCRATCH, w) ?? w;
    TransformNormal(SHIFT_SCRATCH, SHIFT_SCRATCH, inverse);
    const offsets = [this.mapOffset0, this.mapOffset1, this.mapOffset2];
    const tilings = [this.textureTiling, this.detailTiling1, this.detailTiling2];
    for (let i = 0; i < 3; ++i)
    {
      const offset = offsets[i];
      const tiling = tilings[i];
      offset[0] = (offset[0] + SHIFT_SCRATCH[0] * tiling[0]) % 1;
      offset[1] = (offset[1] + SHIFT_SCRATCH[1] * tiling[1]) % 1;
      // Carbon bug preserved verbatim: .z scrolls by mapTiling.y (cpp:703).
      offset[2] = (offset[2] + SHIFT_SCRATCH[2] * tiling[1]) % 1;
    }

    this.adjustedMinScreenSize = this.minScreenSize * (updateContext?.GetLodFactor?.() ?? 1);
    this.hasUpdated = true;
  }

  /** Carbon EveChildCloud2::GetBoundingSphere (cpp:226-230): the packed
   * (center, radius) cloud sphere, unconditionally true. IEveSpaceObjectChild
   * override - parent bounds unions consume it optional-chained. */
  @impl.implemented
  GetBoundingSphere(out = new Float32Array(4), _query = 0)
  {
    out[0] = this.boundingSphere.center[0];
    out[1] = this.boundingSphere.center[1];
    out[2] = this.boundingSphere.center[2];
    out[3] = this.boundingSphere.radius;
    return true;
  }

  /** Carbon EveChildCloud2::GetLocalToWorldTransform (cpp:232-235); the
   * optional out follows the EveChildContainer copy-out shape. */
  @impl.implemented
  GetLocalToWorldTransform(out = null)
  {
    if (out)
    {
      return mat4.copy(out, this.worldTransform);
    }
    return this.worldTransform;
  }

  /** Carbon EveChildCloud2::IsVisible (cpp:837-852): display + one-arg
   * IsSphereVisible (the back-plane-ignored TriFrustum quirk applies), then
   * the Sphere-duck GetPixelSizeAccross (Est path) against minScreenSize *
   * the LIVE lodFactor (not the adjusted stamp). Carbon's override of the
   * defaulted ITr2Renderable::IsVisible (h:47-50 returns true) - without it
   * the reflection gather would treat the cloud as always visible. */
  @impl.implemented
  IsVisible(updateContext)
  {
    const frustum = updateContext?.GetFrustum?.();
    if (!frustum)
    {
      return false;
    }
    const sphere = this.boundingSphere;
    if (!this.display || !frustum.IsSphereVisible(sphere.center, sphere.radius))
    {
      return false;
    }
    const screenSize = frustum.GetPixelSizeAccross(sphere);
    if (screenSize < this.minScreenSize * (updateContext?.GetLodFactor?.() ?? 1))
    {
      return false;
    }
    return true;
  }

  /** Carbon EveChildCloud2::HasValidTransform (cpp:309-317): determinant is
   * nonzero and finite. */
  @impl.implemented
  HasValidTransform()
  {
    const det = mat4.determinant(this.worldTransform);
    return det !== 0 && Number.isFinite(det);
  }

  /** Carbon EveChildCloud2::IsLightmapDirty (cpp:748-751). */
  @impl.implemented
  IsLightmapDirty()
  {
    return this.lightmapDirty;
  }

  /** Carbon EveChildCloud2::MarkLightmapDirty (cpp:753-757): also zeroes the
   * dirty offset (contrast SetSceneInformation's scale-change path, which
   * sets the flag WITHOUT resetting the offset - cpp:398-402). */
  @impl.implemented
  MarkLightmapDirty(dirty)
  {
    this.lightmapDirty = !!dirty;
    this.lightmapDirtyOffset = 0;
  }

  /** Carbon EveChildCloud2::GetLights (cpp:732-746): display gate only (no
   * hasUpdated gate, unlike EveChildContainer), average world-basis-row-length
   * scaling (Carbon LengthEst; exact hypot is the accepted divergence - single
   * matrix reads, no composition), each light submitted with the world
   * transform through the duck-typed manager. Inside Tr2Light::AddLight
   * Carbon composes boneTransform * transform (Tr2Light.cpp:132) - that swap
   * belongs to the Tr2Light port, not here. */
  @impl.implemented
  GetLights(lightManager)
  {
    if (!this.display)
    {
      return;
    }
    const m = this.worldTransform;
    const scaling = (
      Math.hypot(m[0], m[1], m[2]) +
      Math.hypot(m[4], m[5], m[6]) +
      Math.hypot(m[8], m[9], m[10])
    ) / 3;
    for (const light of this.lights)
    {
      light?.AddLight?.(lightManager, m, scaling);
    }
  }

  /** Carbon's two GetSortValue overloads, dispatched on argument presence:
   * the ITr2VolumetricRenderable frustum form (cpp:237-242) - view distance
   * minus |authored local scaling| * sortingModifier, consumed by the
   * volumetric renderer's DESCENDING stable sort (farthest first,
   * Tr2VolumetricsRenderer.cpp:276-287) - and the ITr2Renderable zero-arg
   * form (cpp:914-917) - float32 max (finite, NOT Infinity), so the
   * transparent reflection pass sorts the cloud to draw first. */
  @impl.implemented
  GetSortValue(frustum = null)
  {
    if (!frustum)
    {
      return FLOAT32_MAX;
    }
    const viewPos = frustum.viewPos ?? frustum.m_viewPos;
    const w = this.worldTransform;
    const dx = viewPos[0] - w[12];
    const dy = viewPos[1] - w[13];
    const dz = viewPos[2] - w[14];
    return Math.hypot(dx, dy, dz) - vec3.length(this.scaling) * this.sortingModifier;
  }

  /** Carbon EveChildCloud2::GetVolumetricBatches (cpp:244-284), exact gate
   * order: quality (cpp:246), display+hasUpdated+frustum sphere (cpp:250),
   * Sphere-duck pixel size vs the adjusted min screen size (cpp:256-260),
   * HasValidTransform (cpp:262), unit-cube buffers + effect shader
   * (cpp:267-274), then ONE transparent volumetric batch with the real
   * screenSize per-object data and Carbon's 36-index draw (cpp:276-281).
   * Stamps renderedLastFrame (cpp:283) - the texture-animation keep-alive.
   * Returns whether a batch was committed (JS addition; Carbon returns void). */
  @impl.adapted
  @impl.reason("The procedural unit-cube vertex/index buffers and declaration (OnPrepareResources cpp:453-532) are engine-realized, so the buffer-validity gate (cpp:267-270) and shader-state gate (cpp:271-274) reduce to the effect presence check; the batch records the effect, per-object data and draw arguments for the engine to bind the cube.")
  GetVolumetricBatches(frustum, batches)
  {
    if (this.currentQuality < this.minVisibleQuality)
    {
      return false;
    }
    const sphere = this.boundingSphere;
    const isVisible = this.display && this.hasUpdated &&
      frustum?.IsSphereVisible?.(sphere.center, sphere.radius) === true;
    if (!isVisible)
    {
      return false;
    }

    // Sphere duck routes to the Est estimator, matching Carbon's Sphere
    // overload (cpp:256; TriFrustum cpp:295-298).
    const screenSize = frustum.GetPixelSizeAccross(sphere);
    if (screenSize < this.adjustedMinScreenSize)
    {
      return false;
    }
    if (!this.HasValidTransform())
    {
      return false;
    }
    if (!this.effect)
    {
      return false;
    }

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(this.GetPerObjectData(batches, screenSize));
    batch.SetDrawIndexedInstanced(12 * 3, 1, 0, 0, 0);
    const committed = batches?.Commit?.(batch) === true;

    this.renderedLastFrame = true;
    return committed;
  }

  /** Carbon EveChildCloud2::UpdateVolumetricLightmap (cpp:319-382): the
   * scene-facing contract is the gates and the bool return - true means "this
   * cloud consumed the frame's single scene-wide lightmap budget"
   * (Tr2VolumetricsRenderer::ProcessComponentsUntil stops at the FIRST true,
   * cpp:219-221). Slice budget: VOXELS_PER_UPDATE = 6400000 * scale^3;
   * slices = max(VOXELS / (scaledHeight * scaledDepth), 1) (cpp:354-355).
   * QUIRK verbatim: the dispatch group Y/Z counts use the UNSCALED dims while
   * the slice count uses the scaled ones (cpp:359-361). Success advances
   * lightmapDirtyOffset by slices; reaching scaledWidth completes the map
   * (dirty false, offset 0); failure resets the offset and returns false. */
  @impl.adapted
  @impl.reason("The 3D lightmap texture lifecycle, per-object upload and LightMap variable swaps (cpp:327-352, 363-372) are engine-owned; the GenerateLightmap dispatch is delegated to a renderContext.RunComputeShader duck and fail-closes to false when absent.")
  UpdateVolumetricLightmap(renderContext)
  {
    if (this.currentQuality < this.minVisibleQuality || !this.hasUpdated)
    {
      return false;
    }
    if (this.lightmapDirty && this.effect && this.lightmapWidth > 0 && this.HasValidTransform())
    {
      const scaledWidth = Math.max(1, Math.floor(this.lightmapWidth * this.lightmapSizeScale));
      const scaledHeight = Math.max(1, Math.floor(this.lightmapHeight * this.lightmapSizeScale));
      const scaledDepth = Math.max(1, Math.floor(this.lightmapDepth * this.lightmapSizeScale));

      const VOXELS_PER_UPDATE = Math.floor(6400000 * this.lightmapSizeScale ** 3);
      const slices = Math.max(Math.floor(VOXELS_PER_UPDATE / (scaledHeight * scaledDepth)), 1);
      const success = renderContext?.RunComputeShader?.(
        this.effect,
        "GenerateLightmap",
        slices,
        Math.floor((this.lightmapHeight + 7) / 8),
        Math.floor((this.lightmapDepth + 7) / 8)
      ) === true;
      if (success)
      {
        this.lightmapDirtyOffset += slices;
        if (this.lightmapDirtyOffset >= scaledWidth)
        {
          this.lightmapDirty = false;
          this.lightmapDirtyOffset = 0;
        }
        return true;
      }
      this.lightmapDirtyOffset = 0;
    }
    return false;
  }

  /** Carbon EveChildCloud2::SetSceneInformation (cpp:384-424): quality maps to
   * lightmapSizeScale (Low 0.1 / Medium 0.15 / default 0.25, cpp:386-397); a
   * scale change sets lightmapDirty WITHOUT resetting the dirty offset
   * (cpp:398-402 - asymmetric vs MarkLightmapDirty, preserved); copies the 4
   * depth slices; localSunDirection = Normalize(TransformNormal(sunDir,
   * Inverse(world))) (cpp:407 - single-matrix inverse + basis transform, no
   * composition); re-dirties the lightmap when the sun moved past
   * cos(5/180) - QUIRK verbatim: Carbon omits the degree conversion, so the
   * threshold is ~1.59 degrees, not 5 (cpp:408); stamps target dims; flips
   * the two cloud-shadow effect options (cpp:417-423). */
  @impl.adapted
  @impl.reason("Carbon dereferences m_effect with no null guard (cpp:417); the JS option writes are optional-chained. Everything else is verbatim, including the missing degree conversion in the sun-motion threshold.")
  SetSceneInformation(sceneInformation)
  {
    let lightmapSizeScale;
    switch (sceneInformation.quality)
    {
      case EveChildCloud2.Tr2VolumerticQuality.Low:
        lightmapSizeScale = 0.1;
        break;
      case EveChildCloud2.Tr2VolumerticQuality.Medium:
        lightmapSizeScale = 0.15;
        break;
      default:
        lightmapSizeScale = 0.25;
    }
    if (lightmapSizeScale !== this.lightmapSizeScale)
    {
      this.lightmapSizeScale = lightmapSizeScale;
      this.lightmapDirty = true;
    }
    this.currentQuality = sceneInformation.quality;

    for (let i = 0; i < 4; ++i)
    {
      this.depthSlices[i] = sceneInformation.depthSlices?.[i] ?? 0;
    }

    // Carbon's one-arg Inverse returns the INPUT unchanged on a singular
    // matrix (math Matrix.cpp:12-16) and the recompute still runs - mirrored.
    const inverse = mat4.invert(INV_SCRATCH, this.worldTransform) ?? this.worldTransform;
    TransformNormal(SUN_SCRATCH, sceneInformation.sunDirection, inverse);
    vec3.normalize(this.localSunDirection, SUN_SCRATCH);
    if (vec3.dot(this.prevSunDirection, this.localSunDirection) < Math.cos(5.0 / 180.0))
    {
      vec3.copy(this.prevSunDirection, this.localSunDirection);
      this.MarkLightmapDirty(true);
    }

    this.targetWidth = sceneInformation.targetWidth;
    this.targetHeight = sceneInformation.targetHeight;

    const receive = !!sceneInformation.receiveShadows && !!this.receiveShadows;
    this.effect?.SetOption?.(
      "CLOUD_SHADOWS",
      receive ? "CLOUD_SHADOWS_RECEIVE" : "CLOUD_SHADOWS_NONE"
    );
    this.effect?.SetOption?.(
      "CLOUD_SHADOW_ALGORITHM",
      receive && sceneInformation.raytracedShadows ? "CLOUD_SHADOWS_RAYTRACED" : "CLOUD_SHADOWS_CASCADED"
    );
  }

  /** Carbon EveChildCloud2::GetVolumetricShadowBatches (cpp:759-785): gated on
   * display + effect + castShadows, then the "Shadow" technique presence
   * (cpp:766-776); emits ONE alpha, declaration-less (NULL_DECLARATION,
   * cpp:782), non-indexed single-triangle batch with screenSize-1 per-object
   * data (cpp:778-784). Does NOT stamp renderedLastFrame. Returns whether the
   * batch was committed (JS addition). */
  @impl.adapted
  @impl.reason("The 'Shadow' technique gate applies only when a shader-state interface is realized - in GPU-free collection the engine drops the batch at realization otherwise; NULL_DECLARATION maps to declaration 0.")
  GetVolumetricShadowBatches(batches)
  {
    if (!this.display || !this.effect || !this.castShadows)
    {
      return false;
    }
    // cpp:766-776 - the "Shadow" technique must exist. The JS shader duck
    // (Tr2Shader.GetTechniqueIndex) returns an INDEX: -1 for missing, 0..n
    // for found - 0 is a valid technique (compare < 0, never truthiness).
    const shader = this.effect.GetShaderStateInterface?.();
    if (shader?.GetTechniqueIndex)
    {
      const technique = shader.GetTechniqueIndex("Shadow");
      if (technique === null || technique === undefined || technique < 0)
      {
        return false;
      }
    }

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(this.GetPerObjectData(batches, 1));
    batch.SetRenderingMode(RenderingMode.RM_ALPHA);
    batch.SetVertexDeclaration(0);
    batch.SetDrawInstanced(3, 1, 0, 0);
    return batches?.Commit?.(batch) === true;
  }

  /** Carbon EveChildCloud2::GetVolumetricShadowInfo (cpp:787-790): pure
   * delegation to SetupShadowFrustum. The scene calls this to build the
   * shadow-camera package before rendering casters into the cloud shadow map
   * (EveSpaceScene.cpp:2355-2371). */
  @impl.implemented
  GetVolumetricShadowInfo(shadowInfo, sunDir)
  {
    return this.SetupShadowFrustum(shadowInfo, sunDir);
  }

  /** Carbon EveChildCloud2::SetupShadowFrustum (cpp:886-907):
   * lightView = Inverse(OrthoNormalBasisZ(-sunDir)) (cpp:889 - single-matrix
   * build + invert); the unit-cube AABB transformed by worldTransform *
   * lightView - COMPOSITION, world applies first, so the gl-matrix operands
   * swap (cpp:893; all 8 corners, math AxisAlignedBox.cpp:9-33); max.z
   * extended by the 2,500,000 sun-ray magic constant (cpp:895); lightViewProj
   * = lightView * OrthoOffCenterMatrix(...) - COMPOSITION, lightView first,
   * operands swap (cpp:897), with Carbon's deliberately mirrored argument
   * order (max.x, min.x, max.y, min.y, -max.z, -min.z) and D3D z-in-[0,1]
   * formula both preserved; DeriveFrustum(lightView, aabb.min, aabb.max)
   * (cpp:900-901); outputs aabbMax / lightViewProj copy / shadowFrustum /
   * shadowMapSize (cpp:903-906). */
  @impl.implemented
  SetupShadowFrustum(shadowInfo, sunDir)
  {
    vec3.set(SUN_SCRATCH, -sunDir[0], -sunDir[1], -sunDir[2]);
    OrthoNormalBasisZ(BASIS_SCRATCH, SUN_SCRATCH);
    if (!mat4.invert(LIGHT_VIEW_SCRATCH, BASIS_SCRATCH))
    {
      mat4.identity(LIGHT_VIEW_SCRATCH);
    }

    // Carbon (row-vector): m_worldTransform * lightView - world first.
    mat4.multiply(WORLD_LIGHT_SCRATCH, LIGHT_VIEW_SCRATCH, this.worldTransform);
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let corner = 0; corner < 8; ++corner)
    {
      CORNER_SCRATCH[0] = (corner & 1) ? 0.5 : -0.5;
      CORNER_SCRATCH[1] = (corner & 2) ? 0.5 : -0.5;
      CORNER_SCRATCH[2] = (corner & 4) ? 0.5 : -0.5;
      vec3.transformMat4(CORNER_SCRATCH, CORNER_SCRATCH, WORLD_LIGHT_SCRATCH);
      minX = Math.min(minX, CORNER_SCRATCH[0]);
      minY = Math.min(minY, CORNER_SCRATCH[1]);
      minZ = Math.min(minZ, CORNER_SCRATCH[2]);
      maxX = Math.max(maxX, CORNER_SCRATCH[0]);
      maxY = Math.max(maxY, CORNER_SCRATCH[1]);
      maxZ = Math.max(maxZ, CORNER_SCRATCH[2]);
    }
    maxZ += 2500000;

    OrthoOffCenterMatrix(ORTHO_SCRATCH, maxX, minX, maxY, minY, -maxZ, -minZ);
    // Carbon (row-vector): lightView * ortho - lightView first.
    mat4.multiply(this.lightViewProj, ORTHO_SCRATCH, LIGHT_VIEW_SCRATCH);

    const shadowFrustum = new TriFrustumOrtho();
    vec3.set(BOUNDS_MIN_SCRATCH, minX, minY, minZ);
    vec3.set(BOUNDS_MAX_SCRATCH, maxX, maxY, maxZ);
    shadowFrustum.DeriveFrustum(LIGHT_VIEW_SCRATCH, BOUNDS_MIN_SCRATCH, BOUNDS_MAX_SCRATCH);

    shadowInfo.aabbMax = vec3.fromValues(maxX, maxY, maxZ);
    shadowInfo.lightViewProj = mat4.clone(this.lightViewProj);
    shadowInfo.shadowFrustum = shadowFrustum;
    shadowInfo.shadowMapSize = this.shadowMapSize;
    return shadowInfo;
  }

  /** Carbon EveChildCloud2::PrepareCloudShadowMap (cpp:792-826): the CPU
   * contract is the receiveShadows gate (cpp:796-799) and the bool return -
   * the scene calls SetCloudShadowMapHandle ONLY after a true return
   * (EveSpaceScene.cpp:2365-2368), which is what makes Carbon's unguarded
   * m_shadowMapDS dereference there safe. */
  @impl.adapted
  @impl.reason("Depth-stencil creation and the viewport/render-target pushes (cpp:801-823) are engine-owned, delegated to a renderContext duck; the gate and return contract are ported.")
  PrepareCloudShadowMap(renderContext)
  {
    if (!this.receiveShadows)
    {
      return false;
    }
    renderContext?.PrepareCloudShadowMap?.(this);
    return true;
  }

  /** Carbon EveChildCloud2::SetCloudShadowMapHandle (cpp:829-835): publish the
   * shadow depth-stencil into the global "DepthShadowMap" variable handle
   * (registered in the Carbon ctor, cpp:115). QUIRK: Carbon dereferences
   * m_shadowMapDS with no null guard - safe only via the
   * PrepareCloudShadowMap-first call order (see above). */
  @impl.adapted
  @impl.reason("The variable store is engine-owned (depthShadowMapHandle is an injected duck); Carbon's unguarded m_shadowMapDS dereference is optional-chained.")
  SetCloudShadowMapHandle()
  {
    if (this.shadowMapDS?.IsValid?.())
    {
      this.depthShadowMapHandle?.SetValue?.(this.shadowMapDS);
    }
  }

  /** Carbon EveChildCloud2::GetBatches (cpp:854-884): quality gate, then ONLY
   * the (REFLECTION, TRANSPARENT) type/reason pair produces anything
   * (cpp:860) - every other combination is a silent no-op; HasValidTransform
   * + unit-cube buffers + reflectionEffect gates (cpp:862-874); one alpha
   * batch with the hardcoded 10000 screen size forcing max lodFactor
   * (cpp:878). QUIRK: unlike GetVolumetricBatches this does NOT stamp
   * renderedLastFrame - reflection-only rendering does not keep texture
   * animations alive. Returns whether a batch was committed (JS addition). */
  @impl.adapted
  @impl.reason("Unit-cube buffers/declaration are engine-realized (as GetVolumetricBatches); the perObjectData parameter is unused because Carbon allocates the cloud's own with screenSize 10000 (cpp:878).")
  GetBatches(batches, batchType, _perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (this.currentQuality < this.minVisibleQuality)
    {
      return false;
    }
    if (reason !== Tr2RenderReason.TR2RENDERREASON_REFLECTION || batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT)
    {
      return false;
    }
    if (!this.HasValidTransform())
    {
      return false;
    }
    if (!this.reflectionEffect)
    {
      return false;
    }

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.reflectionEffect);
    batch.SetPerObjectData(this.GetPerObjectData(batches, 10000));
    batch.SetDrawIndexedInstanced(12 * 3, 1, 0, 0, 0);
    batch.SetRenderingMode(RenderingMode.RM_ALPHA);
    return batches?.Commit?.(batch) === true;
  }

  /** Carbon EveChildCloud2::HasTransparentBatches (cpp:909-912):
   * unconditionally true - the reflection gather always routes the cloud
   * through the transparent leg that feeds GetBatches' type/reason filter. */
  @impl.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Carbon's two GetPerObjectData overloads (public, screenSize 1:
   * cpp:919-927; private, caller screenSize: cpp:534-542): allocate from the
   * accumulator and populate. The GPU-free record carries the live object
   * reference plus the CPU-populated field block (cloudData); view-dependent
   * members are refreshed by the engine calling PopulatePerObjectData again
   * with its render context at realization (screenSize is stamped for that). */
  @impl.adapted
  @impl.reason("EveChildCloudPerObjectData's device constant buffers are engine-owned; the record carries the object reference, the collection-time screenSize and the CPU field block.")
  GetPerObjectData(accumulator = null, screenSize = 1)
  {
    const data = typeof accumulator?.Allocate === "function"
      ? accumulator.Allocate(Tr2PerObjectData)
      : new Tr2PerObjectData();
    if (!data)
    {
      return null;
    }
    data.object = this;
    data.screenSize = screenSize;
    data.cloudData = this.PopulatePerObjectData({}, screenSize);
    return data;
  }

  /** Carbon EveChildCloud2::PopulatePerObjectData (cpp:544-619) against the
   * PerObjectData block (EveChildCloud2.h:125-145). Compositions (Carbon
   * row-vector -> gl-matrix operands swap):
   *   - cpp:548/567 worldTransform * viewTransform (world first) ->
   *     mat4.multiply(WV, view, world); the cpp:567 transpose is folded into
   *     explicit element reads: viewDirection = TransformNormal((0,0,-1),
   *     worldViewT) = (-WV[2], -WV[6], -WV[10]); depthSliceN =
   *     -WV[14] - slice * WV[15].
   * Single-matrix sites (NO swap): the cpp:546/547/551 HLSL packing
   * transposes, cpp:550 TransformCoord with the inverted world, cpp:578
   * Decompose (mat4.getScaling). */
  @impl.adapted
  @impl.reason("Tr2Renderer's view/projection globals relocate onto the optional renderContext duck (identity/zero fallbacks when absent - the engine repopulates at realization); rand() maps to Math.random with a zero-size guard Carbon's UB-free ctor default (32) never needed; the Tr2Light Perlin flicker inside GetLight awaits the frame-clock seam.")
  PopulatePerObjectData(data, screenSize = 1, renderContext = null)
  {
    const w = this.worldTransform;
    // cpp:546 - packing transpose of a single matrix.
    data.world = mat4.transpose(mat4.create(), w);

    // cpp:547 - Transpose(Inverse(reversed-depth projection)); renderer
    // global (identity when the context duck is absent; a singular input
    // mirrors Carbon's Inverse-returns-input).
    data.projectionInv = mat4.create();
    const projection = renderContext?.GetReversedDepthProjectionTransform?.();
    if (projection)
    {
      if (!mat4.invert(data.projectionInv, projection))
      {
        mat4.copy(data.projectionInv, projection);
      }
      mat4.transpose(data.projectionInv, data.projectionInv);
    }

    // cpp:548-549 - Inverse(world * view), COMPOSITION: operands swap.
    // Singular product: Carbon's Inverse returns the input unchanged
    // (math Matrix.cpp:12-16) - mirrored.
    const view = renderContext?.GetViewTransform?.() ?? IDENTITY;
    mat4.multiply(WV_SCRATCH, view, w);
    data.worldViewInv = mat4.create();
    if (!mat4.invert(data.worldViewInv, WV_SCRATCH))
    {
      mat4.copy(data.worldViewInv, WV_SCRATCH);
    }
    mat4.transpose(data.worldViewInv, data.worldViewInv);

    // cpp:550 - TransformCoord(viewPosition, Inverse(world)) - single matrix;
    // same singular-input mirror.
    data.viewPosition = vec3.create();
    const viewPosition = renderContext?.GetViewPosition?.();
    if (viewPosition)
    {
      const inverseWorld = mat4.invert(INV_SCRATCH, w) ?? w;
      vec3.transformMat4(data.viewPosition, viewPosition, inverseWorld);
    }

    // cpp:551 - packing transpose (stamped by SetupShadowFrustum).
    data.lightViewProj = mat4.transpose(mat4.create(), this.lightViewProj);

    // cpp:553-560 - scaled lightmap dims + dirty offset.
    const scaledWidth = Math.max(1, Math.floor(this.lightmapWidth * this.lightmapSizeScale));
    const scaledHeight = Math.max(1, Math.floor(this.lightmapHeight * this.lightmapSizeScale));
    const scaledDepth = Math.max(1, Math.floor(this.lightmapDepth * this.lightmapSizeScale));
    data.lightmapDimensions = [scaledWidth, scaledHeight, scaledDepth, this.lightmapDirtyOffset];

    // cpp:562-565 - rand() % noiseTextureSize; nondeterministic by design.
    // The generated schema default 0 would be modulo-by-zero UB in Carbon
    // (its ctor default is 32) - guarded here.
    const noiseSize = this.noiseTextureSize >>> 0;
    data.noiseConfig = [
      noiseSize > 0 ? Math.floor(Math.random() * noiseSize) : 0,
      noiseSize > 0 ? Math.floor(Math.random() * noiseSize) : 0,
      noiseSize,
      noiseSize,
    ];

    // cpp:567-571 - Transpose(world * view) consumed by row-vector transforms;
    // ported as explicit element reads of the (already swapped) WV product.
    const wv = WV_SCRATCH;
    data.viewDirection = vec3.fromValues(-wv[2], -wv[6], -wv[10]);
    data.depthSlice0 = -wv[14] - this.depthSlices[0] * wv[15];
    data.depthSlice1 = -wv[14] - this.depthSlices[1] * wv[15];
    data.depthSlice2 = -wv[14] - this.depthSlices[2] * wv[15];

    // cpp:573.
    data.sunDirection = vec3.fromValues(
      -this.localSunDirection[0],
      -this.localSunDirection[1],
      -this.localSunDirection[2]
    );

    // cpp:575-580 - Decompose scale, normalized by the largest component
    // (pure decomposition - no composition, no swap).
    mat4.getScaling(SCALE_SCRATCH, w);
    const maxScale = Math.max(SCALE_SCRATCH[0], SCALE_SCRATCH[1], SCALE_SCRATCH[2]);
    data.relativeScaling = vec3.fromValues(
      SCALE_SCRATCH[0] / maxScale,
      SCALE_SCRATCH[1] / maxScale,
      SCALE_SCRATCH[2] / maxScale
    );

    // cpp:581.
    data.lodFactor = Math.max(0, screenSize / Math.max(1, this.minScreenSize) - 1);

    // cpp:583 - Infinity when target dims are unset, matching Carbon's float
    // division semantics.
    data.targetInvSize = [2 / this.targetWidth, 2 / this.targetHeight];

    // cpp:585-614 - up to 4 lights via Tr2Light::GetLight; radius > 0 scales
    // the color by brightnessMultiplier * (innerRadius*2 + 1)^3; remaining
    // slots zero-filled (cpp:611-614).
    data.lights = [];
    for (const light of this.lights)
    {
      if (data.lights.length >= 4)
      {
        break;
      }
      const record = { position: vec3.create(), radius: 0, color: vec3.create(), innerRadius: 0 };
      if (light?.GetLight?.(LIGHT_SCRATCH))
      {
        vec3.copy(record.position, LIGHT_SCRATCH.position);
        record.radius = LIGHT_SCRATCH.radius;
        if (record.radius > 0)
        {
          const lightData = light.GetLightData?.();
          record.innerRadius = Math.max(Math.min((lightData?.innerRadius ?? 0) / record.radius, 1), 0);
          const multiplier = light.GetBrightnessMultiplier?.() ?? 1;
          const boost = (record.innerRadius * 2 + 1) ** 3;
          record.color[0] = LIGHT_SCRATCH.color[0] * multiplier * boost;
          record.color[1] = LIGHT_SCRATCH.color[1] * multiplier * boost;
          record.color[2] = LIGHT_SCRATCH.color[2] * multiplier * boost;
        }
      }
      data.lights.push(record);
    }
    while (data.lights.length < 4)
    {
      data.lights.push({ position: vec3.create(), radius: 0, color: vec3.create(), innerRadius: 0 });
    }

    // cpp:616-618.
    data.mapOffsets = [
      [this.mapOffset0[0], this.mapOffset0[1], this.mapOffset0[2], 0],
      [this.mapOffset1[0], this.mapOffset1[1], this.mapOffset1[2], 0],
      [this.mapOffset2[0], this.mapOffset2[1], this.mapOffset2[2], 0],
    ];
    return data;
  }

  static ReflectionMode = ReflectionMode;

  static Tr2VolumerticQuality = Tr2VolumerticQuality;

}
