import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_parameters, _init_extra_parameters, _init_debugVolumes, _init_extra_debugVolumes, _init_startTimeOffset, _init_extra_startTimeOffset, _init_randomizeOrder, _init_extra_randomizeOrder, _init_selectedChild, _init_extra_selectedChild;

// Carbon BELIST_LOADING (blueexposure IList.h:50): list events raised while a
// persisted list hydrates carry this flag and must not trigger reselection.
const BELIST_LOADING = 0x10;

/** EveProceduralMethodCycling (eve/child/procedural/selection) - generated from schema shapeHash 2014815d.... */
let _EveProceduralMethodC;
class EveProceduralMethodCycling extends CjsModel {
  static {
    ({
      e: [_init_parameters, _init_extra_parameters, _init_debugVolumes, _init_extra_debugVolumes, _init_startTimeOffset, _init_extra_startTimeOffset, _init_randomizeOrder, _init_extra_randomizeOrder, _init_selectedChild, _init_extra_selectedChild, _initProto],
      c: [_EveProceduralMethodC, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProceduralMethodCycling",
      family: "eve/child/procedural/selection"
    })], [[[io, io.persist, void 0, type.list("EveProceduralMethodCyclingParameter")], 16, "parameters"], [[io, io.persist, void 0, type.list("IEveVolume")], 16, "debugVolumes"], [[io, io.persist, type, type.float32], 16, "startTimeOffset"], [[io, io.persist, type, type.boolean], 16, "randomizeOrder"], [[io, io.read, type, type.int32], 16, "selectedChild"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("An optional timestamp provides Carbon's current-frame clock deterministically in browser tests.")], 18, "restart"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The list argument defaults to the parameters list; the reselect uses restart's default wall clock (no frame context reaches list notifies).")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsSelectedChildModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSelectedChild"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The BeOS frame clock arrives via the duck-typed update context time; both restart and the elapsed check share the same value per call.")], 18, "UpdateAsyncronous"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_selectedChild(this);
  }
  #selectedChildModified = (_initProto(this), false);

  // Carbon m_startTime (Be::Time): stamped by restart from the caller-supplied
  // clock (frame time when the update loop reselects, wall clock for the
  // Date.now default); UpdateAsyncronous must feed the same clock.
  #startTime = 0;

  /** m_parameters (PEveProceduralMethodCyclingParameterVector) [READ, PERSIST] */
  parameters = _init_parameters(this, []);

  /** m_debugVolumes (PIEveVolumeVector) [READ, PERSIST] */
  debugVolumes = (_init_extra_parameters(this), _init_debugVolumes(this, []));

  /** m_startTimeOffset (float) [READWRITE, PERSIST] */
  startTimeOffset = (_init_extra_debugVolumes(this), _init_startTimeOffset(this, 0));

  /** m_randomizeOrder (bool) [READWRITE, PERSIST] */
  randomizeOrder = (_init_extra_startTimeOffset(this), _init_randomizeOrder(this, false));

  /** m_selectedChildIndex (int) [READ] */
  selectedChild = (_init_extra_randomizeOrder(this), _init_selectedChild(this, -1));

  /** Carbon method restart -> SelectParameter (MAP_METHOD_AND_WRAP,
   * cpp:36-60): randomized order picks any OTHER index (the shifted draw);
   * otherwise a plain cycle. Math.random replaces Carbon's unseeded rand(). */
  restart(timestamp = Date.now() / 1000) {
    const count = this.parameters.length;
    if (count === 0) {
      return false;
    }
    if (this.randomizeOrder && count > 2) {
      const previous = this.selectedChild;
      this.selectedChild = Math.floor(Math.random() * (count - 1));
      if (this.selectedChild >= previous) {
        this.selectedChild++;
      }
    } else {
      this.selectedChild = (this.selectedChild + 1) % count;
    }
    this.#startTime = timestamp - this.startTimeOffset;
    this.#selectedChildModified = true;
    return true;
  }

  /** Carbon EveProceduralMethodCycling::OnModified (cpp:23-26) is an
   * intentional no-op notify. */
  OnModified(_value = null) {
    return true;
  }

  /** Carbon EveProceduralMethodCycling::OnListModified (cpp:28-34): a
   * non-loading change to the parameter list reselects. */
  OnListModified(event = 0, _key = 0, _key2 = 0, _value = null, list = null) {
    if ((list === null || list === this.parameters) && (event & BELIST_LOADING) === 0) {
      this.restart();
    }
  }

  /** Carbon EveProceduralMethodCycling::IsSelectedChildModified
   * (cpp:62-65). */
  IsSelectedChildModified() {
    return this.#selectedChildModified;
  }

  /** Carbon EveProceduralMethodCycling::GetSelectedChild (cpp:67-87):
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

  /** Carbon EveProceduralMethodCycling::UpdateAsyncronous (cpp:89-106):
   * reselect when no valid index exists or the current parameter's play
   * duration has elapsed on the frame clock (BeOS GetCurrentFrameTime maps to
   * the update context time, falling back to restart's wall-clock default). */
  UpdateAsyncronous(updateContext, _params) {
    const now = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? Date.now() / 1000);
    if (this.selectedChild < 0 || this.selectedChild > this.parameters.length - 1) {
      this.restart(now);
      return;
    }
    const param = this.parameters[this.selectedChild];
    if (param) {
      const elapsed = now - this.#startTime;
      if (elapsed >= Number(param.GetDuration?.() ?? param.playDuration ?? 0)) {
        this.restart(now);
      }
    }
  }
  static {
    _initClass();
  }
}

export { _EveProceduralMethodC as EveProceduralMethodCycling };
//# sourceMappingURL=EveProceduralMethodCycling.js.map
