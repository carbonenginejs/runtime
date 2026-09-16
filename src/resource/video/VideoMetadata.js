// Source: videoplayer/Metadata.h:11-29
//
// Video stream metadata. Carbon's constructor defaults every field, so a
// default instance is `OTHER, 0, 0, false`.

/** `VideoMetadata` - what a container parser reports about the video track. */
export class VideoMetadata
{
  /** `VideoMetadata::Codec` (Metadata.h:13-18). */
  static Codec = Object.freeze({
    OTHER: 0,
    VP8: 1,
    VP9: 2
  });

  codec = VideoMetadata.Codec.OTHER;

  width = 0;

  height = 0;

  hasAlpha = false;

  /**
   * @param {number} [codec] A `VideoMetadata.Codec` member.
   * @param {number} [width] Frame width in pixels.
   * @param {number} [height] Frame height in pixels.
   * @param {boolean} [hasAlpha] Whether the track carries alpha.
   */
  constructor(codec = VideoMetadata.Codec.OTHER, width = 0, height = 0, hasAlpha = false)
  {
    this.codec = codec;
    this.width = width;
    this.height = height;
    this.hasAlpha = hasAlpha;
  }
}
