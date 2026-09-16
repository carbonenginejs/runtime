// Source: videoplayer/IVideoContainerParser.h
//
// A container parser: it reads a stream, reports the track metadata, and fills
// the encoded audio and video queues the decoders drain.
//
// Carbon's `CreateVideoContainerParser( stream, outputStreams, audioTrack )`
// builds `WebMParser`, which is nestegg - vendored, so there is nothing of
// Carbon's to port. In a browser the container is parsed by whatever decodes
// it, and the class standing in for both declares that at its own site.

/** `IVideoContainerParser` - reads a container and feeds the encoded queues. */
export class IVideoContainerParser
{
  /** `IsMetadataAvailable` - whether the track metadata has been read yet. */
  IsMetadataAvailable()
  {
    throw new Error("IVideoContainerParser.IsMetadataAvailable must be implemented.");
  }

  /** `GetVideoMetadata` - the video track's `VideoMetadata`. */
  GetVideoMetadata()
  {
    throw new Error("IVideoContainerParser.GetVideoMetadata must be implemented.");
  }

  /** `GetAudioMetadata` - the audio track's `AudioMetadata`. */
  GetAudioMetadata()
  {
    throw new Error("IVideoContainerParser.GetAudioMetadata must be implemented.");
  }

  /** `CompleteQueues` - mark both encoded queues complete; nothing more arrives. */
  CompleteQueues()
  {
    throw new Error("IVideoContainerParser.CompleteQueues must be implemented.");
  }

  /** `GetDuration` - total media duration. */
  GetDuration()
  {
    throw new Error("IVideoContainerParser.GetDuration must be implemented.");
  }

  /** `GetDownloadedMediaTime` - how much of the media has arrived. */
  GetDownloadedMediaTime()
  {
    throw new Error("IVideoContainerParser.GetDownloadedMediaTime must be implemented.");
  }

  /**
   * `Seek` - move the read position to a media time.
   *
   * @param {number} _time Media time.
   * @returns {void}
   */
  Seek(_time)
  {
    throw new Error("IVideoContainerParser.Seek must be implemented.");
  }

  /** `GetAudioQueue` - the encoded audio queue, or null when there is no audio. */
  GetAudioQueue()
  {
    throw new Error("IVideoContainerParser.GetAudioQueue must be implemented.");
  }

  /** `GetVideoQueue` - the encoded video queue, or null when there is no video. */
  GetVideoQueue()
  {
    throw new Error("IVideoContainerParser.GetVideoQueue must be implemented.");
  }

  /** `GetError` - a `ParserError` member. */
  GetError()
  {
    throw new Error("IVideoContainerParser.GetError must be implemented.");
  }
}
