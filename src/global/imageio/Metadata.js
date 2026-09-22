// Source: imageio/include/Tr2ImageHandler.h (Metadata, MetadataStrings)
import { Cutout } from "./Cutout.js";

/** `ImageIO::Metadata` - what an image file carries besides its pixels. */
export class Metadata
{
  /** cutout - the PNG cutout rectangle; the whole image by default. */
  cutout = new Cutout();

  /** metadata - `MetadataStrings`: key/value pairs from the CCP-META trailer. */
  metadata = [];
}
