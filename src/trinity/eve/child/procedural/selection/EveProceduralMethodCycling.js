import { INotify } from "../../../../../global/blue/INotify.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodCycling.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { CjsSchema, meta } from "#schema";
import { EveProceduralMethodCyclingParameter } from "./EveProceduralMethodCyclingParameter.js";
import { blue, TimeAsDouble } from "#blue";
import { IEveProceduralSelectionMethod } from "./IEveProceduralSelectionMethod.js";

// Carbon BELIST_LOADING (blueexposure IList.h:50): list events raised while a
// persisted list hydrates carry this flag and must not trigger reselection.
const BELIST_LOADING = 0x10;

/** EveProceduralMethodCycling (eve/child/procedural/selection) - generated from schema shapeHash 2014815d.... */
@meta.define({ className: "EveProceduralMethodCycling", family: "eve/child/procedural/selection" })
@meta.blue.inherit(INotify)
export class EveProceduralMethodCycling extends IEveProceduralSelectionMethod
{

  _selectedChildModified = false;

  // Carbon m_startTime is Be::Time; this JS cursor is seconds, stamped by restart from the caller-supplied
  // clock (frame time when the update loop reselects, wall clock for the
  // Date.now default); UpdateAsyncronous must feed the same clock.
  _startTime = 0;

  /** m_parameters (PEveProceduralMethodCyclingParameterVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveProceduralMethodCyclingParameter")
  parameters = [];

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveVolume")
  debugVolumes = [];

  /** m_startTimeOffset (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  startTimeOffset = 0;

  /** m_randomizeOrder (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  randomizeOrder = false;

  /** m_selectedChildIndex (int) [READ] */
  @meta.blue.read
  @meta.type.int32
  selectedChild = -1;

  /** Carbon method restart -> SelectParameter (MAP_METHOD_AND_WRAP,
   * cpp:36-60): randomized order picks any OTHER index (the shifted draw);
   * otherwise a plain cycle. Math.random replaces Carbon's unseeded rand().
   *
   * Adapted: An optional timestamp provides Carbon's current-frame clock
   * deterministically in browser tests.
   */
  @meta.blue.method
  @meta.adapted
  restart(timestamp = TimeAsDouble(blue.os.GetCurrentFrameTime()))
  {
    const count = this.parameters.length;
    if (count === 0)
    {
      return false;
    }

    if (this.randomizeOrder && count > 2)
    {
      const previous = this.selectedChild;
      this.selectedChild = Math.floor(Math.random() * (count - 1));
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  IsSelectedChildModified()
  {
    return this._selectedChildModified;
  }

  /** Carbon EveProceduralMethodCycling::GetSelectedChild (cpp:67-87):
   * bounds-check the index, clear the modified flag, then hand out the
   * parameter's child ref after loading it - only when it carries a res
   * path. */
  @meta.blue.method
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
  @meta.blue.method
  @meta.adapted
  UpdateAsyncronous(_updateContext, _params)
  {
    const now = TimeAsDouble(blue.os.GetCurrentFrameTime());

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
  @meta.blue.method
  @meta.implemented
  GetDebugVolumes()
  {
    return this.debugVolumes;
  }

}

// Exact native Blue exposure: only these identities participate in loading.
meta.blue.interfaceTable({ interfaces: [EveProceduralMethodCycling, IEveProceduralSelectionMethod, INotify], chainTo: null })(EveProceduralMethodCycling, { kind: "class" });
