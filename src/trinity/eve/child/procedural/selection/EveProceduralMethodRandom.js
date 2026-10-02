import { IsMatch } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodRandom.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveProceduralSelectionMethod } from "./IEveProceduralSelectionMethod.js";
import { createMinStdRandom } from "../../../CjsDistributionRandom.js";

// Carbon BELIST_LOADING (blueexposure IList.h:50): list events raised while a
// persisted list hydrates carry this flag and must not regenerate the map.
const BELIST_LOADING = 0x10;

/** EveProceduralMethodRandom (eve/child/procedural/selection) - generated from schema shapeHash 9e2d2332.... */
@meta.define({ className: "EveProceduralMethodRandom", family: "eve/child/procedural/selection" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveProceduralMethodRandom extends IEveProceduralSelectionMethod
{

  _selectedChildModified = false;

  // Carbon m_parameterMapping: cumulative-weight thresholds, one per
  // parameter (runtime-only, rebuilt by GenerateParameterMapping).
  _parameterMapping = [];

  /** m_parameters (PEveProceduralMethodRandomParameterVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveProceduralMethodRandomParameter")
  parameters = [];

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveVolume")
  debugVolumes = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_totalWeight (int) [READ] */
  @meta.blue.read
  @meta.type.int32
  totalWeight = 0;

  /** m_seedName (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  seedName = "";

  /** m_selectedChildIndex (int) [READ] */
  @meta.blue.read
  @meta.type.int32
  selectedChild = -1;

  /** m_seed (float) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  seed_temp = -1;

  /** Carbon EveProceduralMethodRandom::Initialize (cpp:21-25). */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.GenerateParameterMapping();
    return true;
  }

  /** Carbon EveProceduralMethodRandom::OnModified (cpp:27-35): a seed change
   * reselects. The value argument follows the repo's OnModified duck. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Field matching follows the repo OnModified duck.")
  OnModified(value = null)
  {
    if (IsMatch(value, "seed_temp"))
    {
      this.SelectARandomParameter();
    }

    return true;
  }

  /** Carbon EveProceduralMethodRandom::OnListModified (cpp:37-43): a
   * non-loading change to the parameter list regenerates the weight map. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The list argument defaults to the parameters list.")
  OnListModified(event = 0, _key = 0, _key2 = 0, _value = null, list = null)
  {
    if ((list === null || list === this.parameters) && (event & BELIST_LOADING) === 0)
    {
      this.GenerateParameterMapping();
    }
  }

  /** Carbon EveProceduralMethodRandom::GenerateParameterMapping (cpp:45-55):
   * cumulative weight thresholds over the parameter list. */
  @meta.blue.method
  @meta.implemented
  GenerateParameterMapping()
  {
    this._parameterMapping.length = 0;
    this.totalWeight = 0;
    for (const param of this.parameters)
    {
      this.totalWeight += Number(param?.GetWeighting?.() ?? param?.weighting ?? 0) | 0;
      this._parameterMapping.push(this.totalWeight);
    }
  }

  /** Carbon EveProceduralMethodRandom::SelectARandomParameter (cpp:57-82):
   * seed the generator from m_seed, draw an integer inside the total weight,
   * and pick the first cumulative threshold above it. Carbon uses
   * srand((int)m_seed) + rand() % totalWeight; the port draws from the repo's
   * seeded minstd generator so a given seed stays deterministic. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("createMinStdRandom replaces the C runtime srand/rand pair - deterministic per seed like Carbon, though the exact integer sequence differs.")
  SelectARandomParameter()
  {
    if (this._parameterMapping.length === 0 || this.totalWeight <= 0)
    {
      return;
    }

    const currentChild = this.selectedChild;
    const random = createMinStdRandom(Math.trunc(this.seed_temp));
    const rnd = Math.min(Math.floor(random() * this.totalWeight), this.totalWeight - 1);

    this.selectedChild = -1;
    for (let index = 0; index < this._parameterMapping.length; index++)
    {
      if (rnd < this._parameterMapping[index])
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

  /** Carbon EveProceduralMethodRandom::IsSelectedChildModified (cpp:84-87). */
  @meta.blue.method
  @meta.implemented
  IsSelectedChildModified()
  {
    return this._selectedChildModified;
  }

  /** Carbon EveProceduralMethodRandom::GetSelectedChild (cpp:89-109):
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

  /** Carbon EveProceduralMethodRandom::UpdateAsyncronous (cpp:111-127):
   * regenerate the weight map and reselect once any parameter reports itself
   * modified, clearing the flags on the way. */
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext, _params)
  {
    let regenerateParameterMap = false;
    for (const param of this.parameters)
    {
      if (param?.IsModified?.())
      {
        regenerateParameterMap = true;
        param.SetModified(false);
      }
    }
    if (regenerateParameterMap)
    {
      this.GenerateParameterMapping();
      this.SelectARandomParameter();
    }
  }

  /** Carbon returns the owned volume vector by reference (cpp:129-132). */
  @meta.blue.method
  @meta.implemented
  GetDebugVolumes()
  {
    return this.debugVolumes;
  }

  /** Carbon EveProceduralMethodRandom::SetProceduralMethodVariable
   * (cpp:134-144): only the named seed variable is accepted; a changed value
   * reselects. */
  @meta.blue.method
  @meta.implemented
  SetProceduralMethodVariable(name, value)
  {
    if (String(name ?? "") === this.seedName)
    {
      const next = Number(value);
      if (this.seed_temp !== next)
      {
        this.seed_temp = next;
        this.SelectARandomParameter();
      }
    }
  }

  /** Carbon EveProceduralMethodRandom::GetProceduralMethodVariable
   * (cpp:146-154). */
  @meta.blue.method
  @meta.implemented
  GetProceduralMethodVariable()
  {
    if (this.seedName === "")
    {
      return "nameMissing";
    }

    return this.seedName;
  }

}
