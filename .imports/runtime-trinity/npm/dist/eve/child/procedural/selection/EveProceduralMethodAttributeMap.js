import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_parameters, _init_extra_parameters, _init_debugVolumes, _init_extra_debugVolumes, _init_thresholdAttribute, _init_extra_thresholdAttribute, _init_selectedChild, _init_extra_selectedChild, _init_seed_temp, _init_extra_seed_temp;

/** EveProceduralMethodAttributeMap (eve/child/procedural/selection) - generated from schema shapeHash 691cb5f9.... */
let _EveProceduralMethodA;
class EveProceduralMethodAttributeMap extends CjsModel {
  static {
    ({
      e: [_init_parameters, _init_extra_parameters, _init_debugVolumes, _init_extra_debugVolumes, _init_thresholdAttribute, _init_extra_thresholdAttribute, _init_selectedChild, _init_extra_selectedChild, _init_seed_temp, _init_extra_seed_temp, _initProto],
      c: [_EveProceduralMethodA, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProceduralMethodAttributeMap",
      family: "eve/child/procedural/selection"
    })], [[[io, io.persist, void 0, type.list("EveProceduralMethodAttributeMapParameter")], 16, "parameters"], [[io, io.persist, void 0, type.list("IEveVolume")], 16, "debugVolumes"], [[io, io.persist, type, type.string], 16, "thresholdAttribute"], [[io, io.read, type, type.int32], 16, "selectedChild"], [[io, io.notify, io, io.readwrite, type, type.string], 16, "seed_temp"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Field matching follows the repo OnModified duck.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SelectParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsSelectedChildModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSelectedChild"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_seed_temp(this);
  }
  #selectedChildModified = (_initProto(this), false);

  /** m_parameters (PEveProceduralMethodAttributeMapParameterVector) [READ, PERSIST] */
  parameters = _init_parameters(this, []);

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  debugVolumes = (_init_extra_parameters(this), _init_debugVolumes(this, []));

  /** m_mappedAttribute (BlueSharedString) [READWRITE, PERSIST] */
  thresholdAttribute = (_init_extra_debugVolumes(this), _init_thresholdAttribute(this, ""));

  /** m_selectedChildIndex (int) [READ] */
  selectedChild = (_init_extra_thresholdAttribute(this), _init_selectedChild(this, -1));

  /** m_seed (BlueSharedString) [READWRITE, NOTIFY] */
  seed_temp = (_init_extra_selectedChild(this), _init_seed_temp(this, ""));

  /** Carbon EveProceduralMethodAttributeMap::OnModified (cpp:19-27): a seed
   * change reselects. The value argument follows the repo's OnModified duck
   * (field name or field value). */
  OnModified(value = null) {
    if (value === "seed_temp" || value === this.seed_temp) {
      this.SelectParameter();
    }
    return true;
  }

  /** Carbon EveProceduralMethodAttributeMap::SelectParameter (cpp:29-47): the
   * first parameter whose name equals the seed string wins; a changed index
   * flags the selected child as modified. Carbon leaves the index untouched
   * when no name matches. */
  SelectParameter() {
    const currentChild = this.selectedChild;
    for (let index = 0; index < this.parameters.length; index++) {
      const param = this.parameters[index];
      if ((param?.GetName?.() ?? param?.name ?? "") === this.seed_temp) {
        this.selectedChild = index;
        break;
      }
    }
    if (currentChild !== this.selectedChild) {
      this.#selectedChildModified = true;
    }
  }

  /** Carbon EveProceduralMethodAttributeMap::IsSelectedChildModified
   * (cpp:49-52). */
  IsSelectedChildModified() {
    return this.#selectedChildModified;
  }

  /** Carbon EveProceduralMethodAttributeMap::GetSelectedChild (cpp:54-74):
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

  /** Carbon EveProceduralMethodAttributeMap::UpdateAsyncronous (cpp:76-91):
   * reselect once any parameter reports itself modified, clearing the flags
   * on the way. */
  UpdateAsyncronous(_updateContext, _params) {
    let reselect = false;
    for (const param of this.parameters) {
      if (param?.IsModified?.()) {
        reselect = true;
        param.SetModified(false);
      }
    }
    if (reselect) {
      this.SelectParameter();
    }
  }
  static {
    _initClass();
  }
}

export { _EveProceduralMethodA as EveProceduralMethodAttributeMap };
//# sourceMappingURL=EveProceduralMethodAttributeMap.js.map
