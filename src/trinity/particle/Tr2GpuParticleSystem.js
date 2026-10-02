import { IInitialize } from "../../global/blue/IInitialize.js";
// Source: trinity/trinity/Particle/Tr2GpuParticleSystem.h
// Source: trinity/trinity/Particle/Tr2GpuParticleSystem.cpp
// Source: trinity/trinity/Particle/Tr2GpuParticleSystem_Blue.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
//
// The GPU particle system: emitters queue emit requests during the scene
// update (`Emit`), the render driver runs `Update` once per frame after the
// scene update, and the scene draws it with `Render` after its transparent
// and distortion batches. Every stage is a compute effect the system's nine
// effect slots name (res:/fisfx/gpuparticles/system.black); the effects read
// the system's buffers through its local variable store.
//
// Carbon's structs are packed into the byte layouts its shaders read:
// `EmitterGpu` (112 bytes, the emit constant buffer's array element),
// `EmitterParamsGpu` (128 bytes, the `Emitters` structured-buffer stride) and
// the update constants (160 bytes).
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { RenderingMode, TriStorageFlags } from "#consts/graphics";
import { PixelFormat, ShaderType, Topology } from "#consts/render-context";
import { Tr2GpuBuffer } from "../core/device/Tr2GpuBuffer.js";
import { Tr2GpuStructuredBuffer } from "../core/device/Tr2GpuStructuredBuffer.js";
import { TriDevice } from "../core/device/TriDevice.js";
import { Tr2Renderer, PER_OBJECT_VS } from "../core/Tr2Renderer.js";
import { FillAndSetConstants } from "../core/Tr2RenderUtils.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { Tr2VariableStore } from "../core/variable/Tr2VariableStore.js";
import { Tr2EffectStateManager } from "../shader/Tr2EffectStateManager.js";
import { MAX_TURBULENCE_LENGTH, Tr2GpuParticleSystemEmitterParamsGpu } from "./Tr2GpuParticleSystemEmitterParamsGpu.js";

/** Carbon DEFAULT_MAX_PARTICLES (cpp:19). */
const DEFAULT_MAX_PARTICLES = 1024 * 1024;

/** Carbon MAXIMUM_FRAME_TIME (cpp:21). */
const MAXIMUM_FRAME_TIME = 1 / 15;

/** Carbon TURBULENCE_ANIMATION_SPEED (cpp:23). */
const TURBULENCE_ANIMATION_SPEED = 0.05;

/**
 * Carbon TRINITY_PLATFORM_MAX_CONSTANT_BUFFER_SIZE on dx11 and dx12
 * (`Tr2CapsALDx11.h:17`): a compile-time constant per backend there. The
 * shaders here are the dx11 translation, whose emit constant buffer is this
 * size, and it is WebGPU's guaranteed uniform binding size.
 */
const MAX_CONSTANT_BUFFER_SIZE = 64 * 1024;

/** sizeof(EmitterGpu) (Tr2GpuParticleSystem.h:72-94). */
const EMITTER_GPU_SIZE = 112;

/** sizeof(EmitterParamsGpu) (Tr2GpuParticleSystem.h:179-201). */
const EMITTER_PARAMS_GPU_SIZE = 128;

/** sizeof(ParticleData) (Tr2GpuParticleSystem.h:137-143). */
const PARTICLE_DATA_SIZE = 32;

/** sizeof(EmitterCBPrefix) (cpp:564-568). */
const EMITTER_CB_PREFIX_SIZE = 16;

/** Carbon emitsPerDispatch (cpp:571). */
const EMITS_PER_DISPATCH = Math.floor((MAX_CONSTANT_BUFFER_SIZE - EMITTER_CB_PREFIX_SIZE) / EMITTER_GPU_SIZE);

/** The byte offset of EmitterGpu::emitterSeed, which UpdateEmitterParams ORs the params index into. */
const EMITTER_SEED_OFFSET = 60;

/** The update dispatch's constants (cpp:419-436). */
const UPDATE_CB_SIZE = 160;

/** Carbon's constant-type mask for the compute stage (the ShaderType overload of FillAndSetConstants, Tr2RenderUtils.h:46-54). */
const COMPUTE_MASK = 1 << ShaderType.COMPUTE_SHADER;

/** The effect slots, as Blue names them; each is given the system's variable store. */
const EFFECT_SLOTS = [ "emit", "update", "render", "clear", "setDrawParameters", "setSortParameters", "sort", "sortStep", "sortInner" ];

/**
 * Carbon CheckEffect (cpp:51-54): whether the effect is usable.
 *
 * @param {object|null} effect A Tr2Effect.
 * @returns {boolean} Whether it has a shader state.
 */
