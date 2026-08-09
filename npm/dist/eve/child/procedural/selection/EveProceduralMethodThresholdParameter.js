import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveChildRef as _EveChildRef } from '../../EveChildRef.js';

let _initProto, _initClass, _init_child, _init_extra_child, _init_name, _init_extra_name, _init_threshold, _init_extra_threshold;

/** EveProceduralMethodThresholdParameter (eve/child/procedural/selection) - generated from schema shapeHash e31926d9.... */
let _EveProceduralMethodT;
class EveProceduralMethodThresholdParameter extends CjsModel {
  static {
    ({
      e: [_init_child, _init_extra_child, _init_name, _init_extra_name, _init_threshold, _init_extra_threshold, _initProto],
      c: [_EveProceduralMethodT, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProceduralMethodThresholdParameter",
      family: "eve/child/procedural/selection"
    })], [[[io, io.notify, io, io.persist, void 0, type.model("EveChild")], 16, "child"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.float32], 16, "threshold"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("SetAutoLoadBlocker is inlined onto loadChildAutomatically when the staged EveChildRef lacks the method.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetThreshold"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetChild"], [[carbon, carbon.method, impl, impl.implemented], 18, "Load"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_threshold(this);
  }
  #modified = (_initProto(this), false);

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  child = _init_child(this, null);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_child(this), _init_name(this, ""));

  /** m_threshold (float) [READWRITE, PERSIST, NOTIFY] */
  threshold = (_init_extra_name(this), _init_threshold(this, 1));

  /** Carbon EveProceduralMethodThresholdParameter::Initialize (cpp:16-23):
   * lazily create the child ref. */
  Initialize() {
    if (!this.child) {
      this.child = new _EveChildRef();
    }
    return true;
  }

  /** Carbon EveProceduralMethodThresholdParameter::OnModified (cpp:25-42): a
   * threshold change clamps to >= 0 and flags the parameter modified; a child
   * assignment blocks its auto-load. The value argument follows the repo's
   * OnModified duck. */
  OnModified(value = null) {
    if (value === "threshold" || value === this.threshold) {
      this.threshold = Math.max(this.threshold, 0);
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

  /** Carbon method SetModified (cpp:44-47). */
  SetModified(isModified) {
    this.#modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:49-52). */
  IsModified() {
    return this.#modified;
  }

  /** Carbon method GetThreshold (cpp:54-57). */
  GetThreshold() {
    return this.threshold;
  }

  /** Carbon method GetChild (cpp:59-62). */
  GetChild() {
    return this.child;
  }

  /** Carbon EveProceduralMethodThresholdParameter::Load (cpp:64-70): one-line
   * bypass-blocker reload delegate. */
  Load() {
    this.child?.Reload?.(true);
  }
  static {
    _initClass();
  }
}

export { _EveProceduralMethodT as EveProceduralMethodThresholdParameter };
//# sourceMappingURL=EveProceduralMethodThresholdParameter.js.map
