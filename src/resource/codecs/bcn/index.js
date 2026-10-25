// BC1-BC7 block compression and decompression, apart from any container: the
// DDS format, the texture pipeline and the abstraction layer all reach BC
// through here. `core/` is ours and libsquish's; `carbon/` holds Carbon ports.
export { canDecodeBlockSlice, decodeBlockSlice } from "./core/bcDecode.js";
export { selectCompression } from "./core/compressionPolicy.js";
export { compressBitmap, compressSurface, compressionPixelFormat, getRawDataSize } from "./carbon/dxtCompression.js";
export { BCN_CALLBACK_MODULES, compressBitmapAsync, compressSurfaceAsync } from "./carbon/dxtCompressionAsync.js";
export { bcDecompress } from "./carbon/bcDecompress.js";
