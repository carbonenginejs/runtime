// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.h
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.cpp
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; quad instance policy is portable CPU work.
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";


const effectIdentities = new WeakMap();
let nextEffectIdentity = 1;

const QUAD_CORNER_ELEMENT = Object.freeze({
  usage: "TEXCOORD",
  usageIndex: 5,
  type: "FLOAT32_1",
  offset: 0,
  stream: 0,
  instanceStepRate: 0
});
const INSTANCE_DATA_ELEMENT = Object.freeze({
  usage: "TEXCOORD",
  usageIndex: 0,
  type: "FLOAT32_4",
  offset: 0,
  stream: 1,
  instanceStepRate: 1
});
const ANCHOR_DEFINITION = Object.freeze([
  QUAD_CORNER_ELEMENT,
  INSTANCE_DATA_ELEMENT
]);
const CONNECTOR_DEFINITION = Object.freeze([
  QUAD_CORNER_ELEMENT,
  INSTANCE_DATA_ELEMENT,
  Object.freeze({
    usage: "TEXCOORD",
    usageIndex: 1,
    type: "FLOAT32_1",
    offset: 16,
    stream: 1,
    instanceStepRate: 1
  })
]);
const VELOCITY_DEFINITION = Object.freeze([
  QUAD_CORNER_ELEMENT,
  INSTANCE_DATA_ELEMENT,
  Object.freeze({
    usage: "TEXCOORD",
    usageIndex: 1,
    type: "FLOAT32_4",
    offset: 16,
    stream: 1,
    instanceStepRate: 1
  })
]);


function getEffectKey(effect)
{
  let identity = effectIdentities.get(effect);
  if (identity === undefined)
  {
    identity = nextEffectIdentity++;
    effectIdentities.set(effect, identity);
  }
  return `${effect.GetHashValue() >>> 0}:${identity}`;
}


function triLinearize(min, max, value)
{
  return Math.min(Math.max((value - min) / (max - min), 0), 1);
}


function getSubdivisionCount(pixelSize, low, medium, high, updateContext)
{
  if (pixelSize < updateContext.GetVisibilityThreshold()) return 0;

  let lowCount;
  let highCount;
  let lowStep;
  let highStep;
  if (pixelSize <= updateContext.GetLowDetailThreshold())
  {
    lowCount = 1;
    highCount = low;
    lowStep = updateContext.GetVisibilityThreshold();
    highStep = updateContext.GetLowDetailThreshold();
  }
  else if (pixelSize <= updateContext.GetMediumDetailThreshold())
  {
    lowCount = low;
    highCount = medium;
    lowStep = updateContext.GetLowDetailThreshold();
    highStep = updateContext.GetMediumDetailThreshold();
  }
  else
  {
    lowCount = medium;
    highCount = high;
    lowStep = updateContext.GetMediumDetailThreshold();
    highStep = updateContext.GetHighDetailThreshold();
  }
  return Math.floor(lowCount + (highCount - lowCount) * triLinearize(lowStep, highStep, pixelSize));
}


/** Produces tactical anchor, range, and velocity quad-instance records. */
@type.define({ className: "EveTacticalOverlay", family: "eve/ui" })
export class EveTacticalOverlay extends CjsModel
{
  /** Initializes the effect-local variable-store records. */
  constructor()
  {
    super();
    this.#RegisterVariables();
  }

