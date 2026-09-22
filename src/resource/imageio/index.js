// Carbon's imageio library as the resource layer exposes it: the CPU image
// containers (which live in global/imageio because the abstraction layer shares
// them) re-exported here, plus the handler registry that reaches the image
// formats.
//
// HostBitmap is registered with blue.classes, so a layer that may not import
// the resource layer - trinityal - can still build one by name.
import { blue } from "#blue";
import { HostBitmap } from "#imageio";

export * from "#imageio";
export * from "./ImageIO.js";

blue.classes.RegisterClasses([
  { name: "HostBitmap", type: HostBitmap }
]);
