// Source: videoplayer/Metadata.h:193-221
//
// One decoded frame. Carbon allocates the pixels immediately after the struct
// (`operator new( sz, width, height )`) so the frame and its BGRA bytes are one
// allocation; a typed array is that allocation here.
//
// The name says BGRA and Carbon's comment says YCuCv: the comment is wrong. The
// bytes are what `VideoPlayer::Update` hands to `UpdateSubresource` as a
// four-byte-per-pixel BGRA image (VideoPlayer.cpp:178).

/** `VideoFrame` - a decoded frame, its timestamp, and its average colour. */
export class VideoFrame
{
  width = 0;

  height = 0;

  /** Presentation time, in the media clock's units. */
  timeStamp = 0;

  /** `uint8_t* bgra`: width * height * 4 bytes. */
  bgra = null;

  /** `VideoFrame::Color averageColor` - what the player passes to SetAverageColor. */
  averageColor = { red: 0, green: 0, blue: 0, alpha: 0 };

  /**
   * @param {number} [width] Frame width in pixels.
   * @param {number} [height] Frame height in pixels.
   * @param {number} [timeStamp] Presentation time.
   * @param {Uint8Array|null} [bgra] Pixel bytes.
   */
  constructor(width = 0, height = 0, timeStamp = 0, bgra = null)
  {
    this.width = width;
    this.height = height;
    this.timeStamp = timeStamp;
    this.bgra = bgra;
  }
}
