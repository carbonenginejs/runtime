import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsGrannyCurves } from './CjsGrannyCurves.js';
import { Tr2GrannyTrack as _Tr2GrannyTrack } from './Tr2GrannyTrack.js';

let _initProto, _initClass, _init_eventListener, _init_extra_eventListener;

/**
 * Granny track that replays a text track's timed entries as engine events,
 * firing each entry once as the playhead crosses it.
 */
let _Tr2GrannyEventTrack;
class Tr2GrannyEventTrack extends _Tr2GrannyTrack {
  static {
    ({
      e: [_init_eventListener, _init_extra_eventListener, _initProto],
      c: [_Tr2GrannyEventTrack, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GrannyEventTrack",
      family: "curves"
    })], [[[io, io.readwrite, void 0, type.objectRef("IBlueEventListener")], 16, "eventListener"], [[carbon, carbon.method, impl, impl.implemented], 18, "TracksReady"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetTracks"], [[carbon, carbon.method, impl, impl.adapted], 18, "ApplyTracks"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateValueImpl"]], 0, void 0, _Tr2GrannyTrack));
  }
  eventListener = (_initProto(this), _init_eventListener(this, null));
  #entries = (_init_extra_eventListener(this), null);
  #previousTime = 0;
  #previousIndex = 0;

  /**
   * Checks whether event track handles are ready.
   */
  TracksReady() {
    return this.#entries !== null;
  }

  /**
   * Clears event track handles.
   */
  ResetTracks() {
    this.#entries = null;
    this.#previousTime = 0;
    this.#previousIndex = 0;
  }

  /**
   * Applies event track handles.
   */
  ApplyTracks(group, duration, _timeStep) {
    const track = CjsGrannyCurves.findTextTrack(group, this.name);
    if (!track) {
      return;
    }
    this.duration = duration;
    this.#entries = CjsGrannyCurves.getTextTrackEntries(track);
    this.#previousTime = 0;
    this.#previousIndex = 0;
  }

  /**
   * Emits resource events when available.
   */
  UpdateValueImpl(time) {
    const entries = this.#entries;
    if (!entries) {
      return;
    }
    if (time < this.#previousTime) {
      this.#previousTime = 0;
      this.#previousIndex = 0;
    }
    while (this.#previousIndex < entries.length) {
      const entry = entries[this.#previousIndex];
      if (entry.time >= this.#previousTime && entry.time <= time) {
        this.eventListener?.HandleEvent(entry.text);
      } else if (entry.time > time) {
        break;
      }
      this.#previousIndex++;
    }
    this.#previousTime = time;
  }
  static {
    _initClass();
  }
}

export { _Tr2GrannyEventTrack as Tr2GrannyEventTrack };
//# sourceMappingURL=Tr2GrannyEventTrack.js.map
