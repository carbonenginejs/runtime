import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_parameters, _init_extra_parameters, _init_debugVolumes, _init_extra_debugVolumes, _init_name, _init_extra_name, _init_thresholdAttribute, _init_extra_thresholdAttribute, _init_selectedChild, _init_extra_selectedChild, _init_seed_temp, _init_extra_seed_temp;

// Carbon BELIST_LOADING (blueexposure IList.h:50): list events raised while a
// persisted list hydrates carry this flag and must not trigger a re-sort.
const BELIST_LOADING = 0x10;

// Carbon SelectiveParameterCompare (cpp:66-72): ascending threshold order.
function SelectiveParameterCompare(param1, param2) {
  return Number(param1?.GetThreshold?.() ?? param1?.threshold ?? 0) - Number(param2?.GetThreshold?.() ?? param2?.threshold ?? 0);
}

/** EveProceduralMethodThresholds (eve/child/procedural/selection) - generated from schema shapeHash 794abb42.... */
let _EveProceduralMethodT;
class EveProceduralMethodThresholds extends CjsModel {
  static {
    ({
      e: [_init_parameters, _init_extra_parameters, _init_debugVolumes, _init_extra_debugVolumes, _init_name, _init_extra_name, _init_thresholdAttribute, _init_extra_thresholdAttribute, _init_selectedChild, _init_extra_selectedChild, _init_seed_temp, _init_extra_seed_temp, _initProto],
      c: [_EveProceduralMethodT, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProceduralMethodThresholds",
      family: "eve/child/procedural/selection"
    })], [[[io, io.persist, void 0, type.list("EveProceduralMethodThresholdParameter")], 16, "parameters"], [[io, io.persist, void 0, type.list("IEveVolume")], 16, "debugVolumes"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "thresholdAttribute"], [[io, io.read, type, type.int32], 16, "selectedChild"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "seed_temp"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Field matching follows the repo OnModified duck.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The list argument defaults to the parameters list.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SelectParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "SortParameters"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsSelectedChildModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSelectedChild"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetProceduralMethodVariable"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_seed_temp(this);
  }
  #selectedChildModified = (_initProto(this), false);

  /** m_parameters (PEveProceduralMethodThresholdParameterVector) [READ, PERSIST] */
  parameters = _init_parameters(this, []);

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  debugVolumes = (_init_extra_parameters(this), _init_debugVolumes(this, []));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_debugVolumes(this), _init_name(this, ""));

  /** m_thresholdAttribute (BlueSharedString) [READWRITE, PERSIST] */
  thresholdAttribute = (_init_extra_name(this), _init_thresholdAttribute(this, ""));

  /** m_selectedChildIndex (int) [READ] */
  selectedChild = (_init_extra_thresholdAttribute(this), _init_selectedChild(this, -1));

  /** m_seed (float) [READWRITE, NOTIFY] */
  seed_temp = (_init_extra_selectedChild(this), _init_seed_temp(this, -1));

  /** Carbon EveProceduralMethodThresholds::Initialize (cpp:20-24). */
  Initialize() {
    this.SortParameters();
    return true;
  }

  /** Carbon EveProceduralMethodThresholds::OnModified (cpp:26-34): a seed
   * change reselects. The value argument follows the repo's OnModified
   * duck. */
  OnModified(value = null) {
    if (value === "seed_temp" || value === this.seed_temp) {
      this.SelectParameter();
    }
    return true;
  }

  /** Carbon EveProceduralMethodThresholds::OnListModified (cpp:36-42): a
   * non-loading change to the parameter list re-sorts. */
  OnListModified(event = 0, _key = 0, _key2 = 0, _value = null, list = null) {
    if ((list === null || list === this.parameters) && (event & BELIST_LOADING) === 0) {
      this.SortParameters();
    }
  }

  /** Carbon EveProceduralMethodThresholds::SelectParameter (cpp:44-63): the
   * first threshold at or above the seed wins (the list is sorted ascending);
   * a changed index flags the selected child as modified. Carbon leaves the
   * index untouched when the seed exceeds every threshold. */
  SelectParameter() {
    const currentChild = this.selectedChild;
    for (let index = 0; index < this.parameters.length; index++) {
      const param = this.parameters[index];
      if (this.seed_temp <= Number(param?.GetThreshold?.() ?? param?.threshold ?? 0)) {
        this.selectedChild = index;
        break;
      }
    }
    if (currentChild !== this.selectedChild) {
      this.#selectedChildModified = true;
    }
  }

  /** Carbon EveProceduralMethodThresholds::SortParameters (cpp:74-82):
   * ascending threshold sort (JS Array.sort is stable, matching std::sort's
   * observable order for distinct thresholds). */
  SortParameters() {
    if (this.parameters.length < 2) {
      return;
    }
    this.parameters.sort(SelectiveParameterCompare);
  }

  /** Carbon EveProceduralMethodThresholds::IsSelectedChildModified
   * (cpp:84-87). */
  IsSelectedChildModified() {
    return this.#selectedChildModified;
  }

  /** Carbon EveProceduralMethodThresholds::GetSelectedChild (cpp:89-109):
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

  /** Carbon EveProceduralMethodThresholds::UpdateAsyncronous (cpp:111-127):
   * re-sort and reselect once any parameter reports itself modified, clearing
   * the flags on the way. */
  UpdateAsyncronous(_updateContext, _params) {
    let reselect = false;
    for (const param of this.parameters) {
      if (param?.IsModified?.()) {
        reselect = true;
        param.SetModified(false);
      }
    }
    if (reselect) {
      this.SortParameters();
      this.SelectParameter();
    }
  }

  /** Carbon EveProceduralMethodThresholds::SetProceduralMethodVariable
   * (cpp:134-144): only the named threshold attribute is accepted; a changed
   * value reselects. */
  SetProceduralMethodVariable(name, value) {
    if (String(name ?? "") === this.thresholdAttribute) {
      const next = Number(value);
      if (this.seed_temp !== next) {
        this.seed_temp = next;
        this.SelectParameter();
      }
    }
  }
  static {
    _initClass();
  }
}

export { _EveProceduralMethodT as EveProceduralMethodThresholds };
//# sourceMappingURL=EveProceduralMethodThresholds.js.map
