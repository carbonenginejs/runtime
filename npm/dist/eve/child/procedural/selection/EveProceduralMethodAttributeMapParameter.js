import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveChildRef as _EveChildRef } from '../../../../generated/eve/child/EveChildRef.js';

let _initProto, _initClass, _init_child, _init_extra_child, _init_name, _init_extra_name;

/** EveProceduralMethodAttributeMapParameter (eve/child/procedural/selection) - generated from schema shapeHash 5880f54c.... */
let _EveProceduralMethodA;
class EveProceduralMethodAttributeMapParameter extends CjsModel {
  static {
    ({
      e: [_init_child, _init_extra_child, _init_name, _init_extra_name, _initProto],
      c: [_EveProceduralMethodA, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProceduralMethodAttributeMapParameter",
      family: "eve/child/procedural/selection"
    })], [[[io, io.notify, io, io.persist, void 0, type.model("EveChild")], 16, "child"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("SetAutoLoadBlocker is inlined onto loadChildAutomatically when the staged EveChildRef lacks the method.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetChild"], [[carbon, carbon.method, impl, impl.implemented], 18, "Load"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  #modified = (_initProto(this), false);

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  child = _init_child(this, null);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_child(this), _init_name(this, ""));

  /** Carbon EveProceduralMethodAttributeMapParameter::Initialize (cpp:15-22):
   * lazily create the child ref. */
  Initialize() {
    if (!this.child) {
      this.child = new _EveChildRef();
    }
    return true;
  }

  /** Carbon EveProceduralMethodAttributeMapParameter::OnModified (cpp:24-35):
   * a child assignment blocks its auto-load until the map selects it. The
   * value argument follows the repo's OnModified duck. */
  OnModified(value = null) {
    if (value === "child" || value && value === this.child) {
      if (this.child) {
        if (typeof this.child.SetAutoLoadBlocker === "function") {
          this.child.SetAutoLoadBlocker(true);
        } else {
          this.child.loadChildAutomatically = false;
        }
      }
    }
    return true;
  }

  /** Carbon method SetModified (cpp:37-40). */
  SetModified(isModified) {
    this.#modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:42-45). */
  IsModified() {
    return this.#modified;
  }

  /** Carbon method GetName (cpp:47-50). */
  GetName() {
    return this.name;
  }

  /** Carbon method GetChild (cpp:52-55). */
  GetChild() {
    return this.child;
  }

  /** Carbon EveProceduralMethodAttributeMapParameter::Load (cpp:57-63):
   * one-line bypass-blocker reload delegate. */
  Load() {
    this.child?.Reload?.(true);
  }
  static {
    _initClass();
  }
}

export { _EveProceduralMethodA as EveProceduralMethodAttributeMapParameter };
//# sourceMappingURL=EveProceduralMethodAttributeMapParameter.js.map
