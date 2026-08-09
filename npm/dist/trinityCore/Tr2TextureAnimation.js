import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_fps, _init_extra_fps, _init_frame, _init_extra_frame, _init_time, _init_extra_time, _init_paused, _init_extra_paused, _init_updateOnlyWhenRendered, _init_extra_updateOnlyWhenRendered, _init_resPath, _init_extra_resPath, _init_looped, _init_extra_looped;

/** Advances a multi-channel texture flipbook, tracking frame and restart state per channel. */
let _Tr2TextureAnimation;
new class extends _identity {
  static [class Tr2TextureAnimation extends CjsModel {
    static {
      ({
        e: [_init_fps, _init_extra_fps, _init_frame, _init_extra_frame, _init_time, _init_extra_time, _init_paused, _init_extra_paused, _init_updateOnlyWhenRendered, _init_extra_updateOnlyWhenRendered, _init_resPath, _init_extra_resPath, _init_looped, _init_extra_looped, _initProto],
        c: [_Tr2TextureAnimation, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2TextureAnimation",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.float32], 16, "fps"], [[io, io.read, type, type.uint32], 16, "frame"], [[io, io.read, type, type.float32], 16, "time"], [[io, io.persist, type, type.boolean], 16, "paused"], [[io, io.persist, type, type.boolean], 16, "updateOnlyWhenRendered"], [[io, io.notify, io, io.persist, type, type.string], 16, "resPath"], [[io, io.persist, type, type.boolean], 16, "looped"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetChannelNames"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The browser resets its CPU frame clock and delegates decoder rewind to attached channel adapters instead of Carbon's VTA worker thread.")], 18, "RestartAnimation"], [[impl, impl.adapted], 18, "SetChannels"], [[impl, impl.adapted], 18, "GetTexture"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_looped(this);
    }
    #channels = (_initProto(this), new Map());

    /** m_fps (float) [READWRITE, PERSIST] */
    fps = _init_fps(this, 1);

    /** m_frame (uint32_t) [READ] */
    frame = (_init_extra_fps(this), _init_frame(this, 0));

    /** m_time (float) [READ] */
    time = (_init_extra_frame(this), _init_time(this, 0));

    /** m_paused (bool) [READWRITE, PERSIST] */
    paused = (_init_extra_time(this), _init_paused(this, false));

    /** m_updateOnlyWhenRendered (bool) [READWRITE, PERSIST] */
    updateOnlyWhenRendered = (_init_extra_paused(this), _init_updateOnlyWhenRendered(this, true));

    /** m_filename (std::wstring) [READWRITE, PERSIST, NOTIFY] */
    resPath = (_init_extra_updateOnlyWhenRendered(this), _init_resPath(this, ""));

    /** m_looped (bool) [READWRITE, PERSIST] */
    looped = (_init_extra_resPath(this), _init_looped(this, true));

    /** Carbon method GetChannelNames (MAP_METHOD_AND_WRAP). */
    /**
     * The names of the animated texture channels.
     */
    GetChannelNames() {
      return Array.from(this.#channels.keys());
    }

    /** Carbon method RestartAnimation (MAP_METHOD_AND_WRAP). */
    RestartAnimation() {
      this.frame = 0;
      this.time = 0;
      for (const channel of this.#channels.values()) {
        if (typeof channel?.Restart === "function") {
          channel.Restart();
        } else {
          channel?.Reset?.();
        }
      }
    }

    /** Attaches already-decoded browser VTA channel adapters. */
    SetChannels(channels) {
      this.#channels.clear();
      if (channels instanceof Map) {
        for (const [name, channel] of channels) {
          this.#channels.set(String(name), channel);
        }
      } else if (channels && typeof channels === "object") {
        for (const [name, channel] of Object.entries(channels)) {
          this.#channels.set(name, channel);
        }
      }
    }

    /**
     * The texture currently showing on one animated channel.
     */
    GetTexture(channel) {
      const value = this.#channels.get(String(channel ?? ""));
      return value?.texture ?? value ?? null;
    }
  }];
  RestartState = Object.freeze({
    NotRestarting: 0,
    WaitingToRestart: 1,
    WaitingForFrame: 2
  });
  constructor() {
    super(_Tr2TextureAnimation), _initClass();
  }
}();

export { _Tr2TextureAnimation as Tr2TextureAnimation };
//# sourceMappingURL=Tr2TextureAnimation.js.map
