// Source: trinity/trinity/Tr2ImpostorManager.h
// Source: trinity/trinity/Tr2ImpostorManager.cpp
// Source: trinity/trinity/Tr2ImpostorManager_Blue.cpp
// Hand-maintained after promotion from generated intake.
import { meta } from "#schema";
import { IInitialize, INotify } from "#blue";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { fromHalfFloat } from "#math/num";
import { TriBatchType, TR2SHADERMODEL } from "#consts/graphics";
import { PixelFormat, DepthStencilFormat } from "#consts/render-context";
import { Tr2RenderTarget } from "../device/Tr2RenderTarget.js";
import { Tr2DepthStencil } from "../device/Tr2DepthStencil.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/index.js";
import { Tr2QuadRenderer } from "../Tr2QuadRenderer/index.js";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { Tr2TextureAL } from "../../../trinityal/Tr2TextureAL/index.js";
import { Tr2TextureSubresource } from "../../../trinityal/Tr2HalHelperStructures/Tr2TextureSubresource.js";
import { ImpostorAtlas } from "./ImpostorAtlas.js";
import { Impostor } from "./Impostor.js";

const emptyTexture = new Tr2TextureAL();
const vec4_0 = vec4.create(), vec4_1 = vec4.create();
const uint8_0 = new Uint8Array(36); // alloc: reusable native ImposterVertex staging bytes
const dataView_0 = new DataView(uint8_0.buffer);

/** Copies the two native vector members without retaining caller storage. */
function copyHash(out, value)
{
  vec3.copy(out.viewDir, value.viewDir);
  vec3.copy(out.upDir, value.upDir);
}

/** Carries an impostor atlas, tile dimensions, capture effect, and per-frame update budget. */
@meta.define({ className: "Tr2ImpostorManager", family: "trinityCore", purpose: "Carries an impostor atlas, tile dimensions, capture effect, and per-frame update budget." })
@meta.blue.inherit(IInitialize, INotify)
export class Tr2ImpostorManager
{

  /** m_height (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  height = 1024;

  /** m_width (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  width = 1024;

  /** m_rt (Tr2RenderTargetPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2RenderTarget")
  atlas = null;

  /** m_itemHeight (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  itemHeight = 32;

  /** m_itemWidth (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  itemWidth = 32;

  /** m_effect (Tr2EffectPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2Effect")
  effect = null;

  /** m_maxUpdates (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  maxUpdates = 16;

  /** Native READ projection of the live impostor table. */
  @meta.blue.read
  @meta.type.uint32
  get count()
  {
    return this.GetImpostorCount();
  }

  _itemRt = new Tr2RenderTarget();
  _ds = new Tr2DepthStencil();
  _atlas = new ImpostorAtlas();
  _objects = new Map();
  _renderQueue = [];
  _atlasDirty = true;
  _effectKey = null;
  _quadRenderer = null;
  _ownedEffects = new Set();
  _itemSize = vec4.create();

  /**
   * Creates native wrapper/effect owners and registers the quad declaration.
   * A Symbol replaces the native pointer/hash key, preserving per-manager
   * identity. Resource acquisition uses the installed host through Tr2Effect.
   */
  constructor()
  {
    this.atlas = new Tr2RenderTarget();
    this.effect = new Tr2Effect();
    this._ownedEffects.add(this.effect);
    const store = Tr2VariableStore.globalStore();
    store.RegisterVariable("ImposterAtlasMap", this.atlas);
    store.RegisterVariable("ImposterItemSize", this._itemSize);
    this.effect.SetEffectPathName("res:/graphics/effect/managed/space/system/impostor.fx");
    this._effectKey = Symbol("Tr2ImpostorManager");
    this._quadRenderer = Tr2QuadRenderer.Instance();
    if (!Tr2ImpostorManager._definition)
    {
      const definition = new Tr2VertexDefinition();
      definition.Add("FLOAT32_1", "TEXCOORD", 5);
      definition.Add("FLOAT32_4", "POSITION", 0, 1, 1);
      definition.Add("FLOAT32_4", "TEXCOORD", 1, 1, 1);
      definition.Add("FLOAT16_2", "TEXCOORD", 0, 1, 1);
      Tr2ImpostorManager._definition = definition;
    }
    this._quadRenderer.RegisterEffect(this._effectKey, TriBatchType.TRIBATCHTYPE_OPAQUE, 36, 1, Tr2ImpostorManager._definition, this.effect);
    TriDevice.RegisterResource(this);
  }

