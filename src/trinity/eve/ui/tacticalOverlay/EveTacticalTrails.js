// Source: trinity/trinity/Eve/UI/EveTacticalTrails.h
// Source: trinity/trinity/Eve/UI/EveTacticalTrails.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** Tracks tactical trail objects without requiring a graphics device. */
@type.define({ className: "EveTacticalTrails", family: "eve/ui" })
export class EveTacticalTrails extends CjsModel
{

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
