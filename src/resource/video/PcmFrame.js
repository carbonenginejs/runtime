// Source: videoplayer/Metadata.h:164-185
//
// One decoded audio frame. As with VideoFrame, Carbon allocates the samples
// immediately after the struct; a typed array is that allocation here.

/** `PcmFrame` - decoded interleaved PCM an audio sink consumes. */
export class PcmFrame
{
  /** Presentation time, in the media clock's units. */
  timeStamp = 0;

  /** Samples per channel. */
  samples = 0;

  channels = 0;

  /** `int16_t* data`: channels * samples interleaved samples. */
  data = null;

  /**
   * @param {number} [timeStamp] Presentation time.
   * @param {number} [samples] Samples per channel.
   * @param {number} [channels] Channel count.
   * @param {Int16Array|null} [data] Interleaved samples.
   */
  constructor(timeStamp = 0, samples = 0, channels = 0, data = null)
  {
    this.timeStamp = timeStamp;
    this.samples = samples;
    this.channels = channels;
    this.data = data;
  }
}
