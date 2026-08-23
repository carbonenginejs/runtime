import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { AudEmitter as _AudEmitter } from './AudEmitter.js';

let _initClass;
const MUSIC_GAME_OBJ_ID = 3;
const FLOAT_MAX = 3.4028234663852886e38;

/**
 * AudMusicPlayer (audio) - "Simple wrapper for an audio emitter dedicated to
 * playing music" (AudMusicPlayer_Blue.cpp:10). Fixed id 3, named "Music",
 * FLT_MAX culling weight, fixed origin pose (AudMusicPlayer.cpp:6-11); all
 * behavior is inherited from AudEmitter (SendEvent/SetSwitch/SetRTPC/...).
 */
let _AudMusicPlayer;
class AudMusicPlayer extends _AudEmitter {
  static {
    [_AudMusicPlayer, _initClass] = _applyDecs2311(this, [type.define({
      className: "AudMusicPlayer",
      family: "audio"
    })], [], 0, void 0, _AudEmitter).c;
  }
  /** Creates Carbon's fixed-id music emitter at its authored origin pose. */
  constructor() {
    super(MUSIC_GAME_OBJ_ID);
    this.name = "Music";
    this.additionalCullingWeight = FLOAT_MAX;
    this.SetPosition([1, 0, 0], [0, 1, 0], [0, 0, 0]);
  }
  static {
    _initClass();
  }
}

export { _AudMusicPlayer as AudMusicPlayer, MUSIC_GAME_OBJ_ID };
//# sourceMappingURL=AudMusicPlayer.js.map
