// Ports of Carbon's imageio library (E:/carbonengine/imageio): CPU image
// containers shared by the resource layer and the abstraction layer. The
// handlers that read and write files through our format classes live in
// resource/imageio, which re-exports these.
//
// NO DECORATOR SYNTAX IN THIS FOLDER, for the same packaging reason as
// global/blue: declare metadata with CjsSchema.define at the foot of a file.

export * from "./BitmapDimensions.js";
