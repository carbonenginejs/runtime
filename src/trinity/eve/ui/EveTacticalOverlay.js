import { IsMatch } from "#blue";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.h
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay.cpp
// Source: trinity/trinity/Eve/UI/EveTacticalOverlay_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; quad instance policy is portable CPU work.
import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition/index.js";


const effectIdentities = new WeakMap();
let nextEffectIdentity = 1;

// These three ARE Carbon's AnchorVertex/SphereConnectorVertex/
// VelocityConnectorVertex::GetDefinition statics (EveTacticalOverlay.cpp:
// 31-66) - three nested-struct methods the schema scrape collapses to the
// single name "GetDefinition", which is why the parity baseline carries a
// GetDefinition entry for this class despite all three being ported here.
// Built the way Carbon builds every definition: Tr2VertexDefinition.Add
// with its automatic per-stream offsets.
const ANCHOR_DEFINITION = new Tr2VertexDefinition();
ANCHOR_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 5);
ANCHOR_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 0, 1, 1);

const CONNECTOR_DEFINITION = new Tr2VertexDefinition();
CONNECTOR_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 5);
CONNECTOR_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 0, 1, 1);
CONNECTOR_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 1, 1, 1);

const VELOCITY_DEFINITION = new Tr2VertexDefinition();
VELOCITY_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 5);
VELOCITY_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 0, 1, 1);
VELOCITY_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 1, 1, 1);


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
@meta.define({ className: "EveTacticalOverlay", family: "eve/ui" })
@meta.blue.inherit(IEveSpaceObject2)
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveTacticalOverlay
{
  /** Initializes the effect-local variable-store records. */
  constructor()
  {
    this._RegisterVariables();
  }

  /** Attaches the owned variable store to every authored effect. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this._SetVariableStore(this.anchorEffect);
    this._SetVariableStore(this.connectorEffect);
    this._SetVariableStore(this.velocityEffect);
    return true;
  }

  /** Reattaches only effect references that changed since the prior settle. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS dispatches the native hook using the exposed member name; existing class-owned rendering/resource adaptations remain unchanged.")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "anchorEffect")) this._SetVariableStore(this.anchorEffect);
    if (IsMatch(propertyName, "connectorEffect")) this._SetVariableStore(this.connectorEffect);
    if (IsMatch(propertyName, "velocityEffect")) this._SetVariableStore(this.velocityEffect);
    return true;
  }

  /** Samples the root and every owned track object, then refreshes effect variables. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon vector-function output pointers use the runtime's established time-first, out-last JavaScript contract.")
  UpdateSyncronous(updateContext)
  {
    if (this.translationCurve)
    {
      const time = updateContext.GetTime();
      this.translationCurve.GetValueAt(time, this.worldPosition);
      this.translationCurve.GetValueDotAt(time, this._rootVelocity);
    }
    for (const trackObject of this.trackObjects)
    {
      trackObject.UpdatePosition(updateContext);
    }
    this._RegisterVariables();
  }

  /** Carbon's asynchronous overlay update is intentionally empty. */
  @meta.blue.method
  @meta.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Rebuilds the flat CPU instance records for this frame. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's typed vertex vectors are represented by flat Float32Array-compatible number buffers consumed by Tr2QuadRenderer.")
  UpdateVisibility(updateContext, _parentTransform)
  {
    this._anchorBuffer.length = 0;
    this._connectorBuffer.length = 0;
    this._velocityBuffer.length = 0;

    const rootX = this.worldPosition[0];
    const rootY = this.worldPosition[1];
    const rootZ = this.worldPosition[2];
    const sourceRadius = this.sourceRadius;
    const distanceThreshold = (this.activeRange + this.rangeFadeLength) * this.rangeMultiplier;
    let requestedSegments = 0;
    const frustum = updateContext.GetFrustum();

    for (const trackObject of this.trackObjects)
    {
      trackObject.GetPosition(this._positionScratch);
      const positionX = this._positionScratch[0];
      const positionY = this._positionScratch[1];
      const positionZ = this._positionScratch[2];
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
        this._sphereScratch,
        positionX + halfX,
        positionY + halfY,
        positionZ + halfZ,
        Math.hypot(halfX, halfY, halfZ) + 1e-4
      );
      if (!frustum.IsSphereVisible(this._sphereScratch)) continue;

      const pixelDiameter = frustum.GetPixelSizeAccross(this._sphereScratch);
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
      this._anchorBuffer.push(positionX, positionY, positionZ, interestReducedIntensity);
      for (let segmentIndex = 0; segmentIndex < counter; segmentIndex++)
      {
        this._connectorBuffer.push(
          positionX,
          positionY,
          positionZ,
          segments * 256 + segmentIndex,
          Math.floor(radius) + interestReducedIntensity
        );
      }

      trackObject.GetVelocity(this._velocityScratch);
      const velocityX = this._velocityScratch[0];
      const velocityY = this._velocityScratch[1];
      const velocityZ = this._velocityScratch[2];
      for (let kind = 0; kind < 3; kind++)
      {
        if (kind === 1 && !trackObject.IsAggressive()) continue;
        if (kind === 0 && !trackObject.ShowVelocity()) continue;
        this._velocityBuffer.push(
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

    this._velocityBuffer.push(
      rootX,
      rootY,
      rootZ,
      0,
      this._rootVelocity[0],
      this._rootVelocity[1],
      this._rootVelocity[2],
      Math.floor(sourceRadius)
    );
    if (this.interestObject && this.interestObject.ShowVelocity())
    {
      this.interestObject.GetPosition(this._positionScratch);
      const interestX = this._positionScratch[0];
      const interestY = this._positionScratch[1];
      const interestZ = this._positionScratch[2];
      const interestRadius = this.interestObject.GetRadius();
      this._velocityBuffer.push(
        interestX,
        interestY,
        interestZ,
        0,
        this._rootVelocity[0],
        this._rootVelocity[1],
        this._rootVelocity[2],
        Math.floor(interestRadius) + 0.9
      );
      this.interestObject.GetVelocity(this._velocityScratch);
      this._velocityBuffer.push(
        rootX,
        rootY,
        rootZ,
        0,
        this._velocityScratch[0],
        this._velocityScratch[1],
        this._velocityScratch[2],
        Math.floor(sourceRadius) + 0.9
      );
    }

    this.totalSegmentsLast = this._connectorBuffer.length / 5;
    this.requestedSegmentsLast = requestedSegments;
  }

  /** Carbon's tactical overlay has no ordinary renderable children. */
  @meta.blue.method
  @meta.noop
  GetRenderables(_renderables, _impostors)
  {
  }

  /** The overlay supplies no spatial bounds. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(_sphere, _query)
  {
    return false;
  }

  /** The overlay's model center is always the world origin. */
  @meta.blue.method
  @meta.implemented
  UpdateModelCenterWorldPosition(out, _time)
  {
    vec3.set(out, 0, 0, 0);
  }

  /** The overlay's model center is always the world origin. */
  @meta.blue.method
  @meta.implemented
  GetModelCenterWorldPosition(out)
  {
    vec3.set(out, 0, 0, 0);
  }

  /** The overlay supplies no local box. */
  @meta.blue.method
  @meta.implemented
  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  /** The overlay has no authored object transform. */
  @meta.blue.method
  @meta.implemented
  GetLocalToWorldTransform(out)
  {
    mat4.identity(out);
  }

  /** Registers the three exact instance layouts with the shared quad renderer. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon combines an effect content hash with its native pointer; JavaScript combines it with a stable WeakMap identity.")
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.connectorEffect)
    {
      this._connectorEffectKey = getEffectKey(this.connectorEffect);
      quadRenderer.RegisterEffect(
        this._connectorEffectKey,
        TriBatchType.TRIBATCHTYPE_ADDITIVE,
        20,
        1,
        CONNECTOR_DEFINITION,
        this.connectorEffect
      );
    }
    if (this.anchorEffect)
    {
      this._anchorEffectKey = getEffectKey(this.anchorEffect);
      quadRenderer.RegisterEffect(
        this._anchorEffectKey,
        TriBatchType.TRIBATCHTYPE_ADDITIVE,
        16,
        1,
        ANCHOR_DEFINITION,
        this.anchorEffect
      );
    }
    if (this.velocityEffect)
    {
      this._velocityEffectKey = getEffectKey(this.velocityEffect);
      quadRenderer.RegisterEffect(
        this._velocityEffectKey,
        TriBatchType.TRIBATCHTYPE_ADDITIVE,
        32,
        1,
        VELOCITY_DEFINITION,
        this.velocityEffect
      );
    }
  }

  /** Adds all three instance streams once their effect registrations exist. */
  @meta.blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(_frustum, quadRenderer)
  {
    if (!this._connectorEffectKey || !this._anchorEffectKey || !this._velocityEffectKey) return;
    quadRenderer.AddQuads(this._connectorEffectKey, this._connectorBuffer, this._connectorBuffer.length / 5);
    quadRenderer.AddQuads(this._anchorEffectKey, this._anchorBuffer, this._anchorBuffer.length / 4);
    quadRenderer.AddQuads(this._velocityEffectKey, this._velocityBuffer, this._velocityBuffer.length / 8);
  }

  /** Refreshes the variable-store values exposed to tactical effects. */
  _RegisterVariables()
  {
    vec4.set(
      this._ranges,
      this.activeRange,
      this.rangeFadeLength,
      this.rangeMultiplier,
      this.sourceRadius
    );
    this._variableStore.RegisterVariable("PlanePosition", this.worldPosition);
    this._variableStore.RegisterVariable("Fadeout", this._ranges);
    this._variableStore.RegisterVariable("RootVelocity", this._rootVelocity);
  }

  /** Attaches the local variable store to one nullable effect. */
  _SetVariableStore(effect)
  {
    if (!effect) return;
    effect.StartUpdate();
    effect.SetVariableStore(this._variableStore);
    effect.EndUpdate();
  }

  /** m_trackObjects (PEveTacticalOverlayTrackObjectVector) [READ] */
  @meta.blue.read
  @meta.type.list("EveTacticalOverlayTrackObject")
  trackObjects = [];

  /** m_totalSegmentsLast (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  totalSegmentsLast = 0;

  /** m_requestedSegmentsLast (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  requestedSegmentsLast = 0;

  /** m_anchorEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  anchorEffect = null;

  /** m_connectorEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  connectorEffect = null;

  /** m_velocityEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  velocityEffect = null;

  /** m_ranges.x (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  activeRange = 200000;

  /** m_ranges.y (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  rangeFadeLength = 50000;

  /** m_ranges.z (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  rangeMultiplier = 1;

  /** m_ranges.w (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sourceRadius = 50;

  /** m_interestRange (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  interestRange = 0;

  /** m_outsideInterestIntensity (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  outsideInterestIntensity = 0.35;

  /** m_minRadiusForRange (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minRadiusForRange = 150;

  /** m_connectorSegmentsLow (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  segmentsLow = 2;

  /** m_connectorSegmentsMedium (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  segmentsMedium = 5;

  /** m_connectorSegmentsHigh (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  segmentsHigh = 9;

  /** m_targetSegmentCount (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  targetMaxSegments = 25000;

  /** m_arcSegmentMultiplier (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  arcSegmentMultiplier = 1;

  /** m_segmentCountMultiplier (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  segmentCountMultiplier = 2;

  /** m_positionCurve (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriVectorFunction")
  translationCurve = null;

  /** m_rootPosition (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  worldPosition = vec3.create();

  /** m_interestObject (EveTacticalOverlayTrackObjectPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("EveTacticalOverlayTrackObject")
  interestObject = null;

  // Carbon's deterministic destructor detaches this local store from the three
  // effects. JavaScript has no model-level destruction hook: the hydrated
  // overlay and its authored effects therefore share one graph lifetime. A
  // future nominal graph-lifecycle contract must own explicit detachment rather
  // than relying on a finalizer or a backend-specific teardown probe.
  _rootVelocity = vec3.create();
  _variableStore = new Tr2VariableStore();
  _ranges = vec4.fromValues(200000, 50000, 1, 50);
  _anchorBuffer = [];
  _connectorBuffer = [];
  _velocityBuffer = [];
  _positionScratch = vec3.create();
  _velocityScratch = vec3.create();
  _sphereScratch = vec4.create();
  _anchorEffectKey = null;
  _connectorEffectKey = null;
  _velocityEffectKey = null;
}
