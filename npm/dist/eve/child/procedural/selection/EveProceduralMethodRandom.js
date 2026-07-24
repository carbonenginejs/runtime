import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { createMinStdRandom } from '../../../CjsDistributionRandom.js';

let _initProto, _initClass, _init_parameters, _init_extra_parameters, _init_debugVolumes, _init_extra_debugVolumes, _init_name, _init_extra_name, _init_totalWeight, _init_extra_totalWeight, _init_seedName, _init_extra_seedName, _init_selectedChild, _init_extra_selectedChild, _init_seed_temp, _init_extra_seed_temp;

// Carbon BELIST_LOADING (blueexposure IList.h:50): list events raised while a
// persisted list hydrates carry this flag and must not regenerate the map.
const BELIST_LOADING = 0x10;

/** EveProceduralMethodRandom (eve/child/procedural/selection) - generated from schema shapeHash 9e2d2332.... */
let _EveProceduralMethodR;
class EveProceduralMethodRandom extends CjsModel {
  static {
    ({
      e: [_init_parameters, _init_extra_parameters, _init_debugVolumes, _init_extra_debugVolumes, _init_name, _init_extra_name, _init_totalWeight, _init_extra_totalWeight, _init_seedName, _init_extra_seedName, _init_selectedChild, _init_extra_selectedChild, _init_seed_temp, _init_extra_seed_temp, _initProto],
      c: [_EveProceduralMethodR, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProceduralMethodRandom",
      family: "eve/child/procedural/selection"
    })], [[[io, io.persist, void 0, type.list("EveProceduralMethodRandomParameter")], 16, "parameters"], [[io, io.persist, void 0, type.list("IEveVolume")], 16, "debugVolumes"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.int32], 16, "totalWeight"], [[io, io.persist, type, type.string], 16, "seedName"], [[io, io.read, type, type.int32], 16, "selectedChild"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "seed_temp"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Field matching follows the repo OnModified duck.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The list argument defaults to the parameters list.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GenerateParameterMapping"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("createMinStdRandom replaces the C runtime srand/rand pair - deterministic per seed like Carbon, though the exact integer sequence differs.")], 18, "SelectARandomParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsSelectedChildModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSelectedChild"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetProceduralMethodVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProceduralMethodVariable"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_seed_temp(this);
  }
  #selectedChildModified = (_initProto(this), false);

  // Carbon m_parameterMapping: cumulative-weight thresholds, one per
  // parameter (runtime-only, rebuilt by GenerateParameterMapping).
  #parameterMapping = [];

  /** m_parameters (PEveProceduralMethodRandomParameterVector) [READ, PERSIST] */
  parameters = _init_parameters(this, []);

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  debugVolumes = (_init_extra_parameters(this), _init_debugVolumes(this, []));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_debugVolumes(this), _init_name(this, ""));

  /** m_totalWeight (int) [READ] */
  totalWeight = (_init_extra_name(this), _init_totalWeight(this, 0));

  /** m_seedName (BlueSharedString) [READWRITE, PERSIST] */
  seedName = (_init_extra_totalWeight(this), _init_seedName(this, ""));

  /** m_selectedChildIndex (int) [READ] */
  selectedChild = (_init_extra_seedName(this), _init_selectedChild(this, -1));

  /** m_seed (float) [READWRITE, NOTIFY] */
  seed_temp = (_init_extra_selectedChild(this), _init_seed_temp(this, -1));

  /** Carbon EveProceduralMethodRandom::Initialize (cpp:21-25). */
  Initialize() {
    this.GenerateParameterMapping();
    return true;
  }

  /** Carbon EveProceduralMethodRandom::OnModified (cpp:27-35): a seed change
   * reselects. The value argument follows the repo's OnModified duck. */
  OnModified(value = null) {
    if (value === "seed_temp" || value === this.seed_temp) {
      this.SelectARandomParameter();
    }
    return true;
  }

