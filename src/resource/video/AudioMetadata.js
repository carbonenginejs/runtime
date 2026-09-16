// Source: videoplayer/Metadata.h:31-120
//
// Audio stream metadata. Carbon's nested `CodecInitializationData` is a buffer
// holder that copies its bytes on every copy, because it owns a raw
// `uint8_t[]`. A typed array already owns its bytes, so the record is flattened
// to one field here and the copying is the caller's business - the same
// flattening `MetalRenderPassHint` records in the abstraction layer.

/** `AudioMetadata` - what a container parser reports about the audio track. */
export class AudioMetadata
{
  /** `AudioMetadata::Codec` (Metadata.h:33-37). */
  static Codec = Object.freeze({
    OTHER: 0,
    VORBIS: 1
  });

  codec = AudioMetadata.Codec.OTHER;

  channels = 0;

  bps = 0;

  rate = 0;

  /** `CodecInitializationData`: the codec's setup bytes, or null when it needs none. */
  codecInitializationData = null;

  /**
   * @param {number} [codec] An `AudioMetadata.Codec` member.
   * @param {number} [channels] Channel count.
   * @param {number} [bps] Bits per sample.
   * @param {number} [rate] Sample rate in hertz.
   * @param {Uint8Array|null} [codecInitializationData] Codec setup bytes.
   */
  constructor(codec = AudioMetadata.Codec.OTHER, channels = 0, bps = 0, rate = 0, codecInitializationData = null)
  {
    this.codec = codec;
    this.channels = channels;
    this.bps = bps;
    this.rate = rate;
    this.codecInitializationData = codecInitializationData;
  }
}
