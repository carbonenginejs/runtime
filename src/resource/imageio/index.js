// Carbon's imageio library as the resource layer exposes it: the CPU image
// containers (which live in global/imageio because the abstraction layer shares
// them) re-exported here, plus ImageIO with its own handler table, which the
// host fills through ImageIO.registerImageHandler.
//
// HostBitmap needs no registration here: its define registers it with
// be.classes by name, so trinityal can still build one by name.
export * from "#imageio";
export * from "./ImageIO.js";
