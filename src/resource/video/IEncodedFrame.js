// Source: videoplayer/Metadata.h:223-236
//
// The base interface for an encoded frame, audio or video, as a container
// parser emits it. Carbon's `GetFrame`/`GetAlphaFrame` return their bytes
// through out-parameters and report success; out-parameters become the return
// value here, and "no frame" is null.

/** `IEncodedFrame` - one encoded frame from a container parser. */
export class IEncodedFrame
{
  /** `GetFrameCount` - how many sub-frames this packet holds. */
  GetFrameCount()
  {
    throw new Error("IEncodedFrame.GetFrameCount must be implemented.");
  }

  /** `GetTimeStamp` - presentation time in the media clock's units. */
  GetTimeStamp()
  {
    throw new Error("IEncodedFrame.GetTimeStamp must be implemented.");
  }

  /** `IsSeekFrame` - whether playback may start at this frame. */
  IsSeekFrame()
  {
    throw new Error("IEncodedFrame.IsSeekFrame must be implemented.");
  }

  /**
   * `GetFrame( index, data, length )` - the encoded bytes of one sub-frame.
   *
   * @param {number} _index Sub-frame index.
   * @returns {Uint8Array|null} The bytes, or null when there is no such frame.
   */
  GetFrame(_index)
  {
    throw new Error("IEncodedFrame.GetFrame must be implemented.");
  }

  /**
   * `GetAlphaFrame( data, length )` - the encoded alpha plane, when the track
   * carries one.
   *
   * @returns {Uint8Array|null} The bytes, or null when there is no alpha plane.
   */
  GetAlphaFrame()
  {
    throw new Error("IEncodedFrame.GetAlphaFrame must be implemented.");
  }

  /** `IsSkipFrame` - whether this frame is a decode-only frame. */
  IsSkipFrame()
  {
    throw new Error("IEncodedFrame.IsSkipFrame must be implemented.");
  }
}
