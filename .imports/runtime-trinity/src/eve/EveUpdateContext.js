// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/EveUpdateContext.h
//
// Hand-maintained (NOT generated). Promoted out of src/generated because this
// per-frame context carries two runtime-only composition references -
// renderContext (Tr2RenderContext) and device (TriDevice) - that do not exist
// in the Carbon schema and would be dropped on every regeneration. The schema
// scan of EveUpdateContext.h also emitted assignment-statement and local-variable
// artifacts (time / manager / ps / deltaT / originNow / originDelta - deltaT is
// computed on demand in Carbon, and the origin temporaries are UpdateOrigin
// locals) and left every scalar as @type.unknown; both are fixed here.
// Reviewed tools-core output copies skip this class because a hand-maintained
// source with the same name already exists.
//
// Field types verified against Carbon EveUpdateContext.h. Per the engine field
// rules: only reference fields (objectRef) default to null; scalars default to
// 0 / false and fixed vectors to a zero vector.
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** EveUpdateContext (eve) - hand-maintained from schema shapeHash 227e2060.... */
@type.define({ className: "EveUpdateContext", family: "eve" })
export class EveUpdateContext extends CjsModel
{

  /** m_currentTime (Be::Time) */
  @type.float64
  currentTime = 0;

  /** m_lastTime (Be::Time) */
  @type.float64
  lastTime = 0;

  /** m_visibilityThreshold (float) */
  @type.float32
  visibilityThreshold = 0;

  /** m_highDetailThreshold (float) */
  @type.float32
  highDetailThreshold = 0;

  /** m_mediumDetailThreshold (float) */
  @type.float32
  mediumDetailThreshold = 0;

  /** m_lowDetailThreshold (float) */
  @type.float32
  lowDetailThreshold = 0;

  /** m_lodFactor (float) */
  @type.float32
  lodFactor = 0;

  /** m_invLodFactor (float) */
  @type.float32
  invLodFactor = 0;

  /** m_raytracingEnabled (bool) */
  @type.boolean
  raytracingEnabled = false;

  /** m_dataTextureManager (Tr2DataTextureManagerPtr) */
  @type.objectRef("Tr2DataTextureManager")
  dataTextureManager = null;

  /** m_gpuParticleSystem (Tr2GpuParticleSystemPtr) */
  @type.objectRef("Tr2GpuParticleSystem")
  gpuParticleSystem = null;

  /** m_ballpark (IEveBallparkPtr) */
  @type.objectRef("IEveBallpark")
  ballpark = null;

  /** m_taskGroup (Tr2ParallelTaskGroup*) */
  @type.objectRef("Tr2ParallelTaskGroup")
  taskGroup = null;

  /** m_frustum (TriFrustum) - swappable per-frame reference, null until stamped. */
  @type.objectRef("TriFrustum")
  frustum = null;

  /** m_origin (Vector3d) - double-precision world origin for camera-relative
   * rebasing. Carbon initializes it to UNINITIALIZED_ORIGIN (Infinity sentinel)
   * so the first UpdateOrigin produces no shift. */
  @type.rawStruct("Vector3d")
  origin = new Float64Array(3).fill(Infinity);

  /** m_originShift (Vector3) */
  @type.vec3
  originShift = vec3.create();

  /** m_originShiftRemainder (Vector3d) */
  @type.rawStruct("Vector3d")
  originShiftRemainder = new Float64Array(3);

  // --- Runtime composition (NOT in the Carbon schema) ---------------------
  // Carbon's modifiers read view state from Tr2Renderer statics; we thread it
  // explicitly instead. camera/view -> Tr2RenderContext, device -> TriDevice.
  // Both are swappable per pass; reference fields, default null.

  /** renderContext (Tr2RenderContext) - camera/view sub-context, swapped per pass. */
  @type.objectRef("Tr2RenderContext")
  renderContext = null;

  /** device (TriDevice) - GPU managers + command surface, duck-typed. */
  @type.objectRef("TriDevice")
  device = null;

  /**
   * Current frame time (Carbon EveUpdateContext::GetTime).
   * @returns {Number}
   */
  @carbon.method
  @impl.implemented
  GetTime()
  {
    return this.currentTime;
  }

