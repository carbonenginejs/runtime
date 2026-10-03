// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud2.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import "#consts/graphics/trinityEnums";
import { CjsSchema, meta } from "#schema";
import { BlueList, IListNotify, IInitialize, INotify, IsMatch } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { DepthStencilFormat, ExFlag, Tr2GpuUsage, Tr2CpuUsage, TextureType, PixelFormat, ShaderType } from "#consts/render-context";
import { ITr2DebugRenderer2 } from "#interfaces";
import { Tr2DepthStencil } from "../../core/device/Tr2DepthStencil.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2Light } from "../lights/Tr2Light.js";
import { Tr2TextureReference } from "../../core/Tr2TextureReference.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { ReflectionMode, RenderingMode, TriBatchType, TriStorageFlags } from "#consts/graphics";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { EveChildCloud2PerObjectData } from "../../core/rawData/perObjectData/EveChildCloud2PerObjectData.js";
import { RawData } from "../../core/rawData/RawData.js";
import { BitmapDimensions } from "#imageio";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2SubresourceData } from "../../../trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { TriTextureParameter } from "../../shader/parameter/TriTextureParameter.js";
import { Tr2TextureAnimationParameter } from "../../shader/parameter/Tr2TextureAnimationParameter.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/index.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { TriFrustumOrtho } from "../../core/view/TriFrustumOrtho.js";
import { Tr2RenderReason, Tr2VolumerticQuality, TriVariableContentType } from "../../generated/trinityCore/enums.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import "../../core/volumetrics/Tr2VolumetricsRenderer.js";

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
@meta.define({ className: "EveChildCloud2", family: "eve/child" })
@meta.blue.inherit(ITr2Renderable, INotify, IListNotify, IInitialize)
@meta.blue.mapInterface(INotify)
export class EveChildCloud2 extends EveSpaceObjectChild
{

  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EntityComponents.ReflectionMode")
  reflectionMode = ReflectionMode.REFLECT_NEVER;

  /** m_minVisibleQuality (Tr2VolumerticQuality - enum Tr2VolumerticQuality) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2VolumerticQuality")
  minVisibleQuality = 0;

  /** m_sortingModifier (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sortingModifier = 1;

  /** m_animation (Tr2TextureAnimationPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2TextureAnimation")
  animation = null;

  /** m_shadowMapDS (Tr2DepthStencilPtr) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2DepthStencil")
  shadowMapDS = null;

  /** m_lightMap (Tr2TextureReferencePtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2TextureReference")
  lightmap = new Tr2TextureReference();

  /** m_lightmapSizeScale (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  lightmapSizeScale = 0.5;

  /** m_lights (PTr2LightVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2Light")
  lights = new BlueList(Tr2Light);

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minScreenSize = 0;

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_reflectionEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  reflectionEffect = null;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  effect = null;

  /** m_noiseTextureSize (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  noiseTextureSize = 32;

  /** m_mapOffsets[0] (Vector3) [READ] */
  @meta.blue.read
  @meta.type.vec3
  mapOffset0 = vec3.create();

  /** m_mapOffsets[1] (Vector3) [READ] */
  @meta.blue.read
  @meta.type.vec3
  mapOffset1 = vec3.create();

  /** m_mapOffsets[2] (Vector3) [READ] */
  @meta.blue.read
  @meta.type.vec3
  mapOffset2 = vec3.create();

  /** m_castShadows (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  castShadows = true;

  /** m_receiveShadows (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  receiveShadows = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_mapTiling[1] (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  detailTiling1 = vec3.fromValues(1, 1, 1);

  /** m_mapTiling[2] (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  detailTiling2 = vec3.fromValues(1, 1, 1);

  /** m_mapTiling[0] (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  textureTiling = vec3.fromValues(1, 1, 1);

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  // Runtime state follows EveChildCloud2.cpp:72-118.

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

  /** Global DepthShadowMap variable registered by the native constructor. */
  depthShadowMapHandle = null;

  /** Native constructor-owned empty lightmap provider (EveChildCloud2.cpp:105). */
  _emptyLightMap = new Tr2TextureReference();

  /** Native per-cloud shader variable store (EveChildCloud2.cpp:107). */
  _variableStore = new Tr2VariableStore();

