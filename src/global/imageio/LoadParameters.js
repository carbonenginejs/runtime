// Source: imageio/include/Tr2ImageHandler.h (LoadParameters)
// Source: imageio/Tr2ImageHandler.cpp:156-191
//
// What a caller asks of an image read: which file it is (the extension picks
// the handler), how many top mips to skip, and how many mips at most to keep.
//
// ONE FIELD IS OURS: `requestedFormat`. Carbon never needs it - D3D accepts
// block-compressed data directly - but a browser may refuse a compressed
// format, even one it reports supporting, and merged texture arrays need every
// layer in one format. So a caller can ask for a specific `PixelFormat`, and
// the image format converts after its native read. null asks for the native
// format, which is Carbon's behaviour. See /docs/projects/hostbitmap-port.md.

/** `ImageIO::LoadParameters` - the parameters of one image read. */
export class LoadParameters
{

  /** m_filename - used for picking the handler and for logging. */
  filename = "";

  /** m_mipLevelSkipCount - top mip levels to skip. */
  mipLevelSkipCount = 0;

  /** m_mipLevelMaxCount - the most mip levels to keep. */
  mipLevelMaxCount = 0xffffffff;

  /** Not Carbon: the `PixelFormat` the caller needs, or null for the native format. */
  requestedFormat = null;

  /**
   * @param {string} filename File name; its extension picks the handler.
   * @param {number} [mipLevelSkipCount=0] Top mip levels to skip.
   * @param {number} [mipLevelMaxCount=0xffffffff] Most mip levels to keep.
   * @param {number|null} [requestedFormat=null] Not Carbon: the `PixelFormat` wanted, or null.
   */
  constructor(filename, mipLevelSkipCount = 0, mipLevelMaxCount = 0xffffffff, requestedFormat = null)
  {
    this.filename = filename;
    this.mipLevelSkipCount = mipLevelSkipCount;
    this.mipLevelMaxCount = mipLevelMaxCount;
    this.requestedFormat = requestedFormat;
  }

  /**
   * Which mips to skip and how many to keep (Tr2ImageHandler.cpp:165-191).
   * Only images larger than 8x8 skip; a chain of three or fewer mips cannot be
   * skipped below three; a mip count of 0 (driver-generated mips) skips none.
   *
   * adapted: Carbon writes both through references, reading `mipCount` in;
   * JavaScript takes `mipCount` and returns both.
   *
   * @param {number} width Width of mip 0.
   * @param {number} height Height of mip 0.
   * @param {number} mipCount The source's mip count.
   * @returns {{skipCount: number, mipCount: number}} The range.
   */
  GetMipLevelRange(width, height, mipCount)
  {
    let skipCount = 0;

    if (width > 8 && height > 8)
    {
      if (mipCount > this.mipLevelSkipCount)
      {
        skipCount = this.mipLevelSkipCount;
      }
      else if (mipCount)
      {
        // limit total mipmap count to three!
        skipCount = mipCount >= 3 ? mipCount - 3 : 0;
      }
    }

    mipCount -= skipCount;

    if (mipCount > this.mipLevelMaxCount)
    {
      skipCount += mipCount - this.mipLevelMaxCount;
      mipCount = this.mipLevelMaxCount;
    }

    return { skipCount, mipCount };
  }

}