  /** Attaches the owned variable store to every authored effect. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#SetVariableStore(this.anchorEffect);
    this.#SetVariableStore(this.connectorEffect);
    this.#SetVariableStore(this.velocityEffect);
    this.#lastAnchorEffect = this.anchorEffect;
    this.#lastConnectorEffect = this.connectorEffect;
    this.#lastVelocityEffect = this.velocityEffect;
    return true;
  }

  /** Reattaches only effect references that changed since the prior settle. */
  @carbon.method
  @impl.adapted
  @impl.reason("CjsModel supplies a broad settle hook rather than Carbon's Be::Var identity; cached effect references preserve the same targeted consequence.")
  OnModified(_options)
  {
    if (this.anchorEffect !== this.#lastAnchorEffect)
    {
      this.#SetVariableStore(this.anchorEffect);
      this.#lastAnchorEffect = this.anchorEffect;
    }
    if (this.connectorEffect !== this.#lastConnectorEffect)
    {
      this.#SetVariableStore(this.connectorEffect);
      this.#lastConnectorEffect = this.connectorEffect;
    }
    if (this.velocityEffect !== this.#lastVelocityEffect)
    {
      this.#SetVariableStore(this.velocityEffect);
      this.#lastVelocityEffect = this.velocityEffect;
    }
    return true;
  }

  /** Samples the root and every owned track object, then refreshes effect variables. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon vector-function output pointers use the runtime's established time-first, out-last JavaScript contract.")
  UpdateSyncronous(updateContext)
  {
    if (this.translationCurve)
    {
      const time = updateContext.GetTime();
      this.translationCurve.GetValueAt(time, this.worldPosition);
      this.translationCurve.GetValueDotAt(time, this.#rootVelocity);
    }
    for (const trackObject of this.trackObjects)
    {
      trackObject.UpdatePosition(updateContext);
    }
    this.#RegisterVariables();
  }

  /** Carbon's asynchronous overlay update is intentionally empty. */
  @carbon.method
  @impl.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Rebuilds the flat CPU instance records for this frame. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's typed vertex vectors are represented by flat Float32Array-compatible number buffers consumed by Tr2QuadRenderer.")
  UpdateVisibility(updateContext, _parentTransform)
  {
    this.#anchorBuffer.length = 0;
    this.#connectorBuffer.length = 0;
    this.#velocityBuffer.length = 0;

    const rootX = this.worldPosition[0];
    const rootY = this.worldPosition[1];
    const rootZ = this.worldPosition[2];
    const sourceRadius = this.sourceRadius;
    const distanceThreshold = (this.activeRange + this.rangeFadeLength) * this.rangeMultiplier;
    let requestedSegments = 0;
    const frustum = updateContext.GetFrustum();

    for (const trackObject of this.trackObjects)
    {
      trackObject.GetPosition(this.#positionScratch);
      const positionX = this.#positionScratch[0];
      const positionY = this.#positionScratch[1];
      const positionZ = this.#positionScratch[2];
      const radius = trackObject.GetRadius();
      const deltaX = positionX - rootX;
      const deltaY = positionY - rootY;
      const deltaZ = positionZ - rootZ;
      const distance = Math.hypot(deltaX, deltaY, deltaZ);
      if (distance > distanceThreshold) continue;

      const planarDirectionLength = Math.hypot(deltaX, deltaZ);
      let directionX = planarDirectionLength ? deltaX / planarDirectionLength : 0;
      let directionZ = planarDirectionLength ? deltaZ / planarDirectionLength : 0;
      if (!(directionX || directionZ)) directionX = 0.01;
      const planeX = rootX + directionX * distance;
      const planeY = rootY;
      const planeZ = rootZ + directionZ * distance;

      const halfX = (planeX - positionX) * 0.5;
      const halfY = (planeY - positionY) * 0.5;
      const halfZ = (planeZ - positionZ) * 0.5;
      vec4.set(
        this.#sphereScratch,
        positionX + halfX,
        positionY + halfY,
        positionZ + halfZ,
        Math.hypot(halfX, halfY, halfZ) + 1e-4
      );
      if (!frustum.IsSphereVisible(this.#sphereScratch)) continue;

      const pixelDiameter = frustum.GetPixelSizeAccross(this.#sphereScratch);
      let segments = getSubdivisionCount(
        pixelDiameter,
        this.segmentsLow,
        this.segmentsMedium,
        this.segmentsHigh,
        updateContext
      );
      if (segments !== 0)
      {
        const planarLength = Math.hypot(planeX - positionX, planeZ - positionZ);
        const height = Math.abs(positionY - planeY);
        segments *= 1 + this.arcSegmentMultiplier * planarLength / height;
        requestedSegments += segments * this.segmentCountMultiplier;
        if (this.requestedSegmentsLast && this.requestedSegmentsLast > this.targetMaxSegments)
        {
          segments *= this.targetMaxSegments / this.requestedSegmentsLast;
          segments = Math.max(segments, 1);
        }
        segments = this.segmentCountMultiplier * Math.floor(segments + 0.5);
      }

      const counter = radius > this.minRadiusForRange ? segments + 1 : segments;
      const interestReducedIntensity = this.interestRange > 0.0001 &&
        distance - radius - sourceRadius > this.interestRange
        ? 1 - this.outsideInterestIntensity
        : 0;
      this.#anchorBuffer.push(positionX, positionY, positionZ, interestReducedIntensity);
      for (let segmentIndex = 0; segmentIndex < counter; segmentIndex++)
      {
        this.#connectorBuffer.push(
          positionX,
          positionY,
          positionZ,
          segments * 256 + segmentIndex,
          Math.floor(radius) + interestReducedIntensity
        );
      }

      trackObject.GetVelocity(this.#velocityScratch);
      const velocityX = this.#velocityScratch[0];
      const velocityY = this.#velocityScratch[1];
      const velocityZ = this.#velocityScratch[2];
      for (let kind = 0; kind < 3; kind++)
      {
        if (kind === 1 && !trackObject.IsAggressive()) continue;
        if (kind === 0 && !trackObject.ShowVelocity()) continue;
        this.#velocityBuffer.push(
          positionX,
          positionY,
          positionZ,
          kind,
          velocityX,
          velocityY,
          velocityZ,
          Math.floor(radius) + (kind === 1 ? 0.9 : 0)
        );
      }
    }

    this.#velocityBuffer.push(
      rootX,
      rootY,
      rootZ,
      0,
      this.#rootVelocity[0],
      this.#rootVelocity[1],
      this.#rootVelocity[2],
      Math.floor(sourceRadius)
    );
    if (this.interestObject && this.interestObject.ShowVelocity())
    {
      this.interestObject.GetPosition(this.#positionScratch);
      const interestX = this.#positionScratch[0];
      const interestY = this.#positionScratch[1];
      const interestZ = this.#positionScratch[2];
      const interestRadius = this.interestObject.GetRadius();
      this.#velocityBuffer.push(
        interestX,
        interestY,
        interestZ,
        0,
        this.#rootVelocity[0],
        this.#rootVelocity[1],
        this.#rootVelocity[2],
        Math.floor(interestRadius) + 0.9
      );
      this.interestObject.GetVelocity(this.#velocityScratch);
      this.#velocityBuffer.push(
        rootX,
        rootY,
        rootZ,
        0,
        this.#velocityScratch[0],
        this.#velocityScratch[1],
        this.#velocityScratch[2],
        Math.floor(sourceRadius) + 0.9
      );
    }

    this.totalSegmentsLast = this.#connectorBuffer.length / 5;
    this.requestedSegmentsLast = requestedSegments;
  }

  /** Carbon's tactical overlay has no ordinary renderable children. */
  @carbon.method
  @impl.noop
  GetRenderables(_renderables, _impostors)
  {
  }

  /** The overlay supplies no spatial bounds. */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(_sphere, _query)
  {
    return false;
  }

  /** The overlay's model center is always the world origin. */
  @carbon.method
  @impl.implemented
  UpdateModelCenterWorldPosition(out, _time)
  {
    vec3.set(out, 0, 0, 0);
  }

  /** The overlay's model center is always the world origin. */
  @carbon.method
  @impl.implemented
  GetModelCenterWorldPosition(out)
  {
    vec3.set(out, 0, 0, 0);
  }

  /** The overlay supplies no local box. */
  @carbon.method
  @impl.implemented
  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  /** The overlay has no authored object transform. */
  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform(out)
  {
    mat4.identity(out);
  }

  /** Registers the three exact instance layouts with the shared quad renderer. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon combines an effect content hash with its native pointer; JavaScript combines it with a stable WeakMap identity.")
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.connectorEffect)
    {
      this.#connectorEffectKey = getEffectKey(this.connectorEffect);
      quadRenderer.RegisterEffect(
        this.#connectorEffectKey,
        TriBatchType.TRIBATCHTYPE_ADDITIVE,
        20,
        1,
        CONNECTOR_DEFINITION,
        this.connectorEffect
      );
    }
    if (this.anchorEffect)
    {
      this.#anchorEffectKey = getEffectKey(this.anchorEffect);
      quadRenderer.RegisterEffect(
        this.#anchorEffectKey,
        TriBatchType.TRIBATCHTYPE_ADDITIVE,
        16,
        1,
        ANCHOR_DEFINITION,
        this.anchorEffect
      );
    }
    if (this.velocityEffect)
    {
      this.#velocityEffectKey = getEffectKey(this.velocityEffect);
      quadRenderer.RegisterEffect(
        this.#velocityEffectKey,
        TriBatchType.TRIBATCHTYPE_ADDITIVE,
        32,
        1,
        VELOCITY_DEFINITION,
        this.velocityEffect
      );
    }
  }

  /** Adds all three instance streams once their effect registrations exist. */
  @carbon.method
  @impl.implemented
  AddQuadsToQuadRenderer(_frustum, quadRenderer)
  {
    if (!this.#connectorEffectKey || !this.#anchorEffectKey || !this.#velocityEffectKey) return;
    quadRenderer.AddQuads(this.#connectorEffectKey, this.#connectorBuffer, this.#connectorBuffer.length / 5);
    quadRenderer.AddQuads(this.#anchorEffectKey, this.#anchorBuffer, this.#anchorBuffer.length / 4);
    quadRenderer.AddQuads(this.#velocityEffectKey, this.#velocityBuffer, this.#velocityBuffer.length / 8);
  }

  /** Refreshes the variable-store values exposed to tactical effects. */
  #RegisterVariables()
  {
    vec4.set(
      this.#ranges,
      this.activeRange,
      this.rangeFadeLength,
      this.rangeMultiplier,
      this.sourceRadius
    );
    this.#variableStore.RegisterVariable("PlanePosition", this.worldPosition);
    this.#variableStore.RegisterVariable("Fadeout", this.#ranges);
    this.#variableStore.RegisterVariable("RootVelocity", this.#rootVelocity);
  }

  /** Attaches the local variable store to one nullable effect. */
  #SetVariableStore(effect)
  {
    if (!effect) return;
    effect.StartUpdate();
    effect.SetVariableStore(this.#variableStore);
    effect.EndUpdate();
  }

  /** m_trackObjects (PEveTacticalOverlayTrackObjectVector) [READ] */
  @io.read
  @type.list("EveTacticalOverlayTrackObject")
  trackObjects = [];

  /** m_totalSegmentsLast (float) [READ] */
  @io.read
  @type.float32
  totalSegmentsLast = 0;

  /** m_requestedSegmentsLast (float) [READ] */
  @io.read
  @type.float32
  requestedSegmentsLast = 0;

  /** m_anchorEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  anchorEffect = null;

  /** m_connectorEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  connectorEffect = null;

  /** m_velocityEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  velocityEffect = null;

  /** m_ranges.x (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  activeRange = 200000;

  /** m_ranges.y (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  rangeFadeLength = 50000;

  /** m_ranges.z (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  rangeMultiplier = 1;

  /** m_ranges.w (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sourceRadius = 50;

  /** m_interestRange (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  interestRange = 0;

  /** m_outsideInterestIntensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  outsideInterestIntensity = 0.35;

  /** m_minRadiusForRange (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minRadiusForRange = 150;

  /** m_connectorSegmentsLow (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  segmentsLow = 2;

  /** m_connectorSegmentsMedium (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  segmentsMedium = 5;

  /** m_connectorSegmentsHigh (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  segmentsHigh = 9;

  /** m_targetSegmentCount (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  targetMaxSegments = 25000;

  /** m_arcSegmentMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  arcSegmentMultiplier = 1;

  /** m_segmentCountMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  segmentCountMultiplier = 2;

  /** m_positionCurve (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  /** m_rootPosition (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  worldPosition = vec3.create();

  /** m_interestObject (EveTacticalOverlayTrackObjectPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("EveTacticalOverlayTrackObject")
  interestObject = null;

  // Carbon's deterministic destructor detaches this local store from the three
  // effects. JavaScript has no model-level destruction hook: the hydrated
  // overlay and its authored effects therefore share one graph lifetime. A
  // future nominal graph-lifecycle contract must own explicit detachment rather
  // than relying on a finalizer or a backend-specific teardown probe.
  #rootVelocity = vec3.create();
  #variableStore = new Tr2VariableStore();
  #ranges = vec4.fromValues(200000, 50000, 1, 50);
  #anchorBuffer = [];
  #connectorBuffer = [];
  #velocityBuffer = [];
  #positionScratch = vec3.create();
  #velocityScratch = vec3.create();
  #sphereScratch = vec4.create();
  #anchorEffectKey = null;
  #connectorEffectKey = null;
  #velocityEffectKey = null;
  #lastAnchorEffect = null;
  #lastConnectorEffect = null;
  #lastVelocityEffect = null;
}
