import { Tr2DeviceResource } from "../../../core/device/Tr2DeviceResource.js";
// Source: trinity/trinity/Eve/UI/EveTacticalTrails.h
// Source: trinity/trinity/Eve/UI/EveTacticalTrails.cpp
// Hand-maintained after promotion from generated schema intake.
import { meta, type, blue } from "#schema";
import { CcpTime } from "#blue";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { TriBatchType, RenderingMode } from "#consts/graphics";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { Tr2BufferAL } from "../../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Failed } from "../../../../trinityal/ALResult.js";
import { TriDevice } from "../../../core/device/TriDevice.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/Tr2RenderBatch.js";


// Carbon's anonymous-namespace LineVertex (EveTacticalTrails.cpp:15-21):
// { Vector3 position; Vector3 lineDir; float time; Vector2 quad; } - nine
// floats, 36 bytes.
const LINE_VERTEX_FLOATS = 9;

/** "4 triangles: one quad and two connectors" (cpp:37). */
const SEGMENT_VERTEX_COUNT = 12;

// The trail declaration, built as Carbon builds it inside UpdateGraphicsState
// (cpp:189-201); the ledger lands on the 36-byte LineVertex.
const TRAIL_VERTEX_DEFINITION = new Tr2VertexDefinition();
TRAIL_VERTEX_DEFINITION.Add("FLOAT32_3", "POSITION");
TRAIL_VERTEX_DEFINITION.Add("FLOAT32_3", "TEXCOORD", 0);
TRAIL_VERTEX_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 1);
TRAIL_VERTEX_DEFINITION.Add("FLOAT32_2", "TEXCOORD", 2);

const LINE_VERTEX_BYTES = TRAIL_VERTEX_DEFINITION.nextOffset[0];


/**
 * Carbon's EveTacticalTrails: fading trails behind registered objects (destiny balls), sampled each frame as control
 * points relative to the ego ball and drawn as a strip of quads with connectors, transparent under RM_ALPHA.
 */
@blue.define("EveTacticalTrails")
@blue.inherit(IEveSpaceObject2, ITr2Renderable, Tr2DeviceResource)
@blue.interface(IEveSpaceObject2, ITr2Renderable)
export class EveTacticalTrails
{
  /** m_vertexDeclHandle, interned on first need. */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_vertexBuffer, filled by UpdateGraphicsState. */
  _vertexBuffer = new Tr2BufferAL();

  /** The LineVertex records an upload copies from, grown with the segment count (Carbon allocates from the pool). */
  _staging = new Float32Array(0);

  /** m_egoBallPosition (Vector3d): the double-precision origin every trail position is rebased against. */
  _egoBallPosition = new Float64Array(3); // alloc: Carbon Vector3d; no double-precision math type

  /** m_trackedObjects: { ball: WeakRef (Carbon's BlueWeakRef) or null, positions: [ { position, time } ] }. */
  @type.list("EveTacticalTrailTrackedObject")
  trackedObjects = [];

  /** m_segmentCount (uint32_t) [READ] */
  @blue.read
  @type.uint32
  segments = 0;

  /** m_egoBall (ITriVectorFunctionPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("ITriVectorFunction")
  egoBall = null;

  /** m_trailEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Effect")
  trailEffect = null;

  /** m_fadeOutTime (float) [READWRITE, PERSIST]: seconds for a trail to fade out. */
  @blue.readwrite
  @blue.persist
  @type.float32
  fadeOutTime = 5;

  /** Registers the device-resource lifetime, as Carbon's Tr2DeviceResource base does. */
  constructor()
  {
    TriDevice.RegisterResource(this);
  }

