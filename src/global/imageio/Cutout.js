// Source: imageio/include/Tr2ImageHandler.h (Cutout)

/** `ImageIO::Cutout` - the normalized sub-rectangle a PNG can declare. */
export class Cutout
{
  /** x - left edge, 0..1. */
  x = 0;

  /** y - top edge, 0..1. */
  y = 0;

  /** width - 0..1. */
  width = 1;

  /** height - 0..1. */
  height = 1;
}