  /**
   * Shifts the current time into lastTime and stores the new frame time
   * (Carbon EveUpdateContext::SetTime).
   * @param {Number} time
   */
  @carbon.method
  @impl.implemented
  SetTime(time)
  {
    this.lastTime = this.currentTime;
    this.currentTime = time;
  }

  /**
   * Seconds elapsed since the previous frame, computed on demand as Carbon does
   * (EveUpdateContext::GetDeltaT): 0 until a second SetTime has run.
   * @returns {Number}
   */
  @carbon.method
  @impl.implemented
  GetDeltaT()
  {
    return this.lastTime !== 0 ? this.currentTime - this.lastTime : 0;
  }

  /**
   * Tracks the world origin from the ballpark's reference point and computes the
   * per-frame origin shift (Carbon EveUpdateContext::UpdateOrigin): the
   * double-precision delta is split into a float32 shift plus a double residual
   * carried into the next frame; no shift is produced on the first stamped frame
   * (origin still at the Infinity sentinel). The ballpark is duck-typed; per our
   * out-last convention its reference-point read is
   * GetReferencePoint(time, outVector3d) (Carbon passes the out pointer first).
   * @param {Object|null} ballpark
   */
  @carbon.method
  @impl.adapted
  UpdateOrigin(ballpark)
  {
    this.ballpark = ballpark ?? null;

    if (!ballpark?.GetReferencePoint)
    {
      return;
    }

    const originNow = EveUpdateContext.#originScratch;
    ballpark.GetReferencePoint(this.currentTime, originNow);

    if (this.origin[0] !== Infinity)
    {
      // originDelta = originNow - m_origin + m_originShiftRemainder (double),
      // then split into float32 (originShift, negated) + double residual.
      for (let axis = 0; axis < 3; axis++)
      {
        const delta = originNow[axis] - this.origin[axis] + this.originShiftRemainder[axis];
        const deltaF = Math.fround(delta);
        this.originShiftRemainder[axis] = delta - deltaF;
        this.originShift[axis] = -deltaF;
      }
    }
    this.origin.set(originNow);
  }

  /**
   * World origin, or (0,0,0) while still uninitialized (Carbon
   * EveUpdateContext::GetOrigin).
   * @returns {Float64Array}
   */
  @carbon.method
  @impl.adapted
  GetOrigin()
  {
    return this.origin[0] !== Infinity ? this.origin : EveUpdateContext.#zeroOrigin;
  }

  /**
   * Float32 origin shift for the current frame (Carbon
   * EveUpdateContext::GetOriginShift).
   * @returns {Float32Array}
   */
  @carbon.method
  @impl.implemented
  GetOriginShift()
  {
    return this.originShift;
  }

  /**
   * Carbon EveUpdateContext::GetDataTextureManager (h:61-64).
   * @returns {Object|null}
   */
  @carbon.method
  @impl.implemented
  GetDataTextureManager()
  {
    return this.dataTextureManager;
  }

  /**
   * Carbon EveUpdateContext::SetDataTextureManager (h:65-68).
   * @param {Object|null} manager
   */
  @carbon.method
  @impl.implemented
  SetDataTextureManager(manager)
  {
    this.dataTextureManager = manager ?? null;
  }

  /**
   * Carbon EveUpdateContext::GetGpuParticleSystem (h:70-73).
   * @returns {Object|null}
   */
  @carbon.method
  @impl.implemented
  GetGpuParticleSystem()
  {
    return this.gpuParticleSystem;
  }

  /**
   * Carbon EveUpdateContext::SetGpuParticleSystem (h:74-77).
   * @param {Object|null} ps
   */
  @carbon.method
  @impl.implemented
  SetGpuParticleSystem(ps)
  {
    this.gpuParticleSystem = ps ?? null;
  }

  /**
   * Carbon EveUpdateContext::GetBallpark (h:79-82) - stamped by UpdateOrigin.
   * @returns {Object|null}
   */
  @carbon.method
  @impl.implemented
  GetBallpark()
  {
    return this.ballpark;
  }

  /**
   * Carbon EveUpdateContext::SetTaskGroup (h:116-119).
   * @param {Object|null} taskGroup
   */
  @carbon.method
  @impl.implemented
  SetTaskGroup(taskGroup)
  {
    this.taskGroup = taskGroup ?? null;
  }

