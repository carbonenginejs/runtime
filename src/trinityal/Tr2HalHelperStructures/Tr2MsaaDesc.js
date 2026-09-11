// Source: trinity/trinityal/Tr2HalHelperStructures.h
// Source: trinity/trinityal/Tr2HalHelperStructures.cpp
//
// ONE FOLDER PER DONOR HEADER. Carbon declares six types in this header, and a
// C++ header is an include unit rather than a class container. Splitting them one
// per file keeps every class findable by its own name without inventing anything:
// the folder still names the donor, so each file has something to be diffed
// against. It also makes an unported sibling visible as a missing FILE, which is
// how two of these were found absent.

/**
 * A multisample description.
 */
export class Tr2MsaaDesc
{
  /** Samples per pixel; never below one. */
  samples = 1;

  /** Backend-defined quality level. */
  quality = 0;

  /**
   * @param {number} [samples] Samples per pixel.
   * @param {number} [quality] Quality level.
   */
  constructor(samples = 1, quality = 0)
  {
    this.samples = Math.max(samples, 1);
    this.quality = quality;
  }

  /**
   * Whether two descriptions match.
   *
   * Carbon clamps both sample counts to at least one before comparing, so a
   * zero and a one are the same description.
   *
   * @param {Tr2MsaaDesc} other The description to compare with.
   * @returns {boolean} True when they match.
   */
  Equals(other)
  {
    return Math.max(this.samples, 1) === Math.max(other.samples, 1) && this.quality === other.quality;
  }
}
