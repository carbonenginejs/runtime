import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveChildRef as _EveChildRef } from '../../EveChildRef.js';

let _initProto, _initClass, _init_child, _init_extra_child, _init_name, _init_extra_name, _init_playDuration, _init_extra_playDuration, _init_reloadRequired, _init_extra_reloadRequired, _init_restartRequired, _init_extra_restartRequired;

/** EveProceduralMethodCyclingParameter (eve/child/procedural/selection) - generated from schema shapeHash 90bcbbe1.... */
let _EveProceduralMethodC;
class EveProceduralMethodCyclingParameter extends CjsModel {
  static {
    ({
      e: [_init_child, _init_extra_child, _init_name, _init_extra_name, _init_playDuration, _init_extra_playDuration, _init_reloadRequired, _init_extra_reloadRequired, _init_restartRequired, _init_extra_restartRequired, _initProto],
      c: [_EveProceduralMethodC, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProceduralMethodCyclingParameter",
      family: "eve/child/procedural/selection"
    })], [[[io, io.notify, io, io.persist, void 0, type.model("EveChild")], 16, "child"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "playDuration"], [[io, io.persist, type, type.boolean], 16, "reloadRequired"], [[io, io.persist, type, type.boolean], 16, "restartRequired"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("SetAutoLoadBlocker is inlined onto loadChildAutomatically when the staged EveChildRef lacks the method.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetChild"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "Load"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_restartRequired(this);
  }
  #modified = (_initProto(this), false);

  // Carbon m_hasLoaded: runtime-only load latch (never persisted).
  #hasLoaded = false;

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  child = _init_child(this, null);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_child(this), _init_name(this, ""));

  /** m_playDuration (float) [READWRITE, PERSIST] */
  playDuration = (_init_extra_name(this), _init_playDuration(this, 1));

  /** m_reloadRequired (bool) [READWRITE, PERSIST] */
  reloadRequired = (_init_extra_playDuration(this), _init_reloadRequired(this, false));

  /** m_restartRequired (bool) [READWRITE, PERSIST] */
  restartRequired = (_init_extra_reloadRequired(this), _init_restartRequired(this, true));

  /** Carbon EveProceduralMethodCyclingParameter::Initialize (cpp:19-26):
   * lazily create the child ref. */
  Initialize() {
    if (!this.child) {
      this.child = new _EveChildRef();
    }
    return true;
  }

  /** Carbon EveProceduralMethodCyclingParameter::OnModified (cpp:28-39): a
   * child assignment blocks its auto-load until the cycle selects it. The
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

  /** Carbon method SetModified (cpp:41-44). */
  SetModified(isModified) {
    this.#modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:46-49). */
  IsModified() {
    return this.#modified;
  }

  /** Carbon method GetName (cpp:51-54). */
  GetName() {
    return this.name;
  }

  /** Carbon method GetChild (cpp:56-59). */
  GetChild() {
    return this.child;
  }

  /** Carbon method GetDuration (cpp:61-64). */
  GetDuration() {
    return this.playDuration;
  }

  /** Carbon EveProceduralMethodCyclingParameter::Load (cpp:66-83): an
   * already-loaded parameter that needs no reload only restarts its
   * controllers/curve sets when required; otherwise the child ref reloads
   * with the auto-load blocker bypassed. */
  Load() {
    if (this.#hasLoaded && !this.reloadRequired) {
      if (this.restartRequired) {
        this.child?.StartControllers?.();
        this.child?.PlayAllCurveSets?.();
      }
      return;
    }
    if (this.child) {
      this.child.Reload?.(true);
      this.#hasLoaded = true;
    }
  }
  static {
    _initClass();
  }
}

export { _EveProceduralMethodC as EveProceduralMethodCyclingParameter };
//# sourceMappingURL=EveProceduralMethodCyclingParameter.js.map
