// Source: audio/src/AudMusicPlayer.h + AudMusicPlayer.cpp
// Hand-owned since 2026-07-19 (behavior port); the generator skips this file.
import { type } from "#schema";
import { AudEmitter } from "./AudEmitter.js";

export const MUSIC_GAME_OBJ_ID = 3;

const FLOAT_MAX = 3.4028234663852886e38;

/**
 * AudMusicPlayer (audio) - "Simple wrapper for an audio emitter dedicated to
 * playing music" (AudMusicPlayer_Blue.cpp:10). Fixed id 3, named "Music",
 * FLT_MAX culling weight, fixed origin pose (AudMusicPlayer.cpp:6-11); all
 * behavior is inherited from AudEmitter (SendEvent/SetSwitch/SetRTPC/...).
 */
@type.define({ className: "AudMusicPlayer", family: "audio" })
export class AudMusicPlayer extends AudEmitter
{

  /** Creates Carbon's fixed-id music emitter at its authored origin pose. */
  constructor()
  {
    super(MUSIC_GAME_OBJ_ID);
    this.name = "Music";
    this.additionalCullingWeight = FLOAT_MAX;
    this.SetPosition([ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
  }

}