  /** Native initialization resets slots and prepares resources; creation failures remain on the wrappers. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.Reset();
    this.PrepareResources();
    return true;
  }

  /** Every native member notification performs one complete initialization. */
  @meta.blue.method
  @meta.implemented
  OnModified()
  {
    this.Initialize();
    return true;
  }

  /** Native ReleaseResources is empty; wrapper owners retain their resources until recreation or destruction. */
  @meta.blue.method
  @meta.implemented
  ReleaseResources()
  {
  }

  /** The supplied context replaces the native main-thread device-creation gate. */
  @meta.blue.method
  @meta.adapted
  PrepareResources(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    return !renderContext.IsValid() || this.OnPrepareResources(renderContext);
  }

  /** Recreates native atlas/capture surfaces through existing wrappers and an explicit JS context. */
  @meta.blue.method
  @meta.adapted
  OnPrepareResources(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const width = (this.itemWidth * this.maxUpdates) >>> 0;
    const format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;
    this.atlas.Create(this.width, this.height, 1, format, 1, 0, 0, undefined, renderContext);
    this._itemRt.Create(width, this.itemHeight, 1, format, 1, 0, 0, undefined, renderContext);
    const depthFormat = Tr2Renderer.GetShaderModel() >= TR2SHADERMODEL.TR2SM_3_0_DEPTH ? DepthStencilFormat.DSFMT_READABLE : DepthStencilFormat.DSFMT_D24S8;
    this._ds.Create(width, this.itemHeight, depthFormat, 1, 0, 0, renderContext);
    this._atlasDirty = true;
    return true;
  }

  /** Native script constructor alias; its tile default differs from the C++ constructor. */
  @meta.blue.method
  @meta.implemented
  __init__(width = 1024, height = 1024, itemWidth = 16, itemHeight = 16)
  {
    this.Create(width, height, itemWidth, itemHeight);
  }

  /** Stores native unsigned sizes and initializes the manager. */
  @meta.blue.method
  @meta.implemented
  Create(width = 1024, height = 1024, itemWidth = 16, itemHeight = 16)
  {
    this.width = width >>> 0;
    this.height = height >>> 0;
    this.itemWidth = itemWidth >>> 0;
    this.itemHeight = itemHeight >>> 0;
    this.Initialize();
  }

  /** Reinitializes only when the native billboard dimensions change. */
  @meta.blue.method
  @meta.implemented
  SetItemSize(width, height)
  {
    width >>>= 0;
    height >>>= 0;
    if (this.itemWidth === width && this.itemHeight === height) return;
    this.itemWidth = width;
    this.itemHeight = height;
    this.Initialize();
  }

  /** Native Reset clears objects and rebuilds slots; the render queue survives until BeginUpdate. */
  @meta.blue.method
  @meta.implemented
  Reset()
  {
    this._objects.clear();
    this._atlas.Resize(this.width, this.height, this.itemWidth, this.itemHeight);
  }

  /** Registers an object or updates its value-copied hash, respecting new-object capture and atlas capacity. */
  @meta.blue.method
  @meta.implemented
  Add(object, hash)
  {
    if (!this.atlas.IsValid()) return false;
    const found = this._objects.get(object);
    if (found)
    {
      copyHash(found.hash, hash);
      found.renderPriority = object.GetRenderPriority(found.oldHash, hash);
      found.used = true;
      return true;
    }
    if (this._renderQueue.length >= this.maxUpdates) return false;
    const impostor = new Impostor();
    if (!this._atlas.Reserve(impostor.texcoord)) return false;
    copyHash(impostor.hash, hash);
    impostor.used = true;
    impostor.renderPriority = 3.4028234663852886e38;
    impostor.render = true;
    this._objects.set(object, impostor);
    this._renderQueue.push(object);
    return true;
  }

