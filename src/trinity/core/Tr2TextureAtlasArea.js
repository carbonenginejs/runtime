// Source: trinity/trinity/Tr2TextureAtlas.h:15-32
// Hand-maintained port of the plain struct Tr2TextureAtlas allocates its
// rectangles from. Split out of Tr2TextureAtlas.js so the class is findable by
// its own name.

/**
 * One rectangle of an atlas: free, or in use by a texture.
 *
 * Carbon's `struct Tr2TextureAtlasArea` (`Tr2TextureAtlas.h:15-32`). `rect` is a
 * plain `{ left, top, right, bottom }` record because `Tr2Rect` is dropped
 * (`trinity/dropped/README.md`).
 */
export class Tr2TextureAtlasArea
{
  /** Registered name; minification renames classes. */
  static className = "Tr2TextureAtlasArea";

  /** Carbon `Tr2TextureAtlasArea::Type` (`Tr2TextureAtlas.h:17-22`). */
  static Type = {
    FREE: 0,
    IN_USE: 1,
    IN_USE_NO_REF: 2
  };

  /** @type {number} `type`, a `Tr2TextureAtlasArea.Type` value. */
  type = Tr2TextureAtlasArea.Type.FREE;

  /** @type {{left: number, top: number, right: number, bottom: number}} `rect`. */
  rect = { left: 0, top: 0, right: 0, bottom: 0 };

  /**
   * `tex`: Carbon's comment calls it a "weak reference to a texture object";
   * it is a raw non-owning pointer. Here it is the texture's `_selfRef`.
   * @type {WeakRef<import("./Tr2AtlasTexture.js").Tr2AtlasTexture>|null}
   */
  tex = null;

  /**
   * Creates an area. Carbon's `CCP_NEW Tr2TextureAtlasArea` leaves the fields
   * uninitialised and every call site then writes the rect; the arguments do
   * that write here.
   *
   * @param {number} [left] Left edge.
   * @param {number} [top] Top edge.
   * @param {number} [right] Right edge (exclusive).
   * @param {number} [bottom] Bottom edge (exclusive).
   */
  constructor(left = 0, top = 0, right = 0, bottom = 0)
  {
    this.rect.left = left;
    this.rect.top = top;
    this.rect.right = right;
    this.rect.bottom = bottom;
  }
}
