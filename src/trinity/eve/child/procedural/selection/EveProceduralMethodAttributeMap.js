import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodAttributeMap.h
import { IsMatch } from "#blue";
import { INotify } from "../../../../../global/blue/INotify.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { CjsSchema, meta, type, blue } from "#schema";
import { EveProceduralMethodAttributeMapParameter } from "./EveProceduralMethodAttributeMapParameter.js";
import { IEveProceduralSelectionMethod } from "./IEveProceduralSelectionMethod.js";

/** EveProceduralMethodAttributeMap (eve/child/procedural/selection) - generated from schema shapeHash 691cb5f9.... */
@be.define("EveProceduralMethodAttributeMap")
@blue.inherit(INotify)
@be.mapInterface(IEveProceduralSelectionMethod)
@be.mapInterface(INotify)
export class EveProceduralMethodAttributeMap extends IEveProceduralSelectionMethod
{

  _selectedChildModified = false;

  /** m_parameters (PEveProceduralMethodAttributeMapParameterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveProceduralMethodAttributeMapParameter")
  parameters = [];

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveVolume")
  debugVolumes = [];

  /** m_mappedAttribute (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  thresholdAttribute = "";

  /** m_selectedChildIndex (int) [READ] */
  @be.mapAttribute(be.READ)
  @type.int32
  selectedChild = -1;

  /** m_seed (BlueSharedString) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.string
  seed_temp = "";

  /** Carbon EveProceduralMethodAttributeMap::OnModified (cpp:19-27): a seed
   * change reselects. The value argument follows the repo's OnModified duck
   * (field name or field value).
   */
  @blue.method
  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "seed_temp"))
    {
      this.SelectParameter();
    }

    return true;
  }

  /** Carbon EveProceduralMethodAttributeMap::SelectParameter (cpp:29-47): the
   * first parameter whose name equals the seed string wins; a changed index
   * flags the selected child as modified. Carbon leaves the index untouched
   * when no name matches. */
  @blue.method
  @meta.implemented
  SelectParameter()
  {
    const currentChild = this.selectedChild;
    for (let index = 0; index < this.parameters.length; index++)
    {
      const param = this.parameters[index];
      if (param.GetName() === this.seed_temp)
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

  /** Carbon EveProceduralMethodAttributeMap::IsSelectedChildModified
   * (cpp:49-52). */
  @blue.method
  @meta.implemented
  IsSelectedChildModified()
  {
    return this._selectedChildModified;
  }

  /** Carbon EveProceduralMethodAttributeMap::GetSelectedChild (cpp:54-74):
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
    const param = CjsSchema.cast(this.parameters[this.selectedChild], EveProceduralMethodAttributeMapParameter);

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

  /** Carbon EveProceduralMethodAttributeMap::UpdateAsyncronous (cpp:76-91):
   * reselect once any parameter reports itself modified, clearing the flags
   * on the way. */
  @blue.method
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
      this.SelectParameter();
    }
  }

  /** Carbon returns the owned volume vector by reference (cpp:93-96). */
  @blue.method
  @meta.implemented
  GetDebugVolumes()
  {
    return this.debugVolumes;
  }

}

// Exact native Blue exposure: only these identities participate in loading.