  /** Clears this frame's queue and marks existing objects unused until Add. */
  @meta.blue.method
  @meta.implemented
  BeginUpdate()
  {
    this._renderQueue.length = 0;
    for (const impostor of this._objects.values())
    {
      impostor.used = false;
      impostor.render = false;
    }
  }

  /**
   * Retires unused slots, emits native 36-byte quad records, then queues
   * highest-priority recaptures. JS Map order breaks equal-priority ties;
   * native unordered-map iteration does not promise an ordering.
   */
  @meta.blue.method
  @meta.adapted
  EndUpdate()
  {
    for (const [object, impostor] of this._objects)
    {
      if (!impostor.used)
      {
        this._atlas.Drop(impostor.texcoord);
        this._objects.delete(object);
        continue;
      }
      // Native stack Vector4 defaults are zero, even when a getter leaves them untouched.
      vec4.zero(vec4_0);
      vec4.zero(vec4_1);
      object.GetImpostorBoundingSphere(vec4_0);
      object.GetLastImpostorBoundingSphere(vec4_1);
      for (let i = 0; i < 4; i++)
      {
        dataView_0.setFloat32(i * 4, vec4_0[i], true);
        dataView_0.setFloat32(16 + i * 4, vec4_1[i], true);
      }
      dataView_0.setUint16(32, impostor.texcoord[0], true);
      dataView_0.setUint16(34, impostor.texcoord[1], true);
      this._quadRenderer.AddQuads(this._effectKey, uint8_0, 1);
    }
    if (this._renderQueue.length < this.maxUpdates)
    {
      const all = [...this._objects].filter(([, impostor]) => !impostor.render && impostor.renderPriority > 0);
      all.sort((a, b) => Tr2ImpostorManager.compareImpostors(a, b) ? -1 : Tr2ImpostorManager.compareImpostors(b, a) ? 1 : 0);
      const count = Math.min(this.maxUpdates - this._renderQueue.length, all.length);
      for (let i = 0; i < count; i++) this._renderQueue.push(all[i][0]);
    }
    const store = Tr2VariableStore.globalStore();
    store.RegisterVariable("ImposterAtlasMap", this.atlas);
    vec4.set(this._itemSize, this.itemWidth / this.width, this.itemHeight / this.height, 0, 0);
    store.RegisterVariable("ImposterItemSize", this._itemSize);
  }

  /** Returns the current native capture queue length. */
  @meta.blue.method
  @meta.implemented
  GetRenderQueueLength()
  {
    return this._renderQueue.length;
  }

  /** Native comparison is descending despite its ascending-order comment. */
  @meta.blue.method
  @meta.implemented
  static compareImpostors(first, second)
  {
    return first[1].renderPriority > second[1].renderPriority;
  }

  /**
   * Clears a dirty atlas only with queued captures, then binds and clears the
   * capture strip. JS context options replace native Clear bit flags.
   */
  @meta.blue.method
  @meta.adapted
  BeginUpdateAtlas(renderContext)
  {
    if (!this.atlas.IsValid() || !this._renderQueue.length) return;
    const esm = renderContext.GetEffectStateManager();
    if (this._atlasDirty)
    {
      esm.PushDepthStencilBuffer(null);
      esm.PushRenderTarget(this.atlas.GetRenderTarget());
      renderContext.Clear({ clearColor: true, color: 0, clearDepth: false, clearStencil: false });
      esm.PopRenderTarget();
      esm.PopDepthStencilBuffer();
      this._atlasDirty = false;
    }
    esm.PushRenderTarget(this._itemRt.GetRenderTarget());
    esm.PushDepthStencilBuffer(this._ds.GetDepthStencil());
    renderContext.Clear({ clearColor: true, color: 0, clearDepth: true, depth: 0, clearStencil: false });
  }

