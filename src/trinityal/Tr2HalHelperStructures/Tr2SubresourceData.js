// Source: trinity/trinityal/Tr2HalHelperStructures.h:20-25
//
// ONE FOLDER PER DONOR HEADER - see the sibling files for why.
//
// WAS NEVER PORTED, and nothing noticed. Carbon's texture creation takes an array
// of these as its initial data, one per (mip, layer), indexed
// `mip + layer * mipCount` (`Tr2ImageIOHelpers.cpp:104-128`). Our callers were
// already passing objects of exactly this shape as anonymous literals -
// `Tr2ImageIOHelpers.js` builds `{ sysMem, sysMemPitch, sysMemSlicePitch }` - so
// the contract existed with no type to name it, which is precisely what made its
// absence invisible.


/**
 * One mip of one layer: where its pixels are, and how they are laid out.
 */
export class Tr2SubresourceData
{
  /**
   * Carbon's `const void* m_sysMem`. A pointer there; the bytes themselves here,
   * because JavaScript has no pointer to hand a backend instead.
   */
  m_sysMem = null;

  /** Size in bytes of one line of pixels. */
  m_sysMemPitch = 0;

  /**
   * Size in bytes of the entire mip level.
   *
   * CANNOT BE ZERO, says Carbon's own comment on the field. It is not defaulted
   * away or validated here: the donor states the requirement and leaves the
   * caller to meet it, and a zero reaching a backend is the caller's bug to see.
   */
  m_sysMemSlicePitch = 0;

  /**
   * @param {ArrayBufferView|null} [sysMem] The pixels for this mip.
   * @param {number} [sysMemPitch] Bytes per line.
   * @param {number} [sysMemSlicePitch] Bytes for the whole mip level.
   */
  constructor(sysMem = null, sysMemPitch = 0, sysMemSlicePitch = 0)
  {
    this.m_sysMem = sysMem;
    this.m_sysMemPitch = sysMemPitch;
    this.m_sysMemSlicePitch = sysMemSlicePitch;
  }
}
