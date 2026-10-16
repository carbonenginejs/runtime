import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodCycling.h
import { INotify } from "../../../../../global/blue/INotify.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { CjsSchema, meta, type, blue } from "#schema";
import { EveProceduralMethodCyclingParameter } from "./EveProceduralMethodCyclingParameter.js";
import { be, CcpTime } from "#blue";
import { IEveProceduralSelectionMethod } from "./IEveProceduralSelectionMethod.js";

// Carbon BELIST_LOADING (blueexposure IList.h:50): list events raised while a
// persisted list hydrates carry this flag and must not trigger reselection.
const BELIST_LOADING = 0x10;

/** EveProceduralMethodCycling (eve/child/procedural/selection) - generated from schema shapeHash 2014815d.... */
@blue.define("EveProceduralMethodCycling")
@blue.inherit(INotify)
@blue.interface(IEveProceduralSelectionMethod, INotify)
export class EveProceduralMethodCycling extends IEveProceduralSelectionMethod
{

  _selectedChildModified = false;

  // Carbon m_startTime is Be::Time; this JS cursor is seconds, stamped by restart from the caller-supplied
  // clock (frame time when the update loop reselects, wall clock for the
  // Date.now default); UpdateAsyncronous must feed the same clock.
  _startTime = 0;

  /** m_parameters (PEveProceduralMethodCyclingParameterVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveProceduralMethodCyclingParameter")
  parameters = [];

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveVolume")
  debugVolumes = [];

  /** m_startTimeOffset (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  startTimeOffset = 0;

  /** m_randomizeOrder (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  randomizeOrder = false;

  /** m_selectedChildIndex (int) [READ] */
  @blue.read
  @type.int32
  selectedChild = -1;

  /** Carbon method restart -> SelectParameter (MAP_METHOD_AND_WRAP,
   * cpp:36-60): randomized order picks any OTHER index (the shifted draw);
   * Random draws delegate to the matching generator in global/math/random.js.
   *
   * Adapted: An optional timestamp provides Carbon's current-frame clock
   * deterministically in browser tests.
   */
  @blue.method
  @meta.adapted
  restart(timestamp = CcpTime.timeAsDouble(be.os.GetCurrentFrameTime()))
  {
    const count = this.parameters.length;
    if (count === 0)
    {
      return false;
    }

    if (this.randomizeOrder && count > 2)
    {
      const previous = this.selectedChild;
      this.selectedChild = (carbonRandom.crtRand() % ((count - 1)));
      if (this.selectedChild >= previous)
      {
        this.selectedChild++;
      }
    }
    else
    {
      this.selectedChild = (this.selectedChild + 1) % count;
    }

    this._startTime = timestamp - this.startTimeOffset;
    this._selectedChildModified = true;
    return true;
  }

  /** Carbon EveProceduralMethodCycling::OnModified (cpp:23-26) is an
   * intentional no-op notify. */
  @blue.method
  @meta.implemented
  OnModified(_value = null)
  {
    return true;
  }

  /** Carbon EveProceduralMethodCycling::OnListModified (cpp:28-34): a
   * non-loading change to the parameter list reselects.
   *
   * Adapted: The list argument defaults to the parameters list; the reselect
   * uses restart's default wall clock (no frame context reaches list
   * notifies).
   */
  @blue.method
  @meta.adapted
  OnListModified(event = 0, _key = 0, _key2 = 0, _value = null, list = null)
  {
    if ((list === null || list === this.parameters) && (event & BELIST_LOADING) === 0)
    {
      this.restart();
    }
  }

  /** Carbon EveProceduralMethodCycling::IsSelectedChildModified
   * (cpp:62-65). */
  @blue.method
  @meta.implemented
  IsSelectedChildModified()
  {
    return this._selectedChildModified;
  }

  /** Carbon EveProceduralMethodCycling::GetSelectedChild (cpp:67-87):
   * bounds-check the index, clear the modified flag, then hand out the
   * parameter's child ref after loading it - only when it carries a res
   * path. */
  @blue.method
  @meta.implemented
  GetSelectedChild()
  {
    if (this.selectedChild < 0 || this.selectedChild > this.parameters.length - 1)
    {
      return null;
    }

    this._selectedChildModified = false;
    const param = CjsSchema.cast(this.parameters[this.selectedChild], EveProceduralMethodCyclingParameter);

    if (param)
    {
      const child = param.GetChild();
      if (child && child.GetResPath().length !== 0)
      {
        param.Load();
        return child;
      }
    }
    return null;
  }

  /** Carbon EveProceduralMethodCycling::UpdateAsyncronous (cpp:89-106):
   * reselect when no valid index exists or the current parameter's play
   * duration has elapsed on the frame clock, BeOS->GetCurrentFrameTime() (cpp:100).
   * Adapted: the JS restart cursor, offset and durations use seconds, so the
   * frame time is converted once here (native cpp:57,101 converts offset/delta). */
  @blue.method
  @meta.adapted
  UpdateAsyncronous(_updateContext, _params)
  {
    const now = CcpTime.timeAsDouble(be.os.GetCurrentFrameTime());

    if (this.selectedChild < 0 || this.selectedChild > this.parameters.length - 1)
    {
      this.restart(now);
      return;
    }

    const param = CjsSchema.cast(this.parameters[this.selectedChild], EveProceduralMethodCyclingParameter);
    if (param)
    {
      const elapsed = now - this._startTime;
      if (elapsed >= param.GetDuration())
      {
        this.restart(now);
      }
    }
  }

  /** Carbon returns the owned volume vector by reference (cpp:108-111). */
  @blue.method
  @meta.implemented
  GetDebugVolumes()
  {
    return this.debugVolumes;
  }

}

// Exact native Blue exposure: only these identities participate in loading.