  /** Carbon EveProceduralMethodRandom::OnListModified (cpp:37-43): a
   * non-loading change to the parameter list regenerates the weight map. */
  OnListModified(event = 0, _key = 0, _key2 = 0, _value = null, list = null) {
    if ((list === null || list === this.parameters) && (event & BELIST_LOADING) === 0) {
      this.GenerateParameterMapping();
    }
  }

  /** Carbon EveProceduralMethodRandom::GenerateParameterMapping (cpp:45-55):
   * cumulative weight thresholds over the parameter list. */
  GenerateParameterMapping() {
    this.#parameterMapping.length = 0;
    this.totalWeight = 0;
    for (const param of this.parameters) {
      this.totalWeight += Number(param?.GetWeighting?.() ?? param?.weighting ?? 0) | 0;
      this.#parameterMapping.push(this.totalWeight);
    }
  }

  /** Carbon EveProceduralMethodRandom::SelectARandomParameter (cpp:57-82):
   * seed the generator from m_seed, draw an integer inside the total weight,
   * and pick the first cumulative threshold above it. Carbon uses
   * srand((int)m_seed) + rand() % totalWeight; the port draws from the repo's
   * seeded minstd generator so a given seed stays deterministic. */
  SelectARandomParameter() {
    if (this.#parameterMapping.length === 0 || this.totalWeight <= 0) {
      return;
    }
    const currentChild = this.selectedChild;
    const random = createMinStdRandom(Math.trunc(this.seed_temp));
    const rnd = Math.min(Math.floor(random() * this.totalWeight), this.totalWeight - 1);
    this.selectedChild = -1;
    for (let index = 0; index < this.#parameterMapping.length; index++) {
      if (rnd < this.#parameterMapping[index]) {
        this.selectedChild = index;
        break;
      }
    }
    if (currentChild !== this.selectedChild) {
      this.#selectedChildModified = true;
    }
  }

  /** Carbon EveProceduralMethodRandom::IsSelectedChildModified (cpp:84-87). */
  IsSelectedChildModified() {
    return this.#selectedChildModified;
  }

  /** Carbon EveProceduralMethodRandom::GetSelectedChild (cpp:89-109):
   * bounds-check the index, clear the modified flag, then hand out the
   * parameter's child ref after loading it - only when it carries a res
   * path. */
  GetSelectedChild() {
    if (this.selectedChild < 0 || this.selectedChild > this.parameters.length - 1) {
      return null;
    }
    this.#selectedChildModified = false;
    const param = this.parameters[this.selectedChild];
    if (param) {
      const child = param.GetChild?.() ?? param.child;
      if (child && String(child.GetResPath?.() ?? child.resPath ?? "").length !== 0) {
        param.Load?.();
        return child;
      }
    }
    return null;
  }

  /** Carbon EveProceduralMethodRandom::UpdateAsyncronous (cpp:111-127):
   * regenerate the weight map and reselect once any parameter reports itself
   * modified, clearing the flags on the way. */
  UpdateAsyncronous(_updateContext, _params) {
    let regenerateParameterMap = false;
    for (const param of this.parameters) {
      if (param?.IsModified?.()) {
        regenerateParameterMap = true;
        param.SetModified(false);
      }
    }
    if (regenerateParameterMap) {
      this.GenerateParameterMapping();
      this.SelectARandomParameter();
    }
  }

  /** Carbon EveProceduralMethodRandom::SetProceduralMethodVariable
   * (cpp:134-144): only the named seed variable is accepted; a changed value
   * reselects. */
  SetProceduralMethodVariable(name, value) {
    if (String(name ?? "") === this.seedName) {
      const next = Number(value);
      if (this.seed_temp !== next) {
        this.seed_temp = next;
        this.SelectARandomParameter();
      }
    }
  }

  /** Carbon EveProceduralMethodRandom::GetProceduralMethodVariable
   * (cpp:146-154). */
  GetProceduralMethodVariable() {
    if (this.seedName === "") {
      return "nameMissing";
    }
    return this.seedName;
  }
  static {
    _initClass();
  }
}

export { _EveProceduralMethodR as EveProceduralMethodRandom };
//# sourceMappingURL=EveProceduralMethodRandom.js.map
