import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsGrannyCurves } from './CjsGrannyCurves.js';

let _initProto, _initClass, _init_grannyResPath, _init_extra_grannyResPath, _init_cycle, _init_extra_cycle, _init_duration, _init_extra_duration, _init_grannyRes, _init_extra_grannyRes, _init_name, _init_extra_name, _init_group, _init_extra_group;

/**
 * Base for curves sampled out of a Granny animation resource, owning the
 * resource path, group and track name plus the cycle flag and resolved duration;
 * subclasses supply the track binding and sampling.
 */
let _Tr2GrannyTrack;
class Tr2GrannyTrack extends CjsModel {
  static {
    ({
      e: [_init_grannyResPath, _init_extra_grannyResPath, _init_cycle, _init_extra_cycle, _init_duration, _init_extra_duration, _init_grannyRes, _init_extra_grannyRes, _init_name, _init_extra_name, _init_group, _init_extra_group, _initProto],
      c: [_Tr2GrannyTrack, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GrannyTrack",
      family: "curves"
    })], [[[io, io.persist, io, io.notify, type, type.path], 16, "grannyResPath"], [[io, io.persist, type, type.boolean], 16, "cycle"], [[io, io.read, type, type.float32], 16, "duration"], [[io, io.read, void 0, type.objectRef("TriGrannyRes")], 16, "grannyRes"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.string], 16, "group"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetGrannyResource"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetCurves"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateValueImpl"], [[carbon, carbon.method, impl, impl.noop], 18, "ResetTracks"], [[carbon, carbon.method, impl, impl.noop], 18, "ApplyTracks"], [[carbon, carbon.method, impl, impl.noop], 18, "TracksReady"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_group(this);
  }
  grannyResPath = (_initProto(this), _init_grannyResPath(this, ""));
  cycle = (_init_extra_grannyResPath(this), _init_cycle(this, false));
  duration = (_init_extra_cycle(this), _init_duration(this, 0));
  grannyRes = (_init_extra_duration(this), _init_grannyRes(this, null));
  name = (_init_extra_grannyRes(this), _init_name(this, ""));
  group = (_init_extra_name(this), _init_group(this, ""));

  /**
   * Initializes the resource-backed track.
   */
  Initialize() {
    this.SetGrannyResource();
    return true;
  }

  /**
   * Relinks the resource when authored fields change.
   */
  OnModified(_options = {}) {
    this.SetGrannyResource();
    return true;
  }

  /**
   * Relinks the authored Granny resource path.
   */
  SetGrannyResource() {
    this.ResetTracks();
    this.duration = 0;
    if (this.grannyResPath) {
      this.grannyRes = CjsGrannyCurves.resolveResource(this.grannyResPath);
    }
    this.SetCurves();
  }

  /**
   * Updates the track value.
   */
  UpdateValue(time) {
    if (!this.TracksReady()) {
      return;
    }
    const duration = this.Length();
    const localTime = this.cycle && duration > 0 ? time % duration : time;
    if (localTime >= 0 && localTime <= duration) {
      this.UpdateValueImpl(localTime);
    }
  }

  /**
   * Gets track duration.
   */
  Length() {
    return Number(this.duration) || 0;
  }

  /**
   * Locates resource curves.
   */
  SetCurves() {
    if (!this.name || !this.group) {
      return;
    }
    const source = CjsGrannyCurves.getTrackSource(this.grannyRes);
    if (!source) {
      return;
    }
    for (const animation of CjsGrannyCurves.getAnimations(source)) {
      for (const trackGroup of CjsGrannyCurves.getTrackGroups(animation)) {
        const groupName = trackGroup.name ?? trackGroup.Name;
        if (groupName === this.group) {
          this.ApplyTracks(trackGroup, CjsGrannyCurves.getAnimationDuration(animation), CjsGrannyCurves.getAnimationTimeStep(animation));
          return;
        }
      }
    }
  }

  /**
   * Subclass hook for sampled value updates.
   */
  UpdateValueImpl(_time) {}

  /**
   * Subclass hook for clearing resource track handles.
   */
  ResetTracks() {}

  /**
   * Subclass hook for applying resource track handles.
   */
  ApplyTracks(_group, _duration, _timeStep) {}

  /**
   * Checks whether resource track handles are ready.
   */
  TracksReady() {
    return false;
  }
  static {
    _initClass();
  }
}

export { _Tr2GrannyTrack as Tr2GrannyTrack };
//# sourceMappingURL=Tr2GrannyTrack.js.map
