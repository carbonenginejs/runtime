// Source: videoplayer/IVideoDecoder.h
//
// A video decoder: it consumes encoded frames and publishes decoded ones.
// `SetDropFrameTime` is the controller telling it that undecoded frames older
// than that time may be dropped.
//
// Carbon's `CreateVideoDecoder( videoMetadata, encodedQueue )` builds its one
// implementation, `VpxDecoder`, which is libvpx - vendored, so there is nothing
// of Carbon's to port. The browser decoder that stands in its place declares
// what it replaces at its own site.

/** `IVideoDecoder` - decodes encoded video frames into VideoFrames. */
export class IVideoDecoder
{
  /** `GetDecodedQueue` - the queue decoded frames are published to. */
  GetDecodedQueue()
  {
    throw new Error("IVideoDecoder.GetDecodedQueue must be implemented.");
  }

  /**
   * `SetDropFrameTime` - frames older than this may be dropped undecoded.
   *
   * @param {number} _time Media time.
   * @returns {void}
   */
  SetDropFrameTime(_time)
  {
    throw new Error("IVideoDecoder.SetDropFrameTime must be implemented.");
  }

  /** `GetError` - a `DecoderError` member. */
  GetError()
  {
    throw new Error("IVideoDecoder.GetError must be implemented.");
  }
}
