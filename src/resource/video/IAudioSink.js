// Source: videoplayer/IAudioSink.h
//
// Where decoded PCM goes. The sink also carries the clock: when one is present
// the controller reads media time from it rather than from its own timer, so
// video follows audio (VideoController.h:82-85).
//
// Carbon ships two: WaveOutAudioSink and WwiseAudioSink. Neither is portable -
// one is a Windows API, the other the Wwise SDK - and a browser sink is the
// audio runtime's business, not this module's.

/** `IAudioSink` - consumes decoded PCM frames and reports playback time. */
export class IAudioSink
{
  /**
   * `Open` - begin consuming from a queue for a described track.
   *
   * @param {object} _audioMetadata An `AudioMetadata`.
   * @param {object} _frameQueue The `PcmFrame` queue to drain.
   * @returns {void}
   */
  Open(_audioMetadata, _frameQueue)
  {
    throw new Error("IAudioSink.Open must be implemented.");
  }

  /** `Close` - stop consuming and release the sink's resources. */
  Close()
  {
    throw new Error("IAudioSink.Close must be implemented.");
  }

  /** `Pause` - hold playback and the clock. */
  Pause()
  {
    throw new Error("IAudioSink.Pause must be implemented.");
  }

  /** `Resume` - continue playback and the clock. */
  Resume()
  {
    throw new Error("IAudioSink.Resume must be implemented.");
  }

  /** `GetTime` - the sink's playback clock, which drives media time. */
  GetTime()
  {
    throw new Error("IAudioSink.GetTime must be implemented.");
  }

  /** `IsDone` - whether everything queued has been played. */
  IsDone()
  {
    throw new Error("IAudioSink.IsDone must be implemented.");
  }
}