  /** Carbon ReleaseResources (cpp:73-76): drops the interned declaration; the buffer is kept. */
  @blue.method
  @meta.implemented
  ReleaseResources(_storage)
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
  }

  /** Carbon OnPrepareResources (cpp:78-81): nothing to prepare; the buffer is built on demand. */
  @meta.implemented
  @blue.method
  OnPrepareResources()
  {
    return true;
  }

  /**
   * Releases final ownership because JavaScript has no deterministic destructor.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    this.ReleaseResources();
    this._vertexBuffer.Destroy();
    TriDevice.UnregisterResource(this);
  }

  /**
   * Carbon RegisterObject (cpp:84-102): tracks a ball that will leave a trail as it moves. A null object or one
   * already tracked is logged and ignored. The ball is held weakly, as Carbon's BlueWeakRef holds it.
   */
  @blue.method
  @meta.implemented
  RegisterObject(object)
  {
    if (!object)
    {
      console.error("EveTacticalTrails::RegisterObject: Object is null");
      return;
    }
    const found = this.trackedObjects.some(entry => entry.ball !== null && entry.ball.deref() === object);
    if (found)
    {
      console.warn("EveTacticalTrails::RegisterObject: Object already registered");
      return;
    }
    this.trackedObjects.push({ ball: new WeakRef(object), positions: [] });
  }

  /** Carbon UnregisterObject (cpp:104-111): stops tracking a ball; its trail fades out first. */
  @blue.method
  @meta.implemented
  UnregisterObject(object)
  {
    const found = this.trackedObjects.find(entry => entry.ball !== null && entry.ball.deref() === object);
    if (found) found.ball = null;
  }

  /**
   * Carbon UpdateSyncronous (cpp:113-172). Drops control points older than fadeOutTime, keeping the one before the
   * first live point, and forgets an unregistered or freed object once its trail has faded. Each tracked ball then
   * adds a control point: a new one when the path bends by more than a metre from the last segment's line, turns
   * back, or the last segment is over 10 km long; otherwise it moves the last point. Finally it samples the ego ball
   * and rebuilds the vertices.
   */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext)
  {
    const now = updateContext.GetTime();
    // Remove expired control points.
    for (const object of this.trackedObjects)
    {
      const positions = object.positions;
      if (positions.length >= 2)
      {
        let it = 0;
        while (it + 1 !== positions.length && CcpTime.timeAsFloat(now - positions[it + 1].time) > this.fadeOutTime) ++it;
        positions.splice(0, it);
      }
    }
    // A ball the garbage collector freed reads as null, as a cleared BlueWeakRef does.
    for (const object of this.trackedObjects)
    {
      if (object.ball !== null && object.ball.deref() === undefined) object.ball = null;
    }
    // Remove deleted objects once their trails have fully faded out.
    this.trackedObjects = this.trackedObjects.filter(object => object.ball !== null || object.positions.length >= 2);

    // Add new control points.
    const { vec3d_0 } = EveTacticalTrails.scratch;
    for (const object of this.trackedObjects)
    {
      if (object.ball === null) continue;
      const position = object.ball.deref().InterpolatedPosition(now, vec3.set(vec3d_0, 0, 0, 0));
      const positions = object.positions;
      if (positions.length < 2)
      {
        positions.push({ position: Float64Array.from(position), time: now }); // alloc: a kept control point
      }
      else
      {
        const p0 = positions[positions.length - 2].position;
        const p1 = positions[positions.length - 1].position;

        const distance = EveTacticalTrails._DistanceFromPointToLine(p1, p0, position);
        const towards = (position[0] - p1[0]) * (p0[0] - p1[0]) + (position[1] - p1[1]) * (p0[1] - p1[1])
          + (position[2] - p1[2]) * (p0[2] - p1[2]);
        if (distance > 1 || towards > 0 || vec3.distance(p1, p0) > 10000)
        {
          positions.push({ position: Float64Array.from(position), time: now }); // alloc: a kept control point
        }
        else
        {
          const last = positions[positions.length - 1];
          vec3.copy(last.position, position);
          last.time = now;
        }
      }
    }

    if (this.egoBall) this.egoBall.InterpolatedPosition(now, this._egoBallPosition);
    else vec3.set(this._egoBallPosition, 0, 0, 0);

    this.UpdateGraphicsState(now);
  }

  /**
   * Carbon UpdateGraphicsState (cpp:174-258): counts the frame's segments, interns the line declaration on first
   * need, and packs twelve LineVertex records per segment. Positions are rebased against the ego ball in double
   * precision, then stored as floats; each point fades as TimeAsFloat( now - time ) / fadeOutTime, and the final
   * segment's third point is extrapolated as pos2 + (pos2 - pos1). The records go into the vertex buffer, which grows
   * to max(1024, 2x need) vertices when short; a failed map zeroes the segment count.
   * @param {number} now Scene time in Blue ticks.
   */
  @meta.implemented
  @blue.method
  UpdateGraphicsState(now)
  {
    this.segments = this.trackedObjects.reduce((sum, object) => sum + Math.max(object.positions.length, 1) - 1, 0);
    if (this.segments === 0) return;

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    if (!renderContext.IsValid())
    {
      this.segments = 0;
      return;
    }

    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(TRAIL_VERTEX_DEFINITION);
    }

    const needed = this.segments * SEGMENT_VERTEX_COUNT;
    if (this._staging.length < needed * LINE_VERTEX_FLOATS)
    {
      this._staging = new Float32Array(needed * LINE_VERTEX_FLOATS); // alloc: grows with the segment count
    }
    const floats = this._staging;
    // vec3_0 is pos1, vec3_1 pos2 and vec3_2 posNext (cpp:220-238).
    const { vec3_0, vec3_1, vec3_2 } = EveTacticalTrails.scratch;
    const ego = this._egoBallPosition;
    let base = 0;
    for (const object of this.trackedObjects)
    {
      const positions = object.positions;
      if (positions.length < 2) continue;

      vec3.subtract(vec3_0, positions[0].position, ego);
      let time1 = CcpTime.timeAsFloat(now - positions[0].time) / this.fadeOutTime;
      vec3.subtract(vec3_1, positions[1].position, ego);

      for (let i = 0; i + 1 < positions.length; i++)
      {
        const time2 = CcpTime.timeAsFloat(now - positions[i + 1].time) / this.fadeOutTime;
        if (i + 2 >= positions.length) vec3.scaleAndAdd(vec3_2, vec3_1, vec3.subtract(vec3_2, vec3_1, vec3_0), 1);
        else vec3.subtract(vec3_2, positions[i + 2].position, ego);
        EveTacticalTrails._WriteLineVerticesToBuffer(vec3_0, time1, vec3_1, time2, vec3_2, floats, base);
        base += SEGMENT_VERTEX_COUNT * LINE_VERTEX_FLOATS;
        vec3.copy(vec3_0, vec3_1);
        vec3.copy(vec3_1, vec3_2);
        time1 = time2;
      }
    }

    if (!this._vertexBuffer.IsValid() || this._vertexBuffer.GetDesc().count < needed)
    {
      const capacity = Math.max(1024, needed * 2);
      this._vertexBuffer.Create(Tr2BufferDescriptionAL.create__Stride(LINE_VERTEX_BYTES, capacity, Tr2GpuUsage.VERTEX_BUFFER,
        Tr2CpuUsage.WRITE_OFTEN), null, renderContext);
    }
    const mapping = this._vertexBuffer.IsValid() ? this._vertexBuffer.MapForWriting(renderContext) : null;
    if (mapping !== null && !Failed(mapping.result) && mapping.data)
    {
      mapping.data.set(new Uint8Array(floats.buffer, 0, needed * LINE_VERTEX_BYTES)); // alloc: byte view for the upload
      this._vertexBuffer.UnmapForWriting(renderContext);
    }
    else
    {
      this.segments = 0;
    }
  }

  /** Carbon UpdateAsyncronous (cpp:261-263): nothing to do. */
  @blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Carbon UpdateVisibility (cpp:265-267): nothing to do; the trails are never culled. */
  @blue.method
  @meta.implemented
  UpdateVisibility(_updateContext, _parentTransform)
  {
  }

  /** Carbon's GetRenderables( renderables, impostors ) (cpp:269-272): always the trails themselves. */
  @meta.implemented
  @blue.method
  GetRenderables__Impostors(out = [], _impostors = null)
  {
    out.push(this);
    return out;
  }

  /** Carbon GetBoundingSphere (cpp:274-277): the trails have none. */
  @blue.method
  @meta.implemented
  GetBoundingSphere(_sphere, _query = 0)
  {
    return false;
  }

  /** Carbon UpdateModelCenterWorldPosition (cpp:279-282): the origin. */
  @blue.method
  @meta.implemented
  UpdateModelCenterWorldPosition(position, _time)
  {
    vec3.set(position, 0, 0, 0);
  }

  /** Carbon GetModelCenterWorldPosition (cpp:284-287): the origin. */
  @blue.method
  @meta.implemented
  GetModelCenterWorldPosition(position)
  {
    vec3.set(position, 0, 0, 0);
  }

  /** Carbon GetLocalBoundingBox (cpp:289-292): the trails have none. */
  @blue.method
  @meta.implemented
  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  /** Carbon GetLocalToWorldTransform (cpp:294-297): the identity. */
  @blue.method
  @meta.implemented
  GetLocalToWorldTransform(transform)
  {
    mat4.identity(transform);
  }

  /**
   * Carbon GetBatches (cpp:299-317): transparent only; with segments, a vertex buffer and a declaration, one draw of
   * twelve vertices per segment under RM_ALPHA.
   */
  @blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT) return;
    if (this.segments === 0 || !this._vertexBuffer.IsValid() || this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.trailEffect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetStreamSource(0, this._vertexBuffer, LINE_VERTEX_BYTES);
    batch.SetDrawInstanced(SEGMENT_VERTEX_COUNT * this.segments, 1, 0, 0);
    batch.SetRenderingMode(RenderingMode.RM_ALPHA);
    batches.Commit(batch);
  }

  /** Carbon EveTacticalTrails::HasTransparentBatches is always true (cpp:319-322). */
  @blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Carbon EveTacticalTrails::GetSortValue is zero (cpp:324-327). */
  @blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /** Carbon EveTacticalTrails::GetPerObjectData returns null (cpp:329-332). */
  @blue.method
  @meta.implemented
  GetPerObjectData(_accumulator)
  {
    return null;
  }

  /** Carbon's anonymous-namespace DistanceFromPointToLine (cpp:23-35), in double precision. */
  static _DistanceFromPointToLine(point, lineStart, lineEnd)
  {
    const lx = lineEnd[0] - lineStart[0], ly = lineEnd[1] - lineStart[1], lz = lineEnd[2] - lineStart[2];
    const px = point[0] - lineStart[0], py = point[1] - lineStart[1], pz = point[2] - lineStart[2];
    const lineLengthSquared = lx * lx + ly * ly + lz * lz;
    if (lineLengthSquared === 0) return Math.hypot(px, py, pz);
    const t = (px * lx + py * ly + pz * lz) / lineLengthSquared;
    return Math.hypot(px - lx * t, py - ly * t, pz - lz * t);
  }

  /**
   * Carbon's anonymous-namespace WriteLineVerticesToBuffer (cpp:39-64): one segment's twelve vertices, row for row.
   * The segment quad is two triangles between pos1 and pos2, lineDir carrying the offset to the other end; the two
   * connector triangles fan pos2 towards pos3.
   */
  static _WriteLineVerticesToBuffer(pos1, time1, pos2, time2, pos3, floats, base)
  {
    const dx = pos2[0] - pos1[0], dy = pos2[1] - pos1[1], dz = pos2[2] - pos1[2];
    const nx = pos3[0] - pos2[0], ny = pos3[1] - pos2[1], nz = pos3[2] - pos2[2];
    const write = EveTacticalTrails._WriteLineVertex;

    write(floats, base, 0, pos1, dx, dy, dz, time1, -1, -1);
    write(floats, base, 1, pos1, dx, dy, dz, time1, -1, 1);
    write(floats, base, 2, pos2, -dx, -dy, -dz, time2, 1, -1);

    write(floats, base, 3, pos1, dx, dy, dz, time1, -1, 1);
    write(floats, base, 4, pos2, -dx, -dy, -dz, time2, 1, 1);
    write(floats, base, 5, pos2, -dx, -dy, -dz, time2, 1, -1);

    write(floats, base, 6, pos2, -dx, -dy, -dz, time2, 1, -1);
    write(floats, base, 7, pos2, -dx, -dy, -dz, time2, 1, 0);
    write(floats, base, 8, pos2, nx, ny, nz, time2, -1, -1);

    write(floats, base, 9, pos2, -dx, -dy, -dz, time2, 1, 0);
    write(floats, base, 10, pos2, -dx, -dy, -dz, time2, 1, 1);
    write(floats, base, 11, pos2, nx, ny, nz, time2, -1, -1);
  }

  /** One LineVertex: position, lineDir, time, quad. */
  static _WriteLineVertex(floats, base, index, position, dirX, dirY, dirZ, time, quadX, quadY)
  {
    let at = base + index * LINE_VERTEX_FLOATS;
    floats[at++] = position[0]; floats[at++] = position[1]; floats[at++] = position[2];
    floats[at++] = dirX; floats[at++] = dirY; floats[at++] = dirZ;
    floats[at++] = time;
    floats[at++] = quadX; floats[at] = quadY;
  }

  static scratch = {
    vec3_0: new Float64Array(3),
    vec3_1: new Float64Array(3),
    vec3_2: new Float64Array(3),
    vec3d_0: new Float64Array(3)
  };
}