  /**
   * Restores targets and copies capture tiles using decoded half coordinates.
   * Native target conversions become GetRenderTarget; hashes are value-copied
   * before each copy, including failed copies, as in Carbon. A failed JS
   * wrapper has null storage, represented by the native empty AL value here.
   */
  @meta.blue.method
  @meta.adapted
  EndUpdateAtlas(renderContext)
  {
    if (!this.atlas.IsValid() || !this._renderQueue.length) return;
    renderContext.GetEffectStateManager().PopDepthStencilBuffer();
    renderContext.GetEffectStateManager().PopRenderTarget();
    for (let i = 0; i < this._renderQueue.length; i++)
    {
      const impostor = this._objects.get(this._renderQueue[i]);
      copyHash(impostor.oldHash, impostor.hash);
      const x = Math.fround(fromHalfFloat(impostor.texcoord[0]) * this.width) >>> 0;
      const y = Math.fround(fromHalfFloat(impostor.texcoord[1]) * this.height) >>> 0;
      const destination = Tr2TextureSubresource.ForMipLevel(0);
      destination.SetRect(x, y, x + this.itemWidth, y + this.itemHeight);
      const source = Tr2TextureSubresource.ForMipLevel(0);
      source.SetRect(i * this.itemWidth, 0, (i + 1) * this.itemWidth, this.itemHeight);
      this.atlas.GetRenderTarget().CopySubresourceRegion(destination, this._itemRt.GetRenderTarget() ?? emptyTexture, source, renderContext);
    }
  }

  /** Native viewport selection; rejects index equal to length instead of native out-of-bounds access. */
  @meta.blue.method
  @meta.adapted
  BeginImpostorUpdate(index, renderContext)
  {
    if (!this.atlas.IsValid() || index < 0 || index >= this._renderQueue.length || !Number.isInteger(index)) return null;
    renderContext.GetEffectStateManager().SetViewport({ width: this.itemWidth, height: this.itemHeight, x: index * this.itemWidth, y: 0, minZ: 0, maxZ: 1 });
    return this._renderQueue[index];
  }

  /** Native EndImpostorUpdate is intentionally empty. */
  @meta.blue.method
  @meta.implemented
  EndImpostorUpdate()
  {
  }

  /** Native live count. */
  @meta.blue.method
  @meta.implemented
  GetImpostorCount()
  {
    return this._objects.size;
  }

  /** Returns the native capture depth owner. */
  @meta.blue.method
  @meta.implemented
  GetItemDepthStencil()
  {
    return this._ds;
  }

  /** Declared without a native definition; billboard draws belong to Tr2QuadRenderer. */
  @meta.blue.method
  @meta.notImplemented
  Render()
  {
    throw new Error("Tr2ImpostorManager.Render has no native implementation; use Tr2QuadRenderer batches.");
  }

  /**
   * Explicit JS retirement unregisters the quad effect and device resource,
   * destroys owned surfaces/effects and drops source references. Shared graph
   * effect retirement can be supplied as for other Trinity owners. Global
   * variable bindings persist as in Carbon and may already name another manager.
   */
  @meta.ours
  Destroy(managedResources = null)
  {
    this._quadRenderer.UnregisterEffect(this._effectKey);
    this.atlas.Destroy();
    this._itemRt.Destroy();
    this._ds.Destroy();
    for (const effect of this._ownedEffects)
    {
      if (!managedResources?.has(effect)) effect.Destroy();
    }
    this._ownedEffects.clear();
    this._objects.clear();
    this._renderQueue.length = 0;
    this._atlas._free.length = 0;
    TriDevice.UnregisterResource(this);
  }

  /** Native private nested record identities, with separate JS source files. */
  static Impostor = Impostor;
  static ImpostorAtlas = ImpostorAtlas;
  static _definition = null;

}
