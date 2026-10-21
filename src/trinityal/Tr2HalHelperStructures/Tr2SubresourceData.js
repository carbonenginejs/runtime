// Source: trinity/trinityal/Tr2HalHelperStructures.h:20-25
import { CjsSchema, type } from "#schema";
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
   * because JavaScript has no pointer to hand a backend instead. Carbon leaves it
   * unset (`Tr2HalHelperStructures.h:22`).
   */
  sysMem = null;

  /** Size in bytes of one line of pixels. Carbon leaves it unset (`Tr2HalHelperStructures.h:23`). */
  sysMemPitch = 0;

  /**
   * Size in bytes of the entire mip level.
   *
   * CANNOT BE ZERO, says Carbon's own comment on the field. It is not defaulted
   * away or validated here: the donor states the requirement and leaves the
   * caller to meet it, and a zero reaching a backend is the caller's bug to see.
   * Carbon leaves it unset (`Tr2HalHelperStructures.h:24`).
   */
  sysMemSlicePitch = 0;

  /**
   * @param {ArrayBufferView|null} [sysMem] The pixels for this mip.
   * @param {number} [sysMemPitch] Bytes per line.
   * @param {number} [sysMemSlicePitch] Bytes for the whole mip level.
   */
  constructor(sysMem = null, sysMemPitch = 0, sysMemSlicePitch = 0)
  {
    this.sysMem = sysMem;
    this.sysMemPitch = sysMemPitch;
    this.sysMemSlicePitch = sysMemSlicePitch;
  }
}

CjsSchema.decorateField(Tr2SubresourceData, "sysMem", type.unknown);
CjsSchema.decorateField(Tr2SubresourceData, "sysMemPitch", type.uint32);
CjsSchema.decorateField(Tr2SubresourceData, "sysMemSlicePitch", type.uint32);
CjsSchema.meta.carbon("Tr2SubresourceData")(Tr2SubresourceData);
