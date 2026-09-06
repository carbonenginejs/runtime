// Source: trinity/trinity/Eve/UI/EveTacticalTrails.h
// Source: trinity/trinity/Eve/UI/EveTacticalTrails.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, io, type } from "#schema";
import { withIEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { CjsModel } from "#model";
import { withITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { Tr2RenderContext } from "../../../core/context/Tr2RenderContext.js";
import { Tr2BufferDescriptionAL } from "../../../../trinityal/stub/Tr2BufferALStub.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed } from "../../../../trinityal/ALResult.js";


// Carbon's anonymous-namespace LineVertex (EveTacticalTrails.cpp:15-21):
// { Vector3 position; Vector3 lineDir; float time; Vector2 quad; } - nine
// floats, 36 bytes.
const LINE_VERTEX_FLOATS = 9;

/** "4 triangles: one quad and two connectors" (cpp:37). */
const SEGMENT_VERTEX_COUNT = 12;

// The trail declaration, BUILT as Carbon builds it inside UpdateGraphicsState
// (cpp:189-201); the ledger lands on the 36-byte LineVertex.
const TRAIL_VERTEX_DEFINITION = new Tr2VertexDefinition();
TRAIL_VERTEX_DEFINITION.Add("FLOAT32_3", "POSITION");
TRAIL_VERTEX_DEFINITION.Add("FLOAT32_3", "TEXCOORD", 0);
TRAIL_VERTEX_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 1);
TRAIL_VERTEX_DEFINITION.Add("FLOAT32_2", "TEXCOORD", 2);

const LINE_VERTEX_BYTES = TRAIL_VERTEX_DEFINITION.nextOffset[0];

/**
 * Carbon WriteLineVerticesToBuffer (cpp:39-64), one segment's twelve
 * vertices, transcribed row for row: the segment quad (two triangles between
 * pos1 and pos2, lineDir carrying the offset to the OTHER end), then the two
 * connector triangles that fan pos2 toward pos3.
 */
function WriteLineVerticesToBuffer(pos1, time1, pos2, time2, pos3, floats, base)
{
  const dx = pos2[0] - pos1[0], dy = pos2[1] - pos1[1], dz = pos2[2] - pos1[2];
  const nx = pos3[0] - pos2[0], ny = pos3[1] - pos2[1], nz = pos3[2] - pos2[2];

  const write = (index, position, dirX, dirY, dirZ, time, quadX, quadY) =>
  {
    let at = base + index * LINE_VERTEX_FLOATS;
    floats[at++] = position[0]; floats[at++] = position[1]; floats[at++] = position[2];
    floats[at++] = dirX; floats[at++] = dirY; floats[at++] = dirZ;
    floats[at++] = time;
    floats[at++] = quadX; floats[at] = quadY;
  };

  write(0, pos1, dx, dy, dz, time1, -1, -1);
  write(1, pos1, dx, dy, dz, time1, -1, 1);
  write(2, pos2, -dx, -dy, -dz, time2, 1, -1);

  write(3, pos1, dx, dy, dz, time1, -1, 1);
  write(4, pos2, -dx, -dy, -dz, time2, 1, 1);
  write(5, pos2, -dx, -dy, -dz, time2, 1, -1);

  write(6, pos2, -dx, -dy, -dz, time2, 1, -1);
  write(7, pos2, -dx, -dy, -dz, time2, 1, 0);
  write(8, pos2, nx, ny, nz, time2, -1, -1);

  write(9, pos2, -dx, -dy, -dz, time2, 1, 0);
  write(10, pos2, -dx, -dy, -dz, time2, 1, 1);
  write(11, pos2, nx, ny, nz, time2, -1, -1);
}


/** Tracks tactical trail objects without requiring a graphics device. */
@type.define({ className: "EveTacticalTrails", family: "eve/ui" })
export class EveTacticalTrails extends withIEveSpaceObject2(withITr2Renderable(CjsModel))
{
  /** m_vertexDeclHandle - interned once, -1 (UNINITIALIZED) until it is. */
  #vertexDeclHandle = -1;

  /** m_vertexBuffer - the AL vertex buffer UpdateGraphicsState fills. */
  #vertexBuffer = null;

  /** m_egoBallPosition - the double-precision origin every trail position is
   *  rebased against (JS numbers are doubles, so Carbon's Vector3d needs no
   *  separate type). UpdateSyncronous samples it from egoBall; unported yet,
   *  so it stays at the origin until set. */
  #egoBallPosition = [ 0, 0, 0 ];


  @type.list("EveTacticalTrailTrackedObject")
  trackedObjects = [];

  /** m_segmentCount (uint32_t) [READ] */
  @io.read
  @type.uint32
  segments = 0;

  /** m_egoBall (ITriVectorFunctionPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITriVectorFunction")
  egoBall = null;

  /** m_trailEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Effect")
  trailEffect = null;

  /** m_fadeOutTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  fadeOutTime = 5;

  /**
   * Carbon ReleaseResources (EveTacticalTrails.cpp:73-76): drop the interned
   * declaration handle. The class allocates its vertex data lazily inside
   * UpdateGraphicsState, so this is the whole teardown.
   */
  @carbon.method
  @impl.implemented
  ReleaseResources(_storage)
  {
    this.#vertexDeclHandle = -1;
  }

  /**
   * Carbon UpdateGraphicsState (EveTacticalTrails.cpp:174-258): count the
   * frame's segments, intern the line declaration on first need, pack twelve
   * LineVertex records per segment - each tracked object's positions rebased
   * against the ego ball (double precision; JS numbers ARE doubles), fade as
   * (now - sample.time) / fadeOutTime, and the final segment's third point
   * extrapolated as pos2 + (pos2 - pos1) - then write them into the AL
   * vertex buffer, growing it to max(1024, 2x need) vertices when short. A
   * failed map zeroes the segment count, exactly as the donor does.
   *
   * Carbon reaches the main-thread context through a macro; the default
   * context stands in, overridable for a caller that owns one.
   *
   * @param {number} now Seconds, on the same clock as the samples' times.
   * @param {object} [renderContext] Defaults to Tr2RenderContext.GetDefault().
   */
  @carbon.method
  @impl.implemented
  UpdateGraphicsState(now, renderContext = Tr2RenderContext.GetDefault())
  {
    this.segments = this.trackedObjects.reduce(
      (sum, object) => sum + Math.max(object.positions?.length ?? 0, 1) - 1, 0);
    if (this.segments === 0) return;

    if (!renderContext?.IsValid())
    {
      this.segments = 0;
      return;
    }

    if (this.#vertexDeclHandle === -1)
    {
      this.#vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(TRAIL_VERTEX_DEFINITION);
    }

    const floats = new Float32Array(this.segments * SEGMENT_VERTEX_COUNT * LINE_VERTEX_FLOATS);
    let base = 0;
    const ego = this.#egoBallPosition;
    const toWorld = sample => [
      sample.position[0] - ego[0],
      sample.position[1] - ego[1],
      sample.position[2] - ego[2]
    ];

    for (const object of this.trackedObjects)
    {
      const positions = object.positions ?? [];
      if (positions.length < 2) continue;

      let pos1 = toWorld(positions[0]);
      let time1 = (now - positions[0].time) / this.fadeOutTime;
      let pos2 = toWorld(positions[1]);

      for (let i = 0; i + 1 < positions.length; i++)
      {
        const time2 = (now - positions[i + 1].time) / this.fadeOutTime;
        const posNext = i + 2 >= positions.length
          ? [ pos2[0] + (pos2[0] - pos1[0]), pos2[1] + (pos2[1] - pos1[1]), pos2[2] + (pos2[2] - pos1[2]) ]
          : toWorld(positions[i + 2]);
        WriteLineVerticesToBuffer(pos1, time1, pos2, time2, posNext, floats, base);
        base += SEGMENT_VERTEX_COUNT * LINE_VERTEX_FLOATS;
        pos1 = pos2;
        pos2 = posNext;
        time1 = time2;
      }
    }

    const needed = this.segments * SEGMENT_VERTEX_COUNT;
    if (!this.#vertexBuffer?.IsValid() || this.#vertexBuffer.GetDesc().count < needed)
    {
      const capacity = Math.max(1024, needed * 2);
      this.#vertexBuffer = renderContext.CreateBuffer(Tr2BufferDescriptionAL.FromStride(
        LINE_VERTEX_BYTES,
        capacity,
        Tr2GpuUsage.VERTEX_BUFFER,
        Tr2CpuUsage.WRITE_OFTEN
      ));
    }

    const mapping = this.#vertexBuffer?.MapForWriting(renderContext);
    if (mapping && !Failed(mapping.result) && mapping.data)
    {
      mapping.data.set(new Uint8Array(floats.buffer, 0, needed * LINE_VERTEX_BYTES));
      this.#vertexBuffer.UnmapForWriting(renderContext);
    }
    else
    {
      this.segments = 0;
    }
  }

  /** The trail vertex buffer UpdateGraphicsState filled, for the draw seam. */
  GetVertexBuffer()
  {
    return this.#vertexBuffer;
  }

  /** Carbon method RegisterObject (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Uses WeakRef when available to model Carbon's non-owning pointer and returns success for JavaScript callers.")
  RegisterObject(object)
  {
    if (!object) return false;
    const found = this.trackedObjects.some(entry => entry.ball?.deref?.() === object || entry.ball === object);
    if (found) return false;
    this.trackedObjects.push({ ball: typeof WeakRef === "function" ? new WeakRef(object) : object, positions: [] });
    return true;
  }

  /** Carbon method UnregisterObject (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Clears the non-owning JavaScript reference and returns success for JavaScript callers.")
  UnregisterObject(object)
  {
    const found = this.trackedObjects.find(entry => entry.ball?.deref?.() === object || entry.ball === object);
    if (!found) return false;
    found.ball = null;
    return true;
  }

  /** Carbon EveTacticalTrails::GetBatches submits its GPU-backed trail vertex buffer (cpp:299-317). */
  @carbon.method
  @impl.notImplemented
  GetBatches(_batches, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveTacticalTrails.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveTacticalTrails::HasTransparentBatches is always true (cpp:319-322). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Carbon EveTacticalTrails::GetSortValue is zero (cpp:324-327). */
  @carbon.method
  @impl.implemented
  GetSortValue()
  {
    return 0;
  }

  /** Carbon EveTacticalTrails::GetPerObjectData returns null (cpp:329-332). */
  @carbon.method
  @impl.implemented
  GetPerObjectData(_accumulator)
  {
    return null;
  }

}
