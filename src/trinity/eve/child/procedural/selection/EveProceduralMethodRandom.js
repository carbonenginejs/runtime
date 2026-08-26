// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodRandom.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { IEveProceduralSelectionMethod } from "./IEveProceduralSelectionMethod.js";
import { createMinStdRandom } from "../../../CjsDistributionRandom.js";

// Carbon BELIST_LOADING (blueexposure IList.h:50): list events raised while a
// persisted list hydrates carry this flag and must not regenerate the map.
const BELIST_LOADING = 0x10;

/** EveProceduralMethodRandom (eve/child/procedural/selection) - generated from schema shapeHash 9e2d2332.... */
@type.define({ className: "EveProceduralMethodRandom", family: "eve/child/procedural/selection" })
export class EveProceduralMethodRandom extends IEveProceduralSelectionMethod
{

  #selectedChildModified = false;

  // Carbon m_parameterMapping: cumulative-weight thresholds, one per
  // parameter (runtime-only, rebuilt by GenerateParameterMapping).
  #parameterMapping = [];

  /** m_parameters (PEveProceduralMethodRandomParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveProceduralMethodRandomParameter")
  parameters = [];

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveVolume")
  debugVolumes = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_totalWeight (int) [READ] */
  @io.read
  @type.int32
  totalWeight = 0;

  /** m_seedName (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  seedName = "";

  /** m_selectedChildIndex (int) [READ] */
  @io.read
  @type.int32
  selectedChild = -1;

  /** m_seed (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  seed_temp = -1;

  /** Carbon EveProceduralMethodRandom::Initialize (cpp:21-25). */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.GenerateParameterMapping();
    return true;
  }

  /** Carbon EveProceduralMethodRandom::OnModified (cpp:27-35): a seed change
   * reselects. The value argument follows the repo's OnModified duck. */
  @carbon.method
  @impl.adapted
  @impl.reason("Field matching follows the repo OnModified duck.")
  OnModified(value = null)
  {
    if (value === "seed_temp" || value === this.seed_temp)
    {
      this.SelectARandomParameter();
    }

    return true;
  }

  /** Carbon EveProceduralMethodRandom::OnListModified (cpp:37-43): a
   * non-loading change to the parameter list regenerates the weight map. */
  @carbon.method
  @impl.adapted
  @impl.reason("The list argument defaults to the parameters list.")
  OnListModified(event = 0, _key = 0, _key2 = 0, _value = null, list = null)
  {
    if ((list === null || list === this.parameters) && (event & BELIST_LOADING) === 0)
    {
      this.GenerateParameterMapping();
    }
  }

  /** Carbon EveProceduralMethodRandom::GenerateParameterMapping (cpp:45-55):
   * cumulative weight thresholds over the parameter list. */
  @carbon.method
  @impl.implemented
  GenerateParameterMapping()
  {
    this.#parameterMapping.length = 0;
    this.totalWeight = 0;
    for (const param of this.parameters)
    {
      this.totalWeight += Number(param?.GetWeighting?.() ?? param?.weighting ?? 0) | 0;
      this.#parameterMapping.push(this.totalWeight);
    }
  }

  /** Carbon EveProceduralMethodRandom::SelectARandomParameter (cpp:57-82):
   * seed the generator from m_seed, draw an integer inside the total weight,
   * and pick the first cumulative threshold above it. Carbon uses
   * srand((int)m_seed) + rand() % totalWeight; the port draws from the repo's
   * seeded minstd generator so a given seed stays deterministic. */
  @carbon.method
  @impl.adapted
  @impl.reason("createMinStdRandom replaces the C runtime srand/rand pair - deterministic per seed like Carbon, though the exact integer sequence differs.")
  SelectARandomParameter()
  {
    if (this.#parameterMapping.length === 0 || this.totalWeight <= 0)
    {
      return;
    }

    const currentChild = this.selectedChild;
    const random = createMinStdRandom(Math.trunc(this.seed_temp));
    const rnd = Math.min(Math.floor(random() * this.totalWeight), this.totalWeight - 1);

    this.selectedChild = -1;
    for (let index = 0; index < this.#parameterMapping.length; index++)
    {
      if (rnd < this.#parameterMapping[index])
      {
        this.selectedChild = index;
        break;
      }
    }

    if (currentChild !== this.selectedChild)
    {
      this.#selectedChildModified = true;
    }
  }

  /** Carbon EveProceduralMethodRandom::IsSelectedChildModified (cpp:84-87). */
  @carbon.method
  @impl.implemented
  IsSelectedChildModified()
  {
    return this.#selectedChildModified;
  }

  /** Carbon EveProceduralMethodRandom::GetSelectedChild (cpp:89-109):
   * bounds-check the index, clear the modified flag, then hand out the
   * parameter's child ref after loading it - only when it carries a res
   * path. */
  @carbon.method
  @impl.implemented
  GetSelectedChild()
  {
    if (this.selectedChild < 0 || this.selectedChild > this.parameters.length - 1)
    {
      return null;
    }

    this.#selectedChildModified = false;
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetDebugVolumes()
  {
    return this.debugVolumes;
  }

  /** Carbon EveProceduralMethodRandom::SetProceduralMethodVariable
   * (cpp:134-144): only the named seed variable is accepted; a changed value
   * reselects. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetProceduralMethodVariable()
  {
    if (this.seedName === "")
    {
      return "nameMissing";
    }

    return this.seedName;
  }

}
