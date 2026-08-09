import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveChildRef as _EveChildRef } from '../../EveChildRef.js';

let _initProto, _initClass, _init_child, _init_extra_child, _init_name, _init_extra_name, _init_weighting, _init_extra_weighting;

/** EveProceduralMethodRandomParameter (eve/child/procedural/selection) - generated from schema shapeHash 8b32e583.... */
let _EveProceduralMethodR;
class EveProceduralMethodRandomParameter extends CjsModel {
  static {
    ({
      e: [_init_child, _init_extra_child, _init_name, _init_extra_name, _init_weighting, _init_extra_weighting, _initProto],
      c: [_EveProceduralMethodR, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProceduralMethodRandomParameter",
      family: "eve/child/procedural/selection"
    })], [[[io, io.notify, io, io.persist, void 0, type.model("EveChild")], 16, "child"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.int32], 16, "weighting"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("SetAutoLoadBlocker is inlined onto loadChildAutomatically when the staged EveChildRef lacks the method.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWeighting"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetChild"], [[carbon, carbon.method, impl, impl.implemented], 18, "Load"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_weighting(this);
  }
  #modified = (_initProto(this), false);

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  child = _init_child(this, null);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_child(this), _init_name(this, ""));

  /** m_weighting (int) [READWRITE, PERSIST, NOTIFY] */
  weighting = (_init_extra_name(this), _init_weighting(this, 1));

  /** Carbon EveProceduralMethodRandomParameter::Initialize (cpp:26-33):
   * lazily create the child ref. */
  Initialize() {
    if (!this.child) {
      this.child = new _EveChildRef();
    }
    return true;
  }

  /** Carbon EveProceduralMethodRandomParameter::OnModified (cpp:35-52): a
   * weighting change clamps to >= 1 and flags the parameter modified; a child
   * assignment blocks its auto-load. The value argument follows the repo's
   * OnModified duck. */
  OnModified(value = null) {
    if (value === "weighting" || value === this.weighting) {
      this.weighting = Math.max(this.weighting, 1);
      this.#modified = true;
    }
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

  /** Carbon method GetName (cpp:16-19). */
  GetName() {
    return this.name;
  }

  /** Carbon method SetName (cpp:21-24). */
  SetName(name) {
    this.name = String(name ?? "");
  }

  /** Carbon method SetModified (cpp:54-57). */
  SetModified(isModified) {
    this.#modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:59-62). */
  IsModified() {
    return this.#modified;
  }

  /** Carbon method GetWeighting (cpp:64-67). */
  GetWeighting() {
    return this.weighting;
  }

  /** Carbon method GetChild (cpp:69-72). */
  GetChild() {
    return this.child;
  }

  /** Carbon EveProceduralMethodRandomParameter::Load (cpp:74-80): one-line
   * bypass-blocker reload delegate. */
  Load() {
    this.child?.Reload?.(true);
  }
  static {
    _initClass();
  }
}

export { _EveProceduralMethodR as EveProceduralMethodRandomParameter };
//# sourceMappingURL=EveProceduralMethodRandomParameter.js.map