function CheckEffect(effect)
{
  return !!effect && !!effect.GetShaderStateInterface();
}

/** Describes the GPU particle pipeline's capacity, visible-count controls, and compute and render effect stages. */
@meta.define({ className: "Tr2GpuParticleSystem", family: "particle", purpose: "Describes the GPU particle pipeline's capacity, visible-count controls, and compute and render effect stages." })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class Tr2GpuParticleSystem
{

  /** m_enableEmit (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  enableEmit = true;

  /** m_enableRender (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  /** m_enableSort (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  enableSort = true;

  /** m_enableUpdate (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  enableUpdate = true;

  /** m_updateVisibleCount (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  updateVisibleCount = false;

  /** m_maxParticles (uint32_t) [READWRITE, PERSIST, NOTIFY]; the constructor's DEFAULT_MAX_PARTICLES (cpp:81). */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  maxParticles = DEFAULT_MAX_PARTICLES;

  /** m_visibleCount (uint32_t) [READ] */
  @meta.blue.read
  @meta.type.uint32
  visibleCount = 0;

  /** m_clear (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  clear = null;

  /** m_emit (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  emit = null;

  /** m_sortInner (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  sortInner = null;

  /** m_sortStep (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  sortStep = null;

  /** m_sort (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  sort = null;

  /** m_render (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  render = null;

  /** m_update (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  update = null;

  /** m_setDrawParameters (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  setDrawParameters = null;

  /** m_setSortParameters (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  setSortParameters = null;

  /** m_particleData: per-particle data (ParticleData). */
  _particleData = null;

  /** m_deadList: indices of dead particles, re-populated during Update and Clear. */
  _deadList = null;

  /** m_visibleList: indices of visible (and alive) particles. */
  _visibleList = null;

  /** m_drawParameters: DrawInstancedIndirect arguments. */
  _drawParameters = null;

  /** m_sortParameters: the sort dispatch's indirect arguments. */
  _sortParameters = null;

  /** m_emitterParamsBuffer: persistent emitter data (EmitterParamsGpu). */
  _emitterParamsBuffer = null;

  /** m_counters: the dead and visible counts. */
  _counters = null;

  /** m_emitterParamsIndex: params id to `{ index, hash, lifetime }`. */
  _emitterParamsIndex = new Map();

  /** m_expiredEmitters: free slots in m_emitterParams. */
  _expiredEmitters = [];

  /** m_emitterParams: the CPU mirror of the params buffer, EMITTER_PARAMS_GPU_SIZE bytes per entry. */
  _emitterParams = new Uint8Array(64 * EMITTER_PARAMS_GPU_SIZE);

  /** How many entries of `_emitterParams` are in use (m_emitterParams.size()). */
  _emitterParamsCount = 0;

  /**
   * m_emitRequests: the frame's emit requests. Records are kept and reused
   * (Tr2AddSafeGrowableBuffer grows and is cleared, not freed); only the first
   * `_emitRequestCount` are live.
   */
  _emitRequests = [];

  /** How many of `_emitRequests` are live. */
  _emitRequestCount = 0;

  /** m_emitCB */
  _emitCB = null;

  /** m_updateCB */
  _updateCB = null;

  /** m_sortCB */
  _sortCB = null;

  /** m_liveTime: time until the last particle in the system dies. */
  _liveTime = 0;

  /** m_turbulenceOffset: turbulence origin offset in world space, from origin shifts. */
  _turbulenceOffset = vec3.create();

  /** m_turbulenceAnimation: turbulence animation in local turbulence space. */
  _turbulenceAnimation = vec3.create();

  /** m_clearRequested */
  _clearRequested = true;

  /** m_previousTime; -1 until the first Update. */
  _previousTime = -1;

  /** m_variableStore: the local store the effects read the buffers from. */
  _variableStore = new Tr2VariableStore();

  /** The emit constants: prefix plus EMITS_PER_DISPATCH emitters. */
  _emitData = new Uint8Array(EMITTER_CB_PREFIX_SIZE + EMITS_PER_DISPATCH * EMITTER_GPU_SIZE);

  /** The emit constants' prefix (EmitterCBPrefix: the count). */
  _emitPrefix = new DataView(this._emitData.buffer, 0, EMITTER_CB_PREFIX_SIZE);

  /** The update constants. */
  _updateData = new DataView(new ArrayBuffer(UPDATE_CB_SIZE));


  /**
   * Carbon's nested EmitterParamsGpu (Tr2GpuParticleSystem.h:179-201): the
   * persistent emitter parameters as the GPU reads them, 128 bytes, the
   * `Emitters` structured-buffer stride.
   *
   * A nested TYPE, held as a static the way class-owned types are. The Carbon
   * scanner lists its constructor as a native method of this class, and the
   * parity audit counts only methods, so the audit's
   * "omitted Tr2GpuParticleSystem.EmitterParamsGpu" is baselined: the member is
   * this type, and its constructor is `write`.
   */
  static EmitterParamsGpu = Tr2GpuParticleSystemEmitterParamsGpu;

  /**
   * Per-call scratch (source-style § Typed arrays and scratch): the clear and
   * sort constants' four u32 words, and a frustum plane. No method here calls
   * back into another system while holding a slot.
   */
  static scratch = { words4_0: new Uint32Array(4), vec4_0: vec4.create() };

  /**
   * Carbon's constructor (cpp:79-104): the buffers and their variables, then
   * the default capacity. As a Tr2DeviceResource it registers with the device,
   * which Carbon's base class constructor does.
   */
  constructor()
  {
    TriDevice.RegisterResource(this);
    this.InitializeBuffers();
    this.RegisterVariables();
    this.SetMaxParticles(this.maxParticles);
  }

  /**
   * Ends this system's owned lifetime: detaches all effect stores as the native
   * destructor does (Tr2GpuParticleSystem.cpp:106-119), then unregisters as its
   * base destructor does (Tr2DeviceResource.cpp:15-18).
   *
   * JavaScript has no deterministic destructor, so the final owner calls this
   * explicitly. Device ReleaseResources is a separate reset operation. This
   * does not destroy buffers or effects that may still be shared by callers.
   */
  @meta.ours
  Destroy()
  {
    if (this._variableStore)
    {
      this._variableStore = null;
      for (const slot of EFFECT_SLOTS) this.SetVariableStore(this[slot]);
    }
    TriDevice.UnregisterResource(this);
  }

  /** Carbon InitializeBuffers (cpp:125-134): the GPU buffer objects, created empty. */
  @meta.blue.method
  @meta.implemented
  InitializeBuffers()
  {
    this._particleData = new Tr2GpuStructuredBuffer();
    this._deadList = new Tr2GpuStructuredBuffer();
    this._visibleList = new Tr2GpuStructuredBuffer();
    this._emitterParamsBuffer = new Tr2GpuStructuredBuffer();
    this._drawParameters = new Tr2GpuBuffer();
    this._sortParameters = new Tr2GpuBuffer();
    this._counters = new Tr2GpuBuffer();
  }

  /**
   * Carbon RegisterVariables (cpp:140-149): the buffers, by the names the
   * effects bind them under.
   */
  @meta.blue.method
  @meta.implemented
  RegisterVariables()
  {
    const store = this._variableStore;
    store.RegisterVariable("ParticleBuffer", this._particleData);
    store.RegisterVariable("DeadBuffer", this._deadList);
    store.RegisterVariable("VisibleBuffer", this._visibleList);
    store.RegisterVariable("DrawParameters", this._drawParameters);
    store.RegisterVariable("SortParameters", this._sortParameters);
    store.RegisterVariable("Emitters", this._emitterParamsBuffer);
    store.RegisterVariable("ParticleCounters", this._counters);
  }

  /**
   * Carbon IInitialize::Initialize (cpp:151-167): every effect gets the local
   * store, and a loaded capacity other than the default is applied.
   *
   * @returns {boolean} True.
   */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    for (const slot of EFFECT_SLOTS) this.SetVariableStore(this[slot]);
    if (this.maxParticles !== DEFAULT_MAX_PARTICLES) this.SetMaxParticles(this.maxParticles);
    return true;
  }

  /**
   * Carbon SetMaxParticles (cpp:169-178).
   *
   * Carbon quirk, kept: the four buffers' ReleaseResources is empty
   * (Tr2GpuStructuredBuffer.cpp:160-162, Tr2GpuBuffer.cpp:179-181) and
   * OnPrepareResources creates only invalid buffers, so buffers made at an
   * earlier capacity keep their size; only the dispatch sizes follow the new
   * value. A capacity loaded before the device exists is the one created.
   *
   * @param {number} maxParticles The capacity.
   */
  @meta.blue.method
  @meta.implemented
  SetMaxParticles(maxParticles)
  {
    this.maxParticles = maxParticles >>> 0;
    this.PrepareResources();
    this.Clear();
  }

  /** Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-32). */
  @meta.blue.method
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
   * Carbon ReleaseResources (cpp:180-198): the constant buffers of the
   * released memory class, and a clear when managed memory goes.
   *
   * @param {number} storage The TriStorage mask being released.
   */
  @meta.blue.method
  @meta.implemented
  ReleaseResources(storage)
  {
    if (this._emitCB && (storage & this._emitCB.GetMemoryClass())) this._emitCB = null;
    if (this._updateCB && (storage & this._updateCB.GetMemoryClass())) this._updateCB = null;
    if (this._sortCB && (storage & this._sortCB.GetMemoryClass())) this._sortCB = null;
    if (storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY) this.Clear();
  }

  /**
   * Carbon OnPrepareResources (cpp:200-242): each buffer that is not valid is
   * created, which asks for a clear; the emitter params are uploaded.
   *
   * @returns {boolean} True.
   */
  @meta.blue.method
  @meta.implemented
  OnPrepareResources()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    const { GPU_WRITABLE, DRAW_INDIRECT } = Tr2GpuBuffer.CreationFlags;
    const structured = Tr2GpuStructuredBuffer.CreationFlag;

    if (!this._drawParameters.IsValid())
    {
      this._drawParameters.Create(4, PixelFormat.PIXEL_FORMAT_R32_UINT, GPU_WRITABLE | DRAW_INDIRECT, renderContext);
      this._drawParameters.SetName("GPU Particle Draw Params");
      this._clearRequested = true;
    }
    if (!this._sortParameters.IsValid())
    {
      this._sortParameters.Create(4, PixelFormat.PIXEL_FORMAT_R32_UINT, GPU_WRITABLE | DRAW_INDIRECT, renderContext);
      this._sortParameters.SetName("GPU Particle Sort Params");
      this._clearRequested = true;
    }
    if (!this._particleData.IsValid())
    {
      this._particleData.Create(this.maxParticles, PARTICLE_DATA_SIZE, structured.GPU_WRITABLE, renderContext);
      this._particleData.SetName("GPU Particles");
      this._clearRequested = true;
    }
    if (!this._deadList.IsValid())
    {
      this._deadList.Create(this.maxParticles, 4, structured.GPU_WRITABLE, renderContext);
      this._deadList.SetName("GPU Particle Dead List");
      this._clearRequested = true;
    }
    if (!this._visibleList.IsValid())
    {
      this._visibleList.Create(this.maxParticles, 8, structured.GPU_WRITABLE, renderContext);
      this._visibleList.SetName("GPU Particle Visible List");
      this._clearRequested = true;
    }
    if (!this._counters.IsValid())
    {
      this._counters.Create(2, PixelFormat.PIXEL_FORMAT_R32_SINT, GPU_WRITABLE, renderContext);
      this._counters.SetName("GPU Particle Counters");
      this._clearRequested = true;
    }
    this.UpdateGpuEmitterParams(renderContext);
    return true;
  }

  /**
   * Carbon OnModified (cpp:244-288): an effect slot that changed gets the
   * local store; a changed capacity is applied.
   *
   * Adapted: Carbon matches the changed member's address; the notification
   * here names the Blue property.
   *
   * @param {string} propertyName The Blue name that changed.
   * @returns {boolean} True.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (EFFECT_SLOTS.includes(propertyName)) this.SetVariableStore(this[propertyName]);
    else if (propertyName === "maxParticles") this.SetMaxParticles(this.maxParticles);
    return true;
  }

  /**
   * Carbon SetVariableStore (cpp:290-298).
   *
   * @param {object|null} effect A Tr2Effect.
   */
  @meta.blue.method
  @meta.implemented
  SetVariableStore(effect)
  {
    if (!effect) return;
    effect.StartUpdate();
    effect.SetVariableStore(this._variableStore);
    effect.EndUpdate();
  }

  /** Carbon Clear (cpp:305-308): the clear happens during the next Update. */
  @meta.blue.method
  @meta.implemented
  Clear()
  {
    this._clearRequested = true;
  }

  /**
   * Carbon Update (cpp:318-375): clears if asked, emits the frame's requests,
   * simulates, sorts and prepares the draw arguments.
   *
   * @param {number} time The scene's update time, in seconds (Carbon's Be::Time through TimeAsFloat).
   * @param {Float32Array|number[]} originShift The world origin shift since the previous frame.
   * @param {object} renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  Update(time, originShift, renderContext)
  {
    if (!CheckEffect(this.emit) || !CheckEffect(this.update) || !CheckEffect(this.clear) || !CheckEffect(this.setDrawParameters))
    {
      return;
    }

    let dt = (this._previousTime === -1 || !this.enableUpdate) ? 0 : time - this._previousTime;
    dt = Math.min(dt, MAXIMUM_FRAME_TIME);
    this._previousTime = time;

    if (this._clearRequested)
    {
      if (!this.DoClear(renderContext)) return;
      this._clearRequested = false;
      this._turbulenceOffset.fill(0);
    }

    const offset = this._turbulenceOffset;
    for (let i = 0; i < 3; i++)
    {
      let value = (offset[i] - originShift[i]) / MAX_TURBULENCE_LENGTH;
      value -= Math.floor(value);
      offset[i] = value * MAX_TURBULENCE_LENGTH;
    }

    this._turbulenceAnimation[2] += dt * TURBULENCE_ANIMATION_SPEED;

    this.ExpireEmitterParams(dt);
    if (this.enableEmit)
    {
      this.UpdateEmitterParams(renderContext);
      this.EmitParticles(renderContext);
    }
    this._emitRequestCount = 0;

    // No particles left alive.
    if (this._liveTime <= 0) return;

    this.RunSimulation(dt, originShift, renderContext);

    this._liveTime -= dt;

    if (this.enableSort) this.Sort(renderContext);

    // The draw arguments for Render.
    Tr2Renderer.runComputeShader(this.setDrawParameters, 1, 1, 1, renderContext);

    this.UpdateLiveCount(renderContext);
  }

  /**
   * Carbon UpdateLiveCount (cpp:381-390): the visible count for debugging,
   * when `updateVisibleCount` is on.
   *
   * Not implemented: Carbon maps the draw arguments for reading on the spot,
   * and a WebGPU buffer reads back only asynchronously. The flag is off by
   * default and only for debugging.
   *
   * @param {object} _renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.notImplemented
  UpdateLiveCount(_renderContext)
  {
    if (!this.updateVisibleCount) return;
    throw new Error("Tr2GpuParticleSystem.UpdateLiveCount: updateVisibleCount needs a synchronous GPU readback, which WebGPU does not have.");
  }

  /**
   * Carbon DoClear (cpp:396-405): zeroes the counters and runs the clear
   * kernel over the whole particle buffer.
   *
   * @param {object} renderContext The Tr2RenderContext.
   * @returns {boolean} Whether the clear kernel ran.
   */
  @meta.blue.method
  @meta.implemented
  DoClear(renderContext)
  {
    this._liveTime = 0;
    const { words4_0 } = Tr2GpuParticleSystem.scratch;
    words4_0.fill(0);
    renderContext.ClearUav(this._counters.GetGpuBuffer(0), words4_0);

    words4_0[0] = this._particleData.GetCount();
    this._updateCB ??= renderContext.CreateConstantBuffer();
    FillAndSetConstants(this._updateCB, words4_0, 16, COMPUTE_MASK, PER_OBJECT_VS, renderContext);
    return Tr2Renderer.runComputeShader(this.clear, 1, 1, 1, renderContext);
  }

  /**
   * Carbon RunSimulation (cpp:411-454): the update constants, the counter
   * reset technique, then the update kernel over the whole capacity.
   *
   * @param {number} dt The frame time.
   * @param {Float32Array|number[]} originShift The world origin shift.
   * @param {object} renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  RunSimulation(dt, originShift, renderContext)
  {
    const { vec4_0 } = Tr2GpuParticleSystem.scratch;
    const numthreadsX = 16;
    const numthreadsY = 16;
    const data = this._updateData;
    const groupX = 32;
    const groupY = Math.max(Math.floor(this.maxParticles / 32 / numthreadsX / numthreadsY), 1);
    const groupZ = Math.max(Math.floor(this.maxParticles / 32 / 32 / numthreadsX / numthreadsY), 1);

    data.setUint32(0, groupX, true);
    data.setUint32(4, groupY, true);
    data.setUint32(8, groupZ, true);
    data.setFloat32(12, dt, true);
    for (let i = 0; i < 3; i++) data.setFloat32(16 + i * 4, originShift[i], true);
    data.setUint32(28, this._particleData.GetCount(), true);
    for (let i = 0; i < 3; i++) data.setFloat32(32 + i * 4, this._turbulenceOffset[i], true);
    data.setFloat32(44, 0, true);
    for (let i = 0; i < 3; i++) data.setFloat32(48 + i * 4, this._turbulenceAnimation[i], true);
    data.setFloat32(60, 0, true);
    for (let plane = 0; plane < 6; plane++)
    {
      renderContext.GetFrustumPlane(plane, vec4_0);
      for (let i = 0; i < 4; i++) data.setFloat32(64 + plane * 16 + i * 4, vec4_0[i], true);
    }

    this._updateCB ??= renderContext.CreateConstantBuffer();
    FillAndSetConstants(this._updateCB, data, UPDATE_CB_SIZE, COMPUTE_MASK, PER_OBJECT_VS, renderContext);
    Tr2Renderer.runComputeShader(this.update, "ClearCounters", 1, 1, 1, renderContext);
    Tr2Renderer.runComputeShader(this.update, groupX, groupY, groupZ, renderContext);
  }

  /**
   * Carbon ExpireEmitterParams (cpp:461-480): counts down each params entry's
   * lifetime and frees the slots of those that ran out.
   *
   * Adapted: Carbon walks a std::map in key order, so expired slots are freed
   * in ascending-id order; a Map walks in insertion order. The order only
   * decides which free slot the next new params entry reuses, and that slot
   * is always rewritten before the GPU reads it.
   *
   * @param {number} dt The frame time.
   */
  @meta.blue.method
  @meta.adapted
  ExpireEmitterParams(dt)
  {
    for (const [ id, entry ] of this._emitterParamsIndex)
    {
      if (entry.lifetime > 0)
      {
        entry.lifetime -= dt;
        if (entry.lifetime < 0)
        {
          this._expiredEmitters.push(entry.index);
          this._emitterParamsIndex.delete(id);
        }
      }
    }
  }

  /**
   * Carbon UpdateEmitterParams (cpp:486-532): gives each request's params a
   * slot, uploads the params when any changed, and extends the live time.
   *
   * @param {object} renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  UpdateEmitterParams(renderContext)
  {
    let maxLiveTime = 0;
    let emitterBufferDirty = false;

    for (let r = 0; r < this._emitRequestCount; r++)
    {
      const request = this._emitRequests[r];
      const params = request.params;
      const lifeTime = Math.max(params[0], params[1]) + 1;
      maxLiveTime = Math.max(maxLiveTime, lifeTime);

      const found = this._emitterParamsIndex.get(request.id);
      let index;

      if (found === undefined)
      {
        let slot;
        if (!this._expiredEmitters.length)
        {
          slot = this._AppendEmitterParams();
        }
        else
        {
          slot = this._expiredEmitters.pop();
        }
        this._SetEmitterParams(slot, request.paramsBytes);
        this._emitterParamsIndex.set(request.id, { index: slot, hash: request.hash, lifetime: lifeTime });
        index = slot;
        emitterBufferDirty = true;
      }
      else
      {
        emitterBufferDirty ||= found.hash !== request.hash;
        found.hash = request.hash;
        found.lifetime = Math.max(found.lifetime, lifeTime);
        index = found.index;
        this._SetEmitterParams(found.index, request.paramsBytes);
      }

      request.emitterWords.setUint32(EMITTER_SEED_OFFSET, (request.emitterWords.getUint32(EMITTER_SEED_OFFSET, true) | index) >>> 0, true);
    }

    if (emitterBufferDirty) this.UpdateGpuEmitterParams(renderContext);
    this._liveTime = Math.max(this._liveTime, maxLiveTime);
  }

  /**
   * Carbon UpdateGpuEmitterParams (cpp:538-555): grows the params buffer to
   * hold the mirror (at least 64 entries) and uploads it.
   *
   * @param {object} renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  UpdateGpuEmitterParams(renderContext)
  {
    const buffer = this._emitterParamsBuffer;

    if (!buffer.IsValid() || buffer.GetCount() < this._emitterParamsCount)
    {
      buffer.Create(Math.max(64, this._emitterParamsCount), EMITTER_PARAMS_GPU_SIZE, Tr2GpuStructuredBuffer.CreationFlag.CPU_WRITABLE, renderContext);
    }

    if (this._emitterParamsCount === 0) return;
    if (!buffer.IsValid()) return;

    const size = this._emitterParamsCount * EMITTER_PARAMS_GPU_SIZE;
    buffer.GetGpuBuffer(0).UpdateBuffer(0, size, this._emitterParams.subarray(0, size), renderContext);
  }

  /**
   * Carbon EmitParticles (cpp:562-598): the requests' emitters in batches of
   * EMITS_PER_DISPATCH, one emit dispatch per batch with a group per emitter.
   *
   * @param {object} renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  EmitParticles(renderContext)
  {
    const data = this._emitData;
    const prefix = this._emitPrefix;

    for (let i = 0; i < this._emitRequestCount; i += EMITS_PER_DISPATCH)
    {
      const count = Math.min(this._emitRequestCount - i, EMITS_PER_DISPATCH);
      prefix.setUint32(0, count, true);
      for (let j = 0; j < count; j++)
      {
        data.set(this._emitRequests[i + j].emitterBytes, EMITTER_CB_PREFIX_SIZE + j * EMITTER_GPU_SIZE);
      }

      this._emitCB ??= renderContext.CreateConstantBuffer();
      FillAndSetConstants(this._emitCB, data, EMITTER_CB_PREFIX_SIZE + count * EMITTER_GPU_SIZE, COMPUTE_MASK, PER_OBJECT_VS, renderContext);
      Tr2Renderer.runComputeShader(this.emit, count, 1, 1, renderContext);
    }
  }

  /**
   * Carbon Sort (cpp:604-630): the sort arguments, an indirect pre-sort, then
   * incremental merges up to the capacity.
   *
   * @param {object} renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  Sort(renderContext)
  {
    if (!CheckEffect(this.setSortParameters) || !CheckEffect(this.sort) || !CheckEffect(this.sortStep) || !CheckEffect(this.sortInner))
    {
      return;
    }

    Tr2Renderer.runComputeShader(this.setSortParameters, 1, 1, 1, renderContext);
    if (this._sortParameters.IsValid())
    {
      // Carbon passes the Tr2GpuBuffer through its operator Tr2BufferAL& (Tr2GpuBuffer.h:61).
      Tr2Renderer.runComputeShaderIndirect(this.sort, this._sortParameters.GetGpuBuffer(0), 0, renderContext);

      if (this.maxParticles > 512)
      {
        let presorted = 512;
        let done = false;
        while (!done)
        {
          done = this.SortIncremental(presorted, renderContext);
          presorted *= 2;
        }
      }
    }
  }

  /**
   * Carbon SortIncremental (cpp:636-676): one merge level.
   *
   * Carbon leaves the fourth sort constant uninitialised (cpp:655-669); it is
   * zero here.
   *
   * @param {number} presorted The size already sorted.
   * @param {object} renderContext The Tr2RenderContext.
   * @returns {boolean} Whether this was the last level.
   */
  @meta.blue.method
  @meta.implemented
  SortIncremental(presorted, renderContext)
  {
    const maxSize = this.maxParticles;
    const done = maxSize <= presorted * 2;
    let numThreadGroups = 0;

    if (maxSize > presorted)
    {
      let pow2 = presorted;
      while (pow2 < maxSize) pow2 *= 2;
      numThreadGroups = pow2 >>> 9;
    }

    const mergeSize = presorted * 2;
    const { words4_0 } = Tr2GpuParticleSystem.scratch;
    for (let mergeSubSize = mergeSize >>> 1; mergeSubSize > 256; mergeSubSize >>>= 1)
    {
      words4_0[0] = mergeSubSize;
      if (mergeSubSize === mergeSize / 2)
      {
        words4_0[1] = 2 * mergeSubSize - 1;
        words4_0[2] = 0xFFFFFFFF;
      }
      else
      {
        words4_0[1] = mergeSubSize;
        words4_0[2] = 1;
      }
      words4_0[3] = 0;

      this._sortCB ??= renderContext.CreateConstantBuffer();
      FillAndSetConstants(this._sortCB, words4_0, 16, COMPUTE_MASK, PER_OBJECT_VS, renderContext);
      Tr2Renderer.runComputeShader(this.sortStep, numThreadGroups, 1, 1, renderContext);
    }
    Tr2Renderer.runComputeShader(this.sortInner, numThreadGroups, 1, 1, renderContext);
    return done;
  }

  /**
   * Carbon Render (cpp:682-694): additive standard states, then the render
   * effect draws through this system's SubmitGeometry.
   *
   * @param {object} renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  Render(renderContext)
  {
    if (!this.render || !this.display || this._liveTime <= 0) return;

    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_ALPHA_ADDITIVE);
    this.render.Render(this, renderContext);
  }

  /**
   * Carbon SubmitGeometry (cpp:696-704), the IRenderCallback: two triangles
   * per visible particle, generated in the vertex shader, with the count read
   * from the draw arguments.
   *
   * @param {object} renderContext The Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  SubmitGeometry(renderContext)
  {
    if (!this._drawParameters.IsValid()) return;

    renderContext.SetTopology(Topology.TOP_TRIANGLES);
    renderContext.GetEffectStateManager().ApplyVertexDeclaration(Tr2EffectStateManager.NullDeclaration);
    renderContext.DrawInstancedIndirect(this._drawParameters.GetGpuBuffer(0), 0);
  }

  /**
   * Carbon Emit (cpp:716-730): queues an emit request for the next Update,
   * copying its inputs, with the count capped at the capacity and a random
   * seed in the high half.
   *
   * Adapted: the request is packed into the EmitterGpu and EmitterParamsGpu
   * byte layouts here, where Carbon copies the structs; the seed uses
   * Math.random in the range of MSVC's rand() (0-32767), which has no JS
   * equivalent.
   *
   * @param {object} emitter A Tr2GpuSharedEmitter emitter record.
   * @param {number} id The params' semi-unique id.
   * @param {number} hash The params' hash.
   * @param {object} params A Tr2GpuSharedEmitter params record.
   */
  @meta.blue.method
  @meta.adapted
  Emit(emitter, id, hash, params)
  {
    if (!this.enableEmit) return;

    const request = this._NextEmitRequest();
    const words = request.emitterWords;

    WriteVec3(words, 0, emitter.position);
    words.setUint32(12, Math.min(emitter.count >>> 0, this.maxParticles), true);
    WriteVec3(words, 16, emitter.positionPrevious);
    words.setFloat32(28, emitter.radius, true);
    WriteVec3(words, 32, emitter.direction);
    words.setFloat32(44, emitter.angle, true);
    WriteVec3(words, 48, emitter.directionPrevious);
    words.setUint32(EMITTER_SEED_OFFSET, (Math.floor(Math.random() * 32768) << 16) >>> 0, true);
    WriteVec3(words, 64, emitter.velocity);
    words.setFloat32(76, emitter.minSpeed, true);
    WriteVec3(words, 80, emitter.velocityPrevious);
    words.setFloat32(92, emitter.maxSpeed, true);
    words.setFloat32(96, emitter.innerAngle, true);
    WriteVec3(words, 100, emitter.unused);

    request.id = id >>> 0;
    request.hash = hash >>> 0;
    Tr2GpuParticleSystem.EmitterParamsGpu.write(request.params, params);
  }

  /**
   * Carbon GetEmitTime (cpp:732-735), the Blue "emitTime" property.
   *
   * Not implemented: Tr2ProfileTimer's GPU timing is not ported; WebGPU
   * timestamps need a query set resolved and read back asynchronously.
   */
  @meta.blue.method
  @meta.notImplemented
  GetEmitTime()
  {
    throw new Error("Tr2GpuParticleSystem.GetEmitTime is not implemented: Tr2ProfileTimer is not ported.");
  }

  /** Carbon GetUpdateTime (cpp:737-740); see GetEmitTime. */
  @meta.blue.method
  @meta.notImplemented
  GetUpdateTime()
  {
    throw new Error("Tr2GpuParticleSystem.GetUpdateTime is not implemented: Tr2ProfileTimer is not ported.");
  }

  /** Carbon GetSortTime (cpp:742-745); see GetEmitTime. */
  @meta.blue.method
  @meta.notImplemented
  GetSortTime()
  {
    throw new Error("Tr2GpuParticleSystem.GetSortTime is not implemented: Tr2ProfileTimer is not ported.");
  }

  /** Carbon GetRenderTime (cpp:747-750); see GetEmitTime. */
  @meta.blue.method
  @meta.notImplemented
  GetRenderTime()
  {
    throw new Error("Tr2GpuParticleSystem.GetRenderTime is not implemented: Tr2ProfileTimer is not ported.");
  }

  /**
   * Carbon HasParticles (cpp:752-755): an estimate, which can report particles
   * that have already died.
   *
   * @returns {boolean} Whether any particle may be alive.
   */
  @meta.blue.method
  @meta.implemented
  HasParticles()
  {
    return this._liveTime > 0;
  }

  /** The next emit request record, growing the pool when every record is live. */
  _NextEmitRequest()
  {
    if (this._emitRequestCount === this._emitRequests.length)
    {
      const emitterBytes = new Uint8Array(EMITTER_GPU_SIZE); // alloc: pooled request record, kept for reuse
      const paramsBytes = new Uint8Array(EMITTER_PARAMS_GPU_SIZE); // alloc: pooled request record, kept for reuse
      this._emitRequests.push({
        emitterBytes,
        emitterWords: new DataView(emitterBytes.buffer),
        paramsBytes,
        params: new Float32Array(paramsBytes.buffer), // alloc: pooled request record, kept for reuse
        id: 0,
        hash: 0
      });
    }
    return this._emitRequests[this._emitRequestCount++];
  }

  /** Appends a params slot to the mirror, growing it (m_emitterParams.push_back). */
  _AppendEmitterParams()
  {
    const needed = (this._emitterParamsCount + 1) * EMITTER_PARAMS_GPU_SIZE;
    if (needed > this._emitterParams.length)
    {
      const grown = new Uint8Array(this._emitterParams.length * 2); // alloc: the mirror grows by doubling
      grown.set(this._emitterParams);
      this._emitterParams = grown;
    }
    return this._emitterParamsCount++;
  }

  /** Copies a request's packed params into mirror slot `index`. */
  _SetEmitterParams(index, paramsBytes)
  {
    this._emitterParams.set(paramsBytes, index * EMITTER_PARAMS_GPU_SIZE);
  }

}

/** Writes three floats at a byte offset, little-endian. */
function WriteVec3(view, offset, value)
{
  view.setFloat32(offset, value[0], true);
  view.setFloat32(offset + 4, value[1], true);
  view.setFloat32(offset + 8, value[2], true);
}