  _vertexBuffer = new Tr2BufferAL();
  _indexBuffer = new Tr2BufferAL();
  _declaration = Tr2EffectStateManager.Unknown;
  _lightmapPerObjectData = new EveChildCloud2PerObjectData();

  /**
   * Owns the lightmap bindings from EveChildCloud2.cpp:103-109.
   * Adapted: explicit ownership replaces native by-value resource destruction.
   */
  constructor()
  {
    super();
    this._variableStore.RegisterVariable("LightMap", this._emptyLightMap);
    this._variableStore.RegisterVariable("LightMapRW", this.lightmap);
    // Carbon's typed-null texture overload (Tr2VariableStore.h:42) cannot be
    // selected from JS null alone; use its RegisterVariableType implementation.
    this.depthShadowMapHandle = Tr2VariableStore.globalStore()._RegisterVariableType(
      "DepthShadowMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES);
    this.depthShadowMapHandle.SetValue(null);
    this.lights.SetNotify(this);
    this._lightmapPerObjectData.data = RawData.create("EveChildCloud2PerObjectData");
    TriDevice.RegisterResource(this);
    this.PrepareResources();
  }

  /** Rebinds effects and resets the vertex buffer (EveChildCloud2.cpp:165-180). */
  @meta.adapted
  Initialize()
  {
    for (const effect of [this.effect, this.reflectionEffect])
      if (effect) { effect.SetVariableStore(this._variableStore); effect.RebuildCachedData(); }
    this._vertexBuffer.Destroy();
    this.PrepareResources();
    return true;
  }

  /** Native device-resource creation gate (Tr2DeviceResource.cpp:21-32). */
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /**
   * Creates the native eight vertices, 36 uint16 indices and float3 declaration
   * (EveChildCloud2.cpp:435-514). Adapted: descriptions express the AL overload.
   * Carbon does not check either buffer creation result; preserve that flow.
   */
  @meta.adapted
  OnPrepareResources()
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (!this._vertexBuffer.IsValid())
    {
      this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
        12, 8, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE), EveChildCloud2._vertices, context);
      this._indexBuffer.Destroy();
      this._indexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
        2, 36, Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.NONE), EveChildCloud2._indices, context);
    }
    if (this._declaration === Tr2EffectStateManager.Unknown)
    {
      const definition = EveChildCloud2._vertexDefinition;
      if (definition.empty()) definition.Add("FLOAT32_3", "POSITION");
      this._declaration = Tr2EffectStateManager.getVertexDeclarationHandle(definition);
    }
    return true;
  }

  /**
   * Resets native declaration, dirty state and shadow ownership (cpp:408-425).
   * Adapted: explicitly releases the owned depth surface; cube buffers survive.
   */
  @meta.adapted
  ReleaseResources(storage = 0)
  {
    this._declaration = Tr2EffectStateManager.Unknown;
    this.lightmapDirty = true;
    this.lightmapDirtyOffset = 0;
    if (storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY) this.lightmapWidth = 0;
    this.ClearVariableStore();
    if (this.shadowMapDS) this.shadowMapDS.Destroy();
    this.shadowMapDS = null;
  }

  /** Explicit final release substitutes for Carbon's deterministic resource destructors. */
  @meta.adapted
  Destroy()
  {
    this.ReleaseResources();
    this._vertexBuffer.Destroy();
    this._indexBuffer.Destroy();
    this.lightmap.GetTexture().Destroy();
    this.lightmap.OnTextureChange().Broadcast();
    this._emptyLightMap.GetTexture().Destroy();
    this._emptyLightMap.OnTextureChange().Broadcast();
    this.lights.SetNotify(null);
    TriDevice.UnregisterResource(this);
  }

  /**
   * Creates Carbon's sampled 1x1x1 RG8 fallback (cpp:268-289).
   * Adapted: AL options express the native Create overload.
   */
  @meta.adapted
  CreateEmptyLightMap(context = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const texture = this._emptyLightMap.GetTexture();
    if (texture.IsValid()) return;
    texture.Create(new BitmapDimensions({
      type: TextureType.TEX_TYPE_3D, format: PixelFormat.PIXEL_FORMAT_R8G8_UNORM,
      width: 1, height: 1, depth: 1, mipCount: 1
    }), { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE,
      initialData: [new Tr2SubresourceData(EveChildCloud2._gray, 4, 4)] }, context);
    texture.SetName("EveChildCloud2 Empty Lightmap");
    this._emptyLightMap.OnTextureChange().Broadcast();
  }

  /** Maintains light-owner membership on native list events (cpp:124-146). */
  @meta.implemented
  OnListModified(event, _key, _key2, _value, list)
  {
    if (list !== this.lights) return;
    const kind = event & BLUELISTEVENT.BELIST_EVENTMASK;
    const registry = this.GetComponentRegistry();
    if (!registry) return;
    if (kind === BLUELISTEVENT.BELIST_UNLOADSTART ||
      (kind === BLUELISTEVENT.BELIST_REMOVED && this.lights.length === 0))
      registry.UnRegisterComponent(EveComponentType.LightOwner, this);
    else if (kind === BLUELISTEVENT.BELIST_INSERTED && this.lights.length === 1)
      registry.RegisterComponent(EveComponentType.LightOwner, this);
  }

  /** Clears the shared shadow binding (EveChildCloud2.cpp:427-433). */
  @meta.implemented
  ClearVariableStore()
  {
    if (this.depthShadowMapHandle) this.depthShadowMapHandle.Clear();
  }

  /** Adds Carbon's two debug choices (EveChildCloud2.cpp:692-696). */
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Bounding Box");
    options.add("Bounding Sphere");
  }

  /**
   * Submits Carbon's box and sphere (EveChildCloud2.cpp:698-712).
   * The supplied ITr2DebugRenderer2 must implement its geometry methods;
   * the runtime's option-only Tr2DebugRenderer does not yet draw geometry.
   */
  @meta.implemented
  RenderDebugInfo(renderer)
  {
    if (renderer.HasOption(this, "Bounding Box"))
    {
      vec3.set(CORNER_MIN_SCRATCH, -0.5, -0.5, -0.5);
      vec3.set(CORNER_MAX_SCRATCH, 0.5, 0.5, 0.5);
      renderer.DrawBox(this, this.worldTransform, CORNER_MIN_SCRATCH, CORNER_MAX_SCRATCH,
        ITr2DebugRenderer2.Effect.Wireframe, 0xff00ff00);
    }
    if (renderer.HasOption(this, "Bounding Sphere"))
      renderer.DrawSphere(this, this.boundingSphere.center, this.boundingSphere.radius,
        18, ITr2DebugRenderer2.Effect.Wireframe, 0xff00ff00);
  }

  /** Native EveChildCloud2.cpp:182-204: refresh affected registrations and effects. */
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "reflectionMode") || IsMatch(names, "display") || IsMatch(names, "reflectionEffect"))
      this.ReRegister();
    if (IsMatch(names, "effect"))
    {
      if (this.effect)
      {
        this.effect.SetVariableStore(this._variableStore);
        this.effect.RebuildCachedData();
      }
      this.MarkLightmapDirty(true);
    }
    if (IsMatch(names, "reflectionEffect") && this.reflectionEffect)
    {
      this.reflectionEffect.SetVariableStore(this._variableStore);
      this.reflectionEffect.RebuildCachedData();
    }
    return true;
  }

  /** Carbon EveChildCloud2::RegisterComponents (EveChildCloud2.cpp:148-163):
   * LightOwner when lights are authored; VolumetricRenderable UNCONDITIONAL;
   * ReflectionRenderable only when ShouldReflect && display &&
   * reflectionEffect. Note: no whole-block display gate in Carbon. No
   * UnRegisterComponents override (base no-op; EveEntity::UnRegister already
   * removes the components, EveEntity.cpp:90). */
  @meta.implemented
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
   * dimensions come from DensityMap, with a 1x1x1 fallback when LightMap is
   * absent from the shader; the texture animation advances gated
   * on UpdateOnlyWhenRendered/renderedLastFrame (cpp:677-683) and
   * renderedLastFrame is cleared every pass (cpp:684) - the flag is only
   * re-stamped by the volumetric batch path (GetVolumetricBatches cpp:283),
   * deliberately NOT by the reflection path. */
  @meta.adapted
  UpdateSyncronous(updateContext, _params)
  {
    if (this.effect)
    {
      const hash = this.effect.GetHashValue();
      if (this.effectHash !== hash)
      {
        this.effectHash = hash;
        this.lightmapDirty = true;
        this.lightmapWidth = 0;
        this.lightmapHeight = 0;
        this.lightmapDepth = 0;
      }
      const shader = this.effect.GetShaderStateInterface();
      if (this.lightmapDirty && this.lightmapWidth === 0 && shader)
      {
        if (shader.GetResource("LightMap"))
        {
          const param = this.effect.GetResourceByName("DensityMap");
          const textureParam = CjsSchema.cast(param, TriTextureParameter);
          const animationParam = CjsSchema.cast(param, Tr2TextureAnimationParameter);
          let texture = null;
          if (textureParam)
          {
            const resource = textureParam.GetResource();
            if (resource) texture = resource.GetTexture();
          }
          else if (animationParam) texture = animationParam.GetTexture();
          if (texture && texture.IsValid())
          {
            const desc = texture.GetDesc();
            this.lightmapWidth = desc.GetWidth();
            this.lightmapHeight = desc.GetHeight();
            this.lightmapDepth = desc.GetDepth();
            this.MarkLightmapDirty(true);
          }
        }
        else
        {
          this.CreateEmptyLightMap();
          this._variableStore.RegisterVariable("LightMap", this._emptyLightMap);
          this.lightmap.GetTexture().Destroy();
          this.lightmap.OnTextureChange().Broadcast();
          this.lightmapDirty = false;
        }
      }
    }

    if (this.animation)
    {
      if (!this.animation.UpdateOnlyWhenRendered() || this.renderedLastFrame)
      {
        this.animation.AdvanceTime(updateContext?.GetDeltaT() ?? 0);
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
  @meta.implemented
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
    const originShift = updateContext?.GetOriginShift();
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

    this.adjustedMinScreenSize = this.minScreenSize * (updateContext?.GetLodFactor() ?? 1);
    this.hasUpdated = true;
  }

  /** Carbon EveChildCloud2::GetBoundingSphere (cpp:226-230): the packed
   * (center, radius) cloud sphere, unconditionally true. IEveSpaceObjectChild
   * override - parent bounds unions consume it optional-chained. */
  @meta.implemented
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
  @meta.implemented
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
  @meta.implemented
  IsVisible(updateContext)
  {
    const frustum = updateContext?.GetFrustum();
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
    if (screenSize < this.minScreenSize * (updateContext?.GetLodFactor() ?? 1))
    {
      return false;
    }
    return true;
  }

  /** Carbon EveChildCloud2::HasValidTransform (cpp:309-317): determinant is
   * nonzero and finite. */
  @meta.implemented
  HasValidTransform()
  {
    const det = mat4.determinant(this.worldTransform);
    return det !== 0 && Number.isFinite(det);
  }

  /** Carbon EveChildCloud2::IsLightmapDirty (cpp:748-751). */
  @meta.implemented
  IsLightmapDirty()
  {
    return this.lightmapDirty;
  }

  /** Carbon EveChildCloud2::MarkLightmapDirty (cpp:753-757): also zeroes the
   * dirty offset (contrast SetSceneInformation's scale-change path, which
   * sets the flag WITHOUT resetting the offset - cpp:398-402). */
  @meta.implemented
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
  @meta.implemented
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
      light?.AddLight(lightManager, m, scaling);
    }
  }

  /** Carbon's two GetSortValue overloads, dispatched on argument presence:
   * the ITr2VolumetricRenderable frustum form (cpp:237-242) - view distance
   * minus |authored local scaling| * sortingModifier, consumed by the
   * volumetric renderer's DESCENDING stable sort (farthest first,
   * Tr2VolumetricsRenderer.cpp:276-287) - and the ITr2Renderable zero-arg
   * form (cpp:914-917) - float32 max (finite, NOT Infinity), so the
   * transparent reflection pass sorts the cloud to draw first. */
  @meta.implemented
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
  @meta.adapted
  GetVolumetricBatches(frustum, batches)
  {
    if (this.currentQuality < this.minVisibleQuality)
    {
      return false;
    }
    const sphere = this.boundingSphere;
    const isVisible = this.display && this.hasUpdated &&
      frustum?.IsSphereVisible(sphere.center, sphere.radius) === true;
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
    if (!this._vertexBuffer.IsValid() || this._declaration === Tr2EffectStateManager.Unknown ||
      !this.effect || !this.effect.GetShaderStateInterface()) return false;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(this.GetPerObjectData(batches, screenSize));
    batch.SetGeometry(this._declaration, this._vertexBuffer, 12, this._indexBuffer, this._indexBuffer.GetDesc().stride);
    batch.SetDrawIndexedInstanced(12 * 3, 1, 0, 0, 0);
    const committed = batches?.Commit(batch) === true;

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
  @meta.adapted
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

      this.CreateEmptyLightMap(renderContext);
      const texture = this.lightmap.GetTexture();
      if (texture.GetWidth() !== scaledWidth || texture.GetHeight() !== scaledHeight ||
        texture.GetDesc().GetDepth() !== scaledDepth)
      {
        const result = texture.Create(new BitmapDimensions({
          type: TextureType.TEX_TYPE_3D, format: PixelFormat.PIXEL_FORMAT_R8G8_UNORM,
          width: scaledWidth, height: scaledHeight, depth: scaledDepth, mipCount: 1
        }), { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE | Tr2GpuUsage.UNORDERED_ACCESS }, renderContext);
        if (Failed(result)) return false;
        texture.SetName("EveChildCloud2 Lightmap");
        this.lightmap.OnTextureChange().Broadcast();
        this.lightmapDirtyOffset = 0;
        this._variableStore.RegisterVariable("LightMap", this._emptyLightMap);
      }
      const record = this._lightmapPerObjectData;
      this.PopulatePerObjectData(record.data, 1, renderContext);
      record.SetPerObjectDataToDevice([renderContext.GetConstantBuffer(0)], 1 << ShaderType.COMPUTE_SHADER, renderContext);

      const VOXELS_PER_UPDATE = Math.floor(6400000 * this.lightmapSizeScale ** 3);
      const slices = Math.max(Math.floor(VOXELS_PER_UPDATE / (scaledHeight * scaledDepth)), 1);
      const success = Tr2Renderer.runComputeShader(
        this.effect,
        "GenerateLightmap",
        slices,
        Math.floor((this.lightmapHeight + 7) / 8),
        Math.floor((this.lightmapDepth + 7) / 8),
        renderContext
      );
      if (success)
      {
        this.lightmapDirtyOffset += slices;
        if (this.lightmapDirtyOffset >= scaledWidth)
        {
          this.lightmapDirty = false;
          this.lightmapDirtyOffset = 0;
          this._variableStore.RegisterVariable("LightMap", this.lightmap);
          this._emptyLightMap.GetTexture().Destroy();
          this._emptyLightMap.OnTextureChange().Broadcast();
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
  @meta.adapted
  @meta.reason("Carbon dereferences m_effect with no null guard (cpp:417); the JS option writes are optional-chained. Everything else is verbatim, including the missing degree conversion in the sun-motion threshold.")
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
    this.effect?.SetOption(
      "CLOUD_SHADOWS",
      receive ? "CLOUD_SHADOWS_RECEIVE" : "CLOUD_SHADOWS_NONE"
    );
    this.effect?.SetOption(
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
  @meta.adapted
  @meta.reason("The 'Shadow' technique gate applies only when a shader-state interface is present, and the batch is dropped otherwise; NULL_DECLARATION maps to declaration 0.")
  GetVolumetricShadowBatches(batches)
  {
    if (!this.display || !this.effect || !this.castShadows)
    {
      return false;
    }
    // cpp:766-776 - the "Shadow" technique must exist. The JS shader duck
    // (Tr2Shader.GetTechniqueIndex) returns an INDEX: -1 for missing, 0..n
    // for found - 0 is a valid technique (compare < 0, never truthiness).
    const shader = this.effect.GetShaderStateInterface();
    if (!shader) return false;
    if (shader)
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
    return batches?.Commit(batch) === true;
  }

  /** Carbon EveChildCloud2::GetVolumetricShadowInfo (cpp:787-790): pure
   * delegation to SetupShadowFrustum. The scene calls this to build the
   * shadow-camera package before rendering casters into the cloud shadow map
   * (EveSpaceScene.cpp:2355-2371). */
  @meta.implemented
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
  @meta.implemented
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

  /**
   * Prepares the native D32F shadow target (EveChildCloud2.cpp:774-808).
   * Adapted: pass the explicit context to Tr2DepthStencil.Create; the AL owns
   * the surface. The caller restores the three pushed states after rendering.
   */
  @meta.blue.method
  @meta.adapted
  PrepareCloudShadowMap(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (!this.receiveShadows) return false;
    if (!this.shadowMapDS) this.shadowMapDS = new Tr2DepthStencil();
    if (!this.shadowMapDS.IsValid())
      this.shadowMapDS.Create(this.shadowMapSize, this.shadowMapSize,
        DepthStencilFormat.DSFMT_D32F, 1, 0, ExFlag.EX_NONE, renderContext);
    const esm = renderContext.GetEffectStateManager();
    esm.PushViewport();
    esm.PushRenderTarget(null);
    esm.PushDepthStencilBuffer(this.shadowMapDS.GetTexture());
    esm.UpdateRenderTargetViewport(this.shadowMapDS.GetWidth(), this.shadowMapDS.GetHeight());
    renderContext.Clear({ depth: true, clearDepth: 1, clearStencil: 0 });
    renderContext.SetReadOnlyDepth(false);
    esm.SetViewport({ width: this.shadowMapDS.GetWidth(), height: this.shadowMapDS.GetHeight(),
      x: 0, y: 0, minZ: 0, maxZ: 1 });
    return true;
  }

  /** Carbon EveChildCloud2::SetCloudShadowMapHandle (cpp:829-835): publish the
   * shadow depth-stencil into the global "DepthShadowMap" variable handle
   * (registered in the Carbon ctor, cpp:115). QUIRK: Carbon dereferences
   * m_shadowMapDS with no null guard - safe only via the
   * PrepareCloudShadowMap-first call order (see above). */
  @meta.adapted
  SetCloudShadowMapHandle()
  {
    if (this.shadowMapDS.IsValid())
    {
      this.depthShadowMapHandle.SetValue(this.shadowMapDS);
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
  @meta.adapted
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
    if (!this._vertexBuffer.IsValid() || this._declaration === Tr2EffectStateManager.Unknown ||
      !this.reflectionEffect || !this.reflectionEffect.GetShaderStateInterface()) return false;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.reflectionEffect);
    batch.SetPerObjectData(this.GetPerObjectData(batches, 10000));
    batch.SetGeometry(this._declaration, this._vertexBuffer, 12, this._indexBuffer, this._indexBuffer.GetDesc().stride);
    batch.SetDrawIndexedInstanced(12 * 3, 1, 0, 0, 0);
    batch.SetRenderingMode(RenderingMode.RM_ALPHA);
    return batches?.Commit(batch) === true;
  }

  /** Carbon EveChildCloud2::HasTransparentBatches (cpp:909-912):
   * unconditionally true - the reflection gather always routes the cloud
   * through the transparent leg that feeds GetBatches' type/reason filter. */
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Allocates and fills Carbon's concrete cloud struct (cpp:516-524,901-909). */
  @meta.adapted
  GetPerObjectData(accumulator, screenSize = 1)
  {
    const record = EveChildCloud2PerObjectData.alloc(accumulator);
    if (!record) return null;
    this.PopulatePerObjectData(record.data, screenSize);
    return record;
  }

  /**
   * Fills Cloud2's native struct (cpp:526-601), including integer bit patterns.
   * Adapted: RawData transposes logical matrices once; the ambient context owns
   * renderer camera state. Math.random replaces rand; zero noise size retains
   * the previously documented zero guard rather than native modulo-zero UB.
   */
  @meta.adapted
  PopulatePerObjectData(data, screenSize = 1, context = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const w = this.worldTransform;
    data.SetAndTranspose("world", w);
    const projection = context.GetReversedDepthProjectionTransform();
    if (!mat4.invert(INV_SCRATCH, projection)) mat4.copy(INV_SCRATCH, projection);
    data.SetAndTranspose("projectionInv", INV_SCRATCH);
    // Carbon row-vector world * view: world first, so operands reverse.
    mat4.multiply(WV_SCRATCH, context.GetViewTransform(), w);
    if (!mat4.invert(INV_SCRATCH, WV_SCRATCH)) mat4.copy(INV_SCRATCH, WV_SCRATCH);
    data.SetAndTranspose("worldViewInv", INV_SCRATCH);
    if (!mat4.invert(INV_SCRATCH, w)) mat4.copy(INV_SCRATCH, w);
    vec3.transformMat4(SHIFT_SCRATCH, context.GetViewPosition(), INV_SCRATCH);
    data.Set("viewPosition", SHIFT_SCRATCH);
    data.SetAndTranspose("lightViewProj", this.lightViewProj);
    data.Set("lightmapDimensions", [Math.max(1, Math.floor(this.lightmapWidth * this.lightmapSizeScale)),
      Math.max(1, Math.floor(this.lightmapHeight * this.lightmapSizeScale)),
      Math.max(1, Math.floor(this.lightmapDepth * this.lightmapSizeScale)), this.lightmapDirtyOffset]);
    const noiseSize = this.noiseTextureSize >>> 0;
    data.Set("noiseConfig", [noiseSize ? Math.floor(Math.random() * noiseSize) : 0,
      noiseSize ? Math.floor(Math.random() * noiseSize) : 0, noiseSize, noiseSize]);
    data.Set("viewDirection", [-WV_SCRATCH[2], -WV_SCRATCH[6], -WV_SCRATCH[10]]);
    data.Set("depthSlice0", -WV_SCRATCH[14] - this.depthSlices[0] * WV_SCRATCH[15]);
    data.Set("depthSlice1", -WV_SCRATCH[14] - this.depthSlices[1] * WV_SCRATCH[15]);
    data.Set("depthSlice2", -WV_SCRATCH[14] - this.depthSlices[2] * WV_SCRATCH[15]);
    vec3.negate(SUN_SCRATCH, this.localSunDirection);
    data.Set("sunDirection", SUN_SCRATCH);
    mat4.getScaling(SCALE_SCRATCH, w);
    vec3.scale(SCALE_SCRATCH, SCALE_SCRATCH, 1 / Math.max(SCALE_SCRATCH[0], SCALE_SCRATCH[1], SCALE_SCRATCH[2]));
    data.Set("relativeScaling", SCALE_SCRATCH);
    data.Set("lodFactor", Math.max(0, screenSize / Math.max(1, this.minScreenSize) - 1));
    data.Set("targetInvSize", [2 / this.targetWidth, 2 / this.targetHeight]);
    for (let i = 0; i < 4; i++)
    {
      if (i >= this.lights.length)
      {
        data.SetIndex("lights", i * 2, [0, 0, 0, 0]);
        data.SetIndex("lights", i * 2 + 1, [0, 0, 0, 0]);
        continue;
      }
      const light = this.lights[i];
      light.GetLight(LIGHT_SCRATCH);
      const { position, radius, color } = LIGHT_SCRATCH;
      data.SetIndex("lights", i * 2, [position[0], position[1], position[2], radius]);
      const innerRadius = radius > 0 ? Math.max(0, Math.min(light.GetLightData().innerRadius / radius, 1)) : 0;
      const boost = radius > 0 ? light.GetBrightnessMultiplier() * (innerRadius * 2 + 1) ** 3 : 0;
      data.SetIndex("lights", i * 2 + 1, [color[0] * boost, color[1] * boost, color[2] * boost, innerRadius]);
    }
    for (const [i, offset] of [this.mapOffset0, this.mapOffset1, this.mapOffset2].entries())
      data.SetIndex("mapOffsets", i, [offset[0], offset[1], offset[2], 0]);
    return data;
  }

  static _vertexDefinition = new Tr2VertexDefinition();
  static _vertices = new Float32Array([
    -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5,
    -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5, -0.5,0.5,-0.5
  ]);
  static _indices = new Uint16Array([0,1,2,2,3,0, 1,5,6,6,2,1, 7,6,5,5,4,7,
    4,0,3,3,7,4, 4,5,1,1,0,4, 3,2,6,6,7,3]);
  static _gray = new Uint8Array([127,127,127,127]);

  static ReflectionMode = ReflectionMode;

  static Tr2VolumerticQuality = Tr2VolumerticQuality;

}
