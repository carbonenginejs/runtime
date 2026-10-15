// Source: trinity/trinityal/Tr2HalHelperStructures.h
import { CjsSchema, type, blue, meta } from "#schema";
// Source: trinity/trinityal/Tr2HalHelperStructures.cpp
//
// ONE FOLDER PER DONOR HEADER. Carbon declares six types in this header, and a
// C++ header is an include unit rather than a class container. Splitting them one
// per file keeps every class findable by its own name without inventing anything:
// the folder still names the donor, so each file has something to be diffed
// against. It also makes an unported sibling visible as a missing FILE, which is
// how two of these were found absent.

/** Carbon's "not set" for every box coordinate: `0xffffffff`. */
const UNSET = 0xffffffff;

/**
 * A box within a texture, in pixels.
 */
export class Tr2TextureCoordBox
{
  /** @type {number} */
  left = UNSET;

  /** @type {number} */
  top = UNSET;

  /** @type {number} */
  front = UNSET;

  /** @type {number} */
  right = UNSET;

  /** @type {number} */
  bottom = UNSET;

  /** @type {number} */
  back = UNSET;

  /**
   * Width of the box.
   *
   * @returns {number} Right minus left.
   */
  GetWidth()
  {
    return this.right - this.left;
  }

  /**
   * Height of the box.
   *
   * @returns {number} Bottom minus top.
   */
  GetHeight()
  {
    return this.bottom - this.top;
  }

  /**
   * Depth of the box.
   *
   * @returns {number} Back minus front.
   */
  GetDepth()
  {
    return this.back - this.front;
  }

  /**
   * Whether two boxes cover the same region.
   *
   * @param {Tr2TextureCoordBox} other The box to compare with.
   * @returns {boolean} True when every coordinate matches.
   */
  Equals(other)
  {
    return this.left === other.left &&
      this.top === other.top &&
      this.front === other.front &&
      this.right === other.right &&
      this.bottom === other.bottom &&
      this.back === other.back;
  }
}

CjsSchema.decorateField(Tr2TextureCoordBox, "left", type.uint32);
CjsSchema.decorateField(Tr2TextureCoordBox, "top", type.uint32);
CjsSchema.decorateField(Tr2TextureCoordBox, "front", type.uint32);
CjsSchema.decorateField(Tr2TextureCoordBox, "right", type.uint32);
CjsSchema.decorateField(Tr2TextureCoordBox, "bottom", type.uint32);
CjsSchema.decorateField(Tr2TextureCoordBox, "back", type.uint32);
CjsSchema.decorateMethod(Tr2TextureCoordBox, "GetWidth", blue.method);
CjsSchema.decorateMethod(Tr2TextureCoordBox, "GetHeight", blue.method);
CjsSchema.decorateMethod(Tr2TextureCoordBox, "GetDepth", blue.method);
CjsSchema.decorateMethod(Tr2TextureCoordBox, "Equals", blue.method, meta.renamed("operator=="));
CjsSchema.blue.define(Tr2TextureCoordBox, { className: "Tr2TextureCoordBox" });
