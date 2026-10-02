import { IsMatch } from "#blue";
import { INotify } from "../../../../../global/blue/INotify.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodAttributeMap.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveProceduralSelectionMethod } from "./IEveProceduralSelectionMethod.js";

/** EveProceduralMethodAttributeMap (eve/child/procedural/selection) - generated from schema shapeHash 691cb5f9.... */
@meta.define({ className: "EveProceduralMethodAttributeMap", family: "eve/child/procedural/selection" })
@meta.blue.inherit(INotify)
export class EveProceduralMethodAttributeMap extends IEveProceduralSelectionMethod
{

  _selectedChildModified = false;

  /** m_parameters (PEveProceduralMethodAttributeMapParameterVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveProceduralMethodAttributeMapParameter")
  parameters = [];

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveVolume")
  debugVolumes = [];

  /** m_mappedAttribute (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  thresholdAttribute = "";

  /** m_selectedChildIndex (int) [READ] */
  @meta.blue.read
  @meta.type.int32
  selectedChild = -1;

  /** m_seed (BlueSharedString) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.string
  seed_temp = "";

  /** Carbon EveProceduralMethodAttributeMap::OnModified (cpp:19-27): a seed
   * change reselects. The value argument follows the repo's OnModified duck
   * (field name or field value). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Field matching follows the repo OnModified duck.")
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
  @meta.blue.method
  @meta.implemented
  SelectParameter()
  {
    const currentChild = this.selectedChild;
    for (let index = 0; index < this.parameters.length; index++)
    {
      const param = this.parameters[index];
      if ((param?.GetName?.() ?? param?.name ?? "") === this.seed_temp)
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
  @meta.blue.method
  @meta.implemented
  IsSelectedChildModified()
  {
    return this._selectedChildModified;
  }

  /** Carbon EveProceduralMethodAttributeMap::GetSelectedChild (cpp:54-74):
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
    const param = this.parameters[this.selectedChild];

    if (param)
    {
      const child = param.GetChild?.() ?? param.child;
      if (child && String(child.GetResPath?.() ?? child.resPath ?? "").length !== 0)
      {
        param.Load?.();
        return child;
      }
    }
    return null;
  }

  /** Carbon EveProceduralMethodAttributeMap::UpdateAsyncronous (cpp:76-91):
   * reselect once any parameter reports itself modified, clearing the flags
   * on the way. */
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext, _params)
  {
    let reselect = false;
    for (const param of this.parameters)
    {
      if (param?.IsModified?.())
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
  @meta.blue.method
  @meta.implemented
  GetDebugVolumes()
  {
    return this.debugVolumes;
  }

}

// Exact native Blue exposure: only these identities participate in loading.
meta.blue.interfaceTable({ interfaces: [EveProceduralMethodAttributeMap, IEveProceduralSelectionMethod, INotify], chainTo: null })(EveProceduralMethodAttributeMap, { kind: "class" });
