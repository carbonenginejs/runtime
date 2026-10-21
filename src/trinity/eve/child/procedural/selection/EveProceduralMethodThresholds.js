import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodThresholds.h
import { IsMatch, INotify, IListNotify } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { CjsSchema, meta, type, blue } from "#schema";
import { IEveProceduralSelectionMethod } from "./IEveProceduralSelectionMethod.js";
import { EveProceduralMethodThresholdParameter } from "./EveProceduralMethodThresholdParameter.js";

// Carbon BELIST_LOADING (blueexposure IList.h:50): list events raised while a
// persisted list hydrates carry this flag and must not trigger a re-sort.
const BELIST_LOADING = 0x10;

/** EveProceduralMethodThresholds (eve/child/procedural/selection) - generated from schema shapeHash 794abb42.... */
@be.define("EveProceduralMethodThresholds")
@blue.inherit(INotify, IListNotify, IInitialize)
@be.mapInterface(IEveProceduralSelectionMethod)
@be.mapInterface(INotify)
@be.mapInterface(IListNotify)
@be.mapInterface(IInitialize)
export class EveProceduralMethodThresholds extends IEveProceduralSelectionMethod
{

  _selectedChildModified = false;

  /** m_parameters (PEveProceduralMethodThresholdParameterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveProceduralMethodThresholdParameter")
  parameters = [];

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveVolume")
  debugVolumes = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_thresholdAttribute (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  thresholdAttribute = "";

  /** m_selectedChildIndex (int) [READ] */
  @be.mapAttribute(be.READ)
  @type.int32
  selectedChild = -1;

  /** m_seed (float) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  seed_temp = -1;

  /** Carbon EveProceduralMethodThresholds::Initialize (cpp:20-24). */

  @meta.implemented
  Initialize()
  {
    this.SortParameters();
    return true;
  }

  /** Carbon EveProceduralMethodThresholds::OnModified (cpp:26-34): a seed
   * change reselects. */

  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "seed_temp"))
    {
      this.SelectParameter();
    }

    return true;
  }

  /** Carbon EveProceduralMethodThresholds::OnListModified (cpp:36-42): a
   * non-loading change to the parameter list re-sorts. */

  @meta.implemented
  OnListModified(event, _key, _key2, _value, list)
  {
    if (list === this.parameters && (event & BELIST_LOADING) === 0)
    {
      this.SortParameters();
    }
  }

  /** Carbon EveProceduralMethodThresholds::SelectParameter (cpp:44-63): the
   * first threshold at or above the seed wins (the list is sorted ascending);
   * a changed index flags the selected child as modified. Carbon leaves the
   * index untouched when the seed exceeds every threshold. */

  @meta.implemented
  SelectParameter()
  {
    const currentChild = this.selectedChild;

    for (let index = 0; index < this.parameters.length; index++)
    {
      if (this.seed_temp <= this.parameters[index].GetThreshold())
      {
        this.selectedChild = index;
        break;
      }
    }

    if (currentChild !== this.selectedChild)
    {
      this._selectedChildModified = true;
    }
  }

  /** Carbon EveProceduralMethodThresholds::SortParameters (cpp:74-82):
   * ascending threshold sort (JS Array.sort is stable, matching std::sort's
   * observable order for distinct thresholds). */

  @meta.implemented
  SortParameters()
  {
    if (this.parameters.length < 2)
    {
      return;
    }

    this.parameters.sort(EveProceduralMethodThresholds._SelectiveParameterCompare);
  }

  /** Carbon EveProceduralMethodThresholds::IsSelectedChildModified
   * (cpp:84-87). */

  @meta.implemented
  IsSelectedChildModified()
  {
    return this._selectedChildModified;
  }

  /** Carbon EveProceduralMethodThresholds::GetSelectedChild (cpp:89-109):
   * bounds-check the index, clear the modified flag, then hand out the
   * parameter's child ref after loading it - only when it carries a res
   * path. */

  @meta.implemented
  GetSelectedChild()
  {
    if (this.selectedChild < 0 || this.selectedChild > this.parameters.length - 1)
    {
      return null;
    }

    this._selectedChildModified = false;
    const param = CjsSchema.cast(this.parameters[this.selectedChild], EveProceduralMethodThresholdParameter);

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

  /** Carbon EveProceduralMethodThresholds::UpdateAsyncronous (cpp:111-127):
   * re-sort and reselect once any parameter reports itself modified, clearing
   * the flags on the way. */

  @meta.implemented
  UpdateAsyncronous(_updateContext, _params)
  {
    let reselect = false;
    for (const param of this.parameters)
    {
      if (param.IsModified())
      {
        reselect = true;
        param.SetModified(false);
      }
    }
    if (reselect)
    {
      this.SortParameters();
      this.SelectParameter();
    }
  }

  /** Carbon returns the owned volume vector by reference (cpp:129-132). */

  @meta.implemented
  GetDebugVolumes()
  {
    return this.debugVolumes;
  }

  /** Carbon EveProceduralMethodThresholds::SetProceduralMethodVariable
   * (cpp:134-144): only the named threshold attribute is accepted; a changed
   * value reselects. */

  @meta.implemented
  SetProceduralMethodVariable(name, value)
  {
    if (String(name ?? "") === this.thresholdAttribute)
    {
      const next = Number(value);
      if (this.seed_temp !== next)
      {
        this.seed_temp = next;
        this.SelectParameter();
      }
    }
  }

  /**
   * Carbon SelectiveParameterCompare (cpp:66-72): ascending threshold order.
   *
   * Adapted: Carbon's functor is a strict less-than for std::sort; Array.sort takes the difference.
   */
  static _SelectiveParameterCompare(param1, param2)
  {
    return param1.GetThreshold() - param2.GetThreshold();
  }

}