  /**
   * Carbon EveUpdateContext::GetTaskGroup (h:121-124).
   * @returns {Object|null}
   */
  @carbon.method
  @impl.implemented
  GetTaskGroup()
  {
    return this.taskGroup;
  }

  /**
   * Carbon EveUpdateContext::SetVisibilityThreshold (h:126-129).
   * @param {Number} visibilityThreshold
   */
  @carbon.method
  @impl.implemented
  SetVisibilityThreshold(visibilityThreshold)
  {
    this.visibilityThreshold = visibilityThreshold;
  }

  /**
   * Carbon EveUpdateContext::GetVisibilityThreshold (h:131-134).
   * @returns {Number}
   */
  @carbon.method
  @impl.implemented
  GetVisibilityThreshold()
  {
    return this.visibilityThreshold;
  }

  /**
   * Carbon EveUpdateContext::SetHighDetailThreshold (h:136-139).
   * @param {Number} highDetailThreshold
   */
  @carbon.method
  @impl.implemented
  SetHighDetailThreshold(highDetailThreshold)
  {
    this.highDetailThreshold = highDetailThreshold;
  }

  /**
   * Carbon EveUpdateContext::GetHighDetailThreshold (h:141-144).
   * @returns {Number}
   */
  @carbon.method
  @impl.implemented
  GetHighDetailThreshold()
  {
    return this.highDetailThreshold;
  }

  /**
   * Carbon EveUpdateContext::SetMediumDetailThreshold (h:146-149).
   * @param {Number} mediumDetailThreshold
   */
  @carbon.method
  @impl.implemented
  SetMediumDetailThreshold(mediumDetailThreshold)
  {
    this.mediumDetailThreshold = mediumDetailThreshold;
  }

  /**
   * Carbon EveUpdateContext::GetMediumDetailThreshold (h:151-154).
   * @returns {Number}
   */
  @carbon.method
  @impl.implemented
  GetMediumDetailThreshold()
  {
    return this.mediumDetailThreshold;
  }

  /**
   * Carbon EveUpdateContext::SetLowDetailThreshold (h:156-159).
   * @param {Number} lowDetailThreshold
   */
  @carbon.method
  @impl.implemented
  SetLowDetailThreshold(lowDetailThreshold)
  {
    this.lowDetailThreshold = lowDetailThreshold;
  }

  /**
   * Carbon EveUpdateContext::GetLowDetailThreshold (h:161-164).
   * @returns {Number}
   */
  @carbon.method
  @impl.implemented
  GetLowDetailThreshold()
  {
    return this.lowDetailThreshold;
  }

  /**
   * Carbon EveUpdateContext::SetLodFactor (h:166-170) - maintains the
   * invariant invLodFactor = 1 / lodFactor (no zero guard, matching Carbon).
   * @param {Number} lodFactor
   */
  @carbon.method
  @impl.implemented
  SetLodFactor(lodFactor)
  {
    this.lodFactor = lodFactor;
    this.invLodFactor = 1 / lodFactor;
  }

  /**
   * Carbon EveUpdateContext::GetLodFactor (h:172-175).
   * @returns {Number}
   */
  @carbon.method
  @impl.implemented
  GetLodFactor()
  {
    return this.lodFactor;
  }

  /**
   * Carbon EveUpdateContext::GetInvLodFactor (h:177-180).
   * @returns {Number}
   */
  @carbon.method
  @impl.implemented
  GetInvLodFactor()
  {
    return this.invLodFactor;
  }

  /**
   * Carbon EveUpdateContext::SetFrustum (h:182-185) - the driver stamps a
   * ready TriFrustum per frame (spec decision 4); held by reference, not
   * copied.
   * @param {Object|null} frustum - TriFrustum
   */
  @carbon.method
  @impl.implemented
  SetFrustum(frustum)
  {
    this.frustum = frustum ?? null;
  }

  /**
   * Carbon EveUpdateContext::GetFrustum (h:187-190).
   * @returns {Object|null}
   */
  @carbon.method
  @impl.implemented
  GetFrustum()
  {
    return this.frustum;
  }

  static #originScratch = new Float64Array(3);

  static #zeroOrigin = new Float64Array(3);
}
