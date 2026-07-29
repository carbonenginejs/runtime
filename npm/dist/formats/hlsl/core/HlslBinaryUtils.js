/**
 * Reinterprets a little-endian uint32 annotation payload as a float32.
 *
 * @param {number} value Unsigned 32-bit integer containing float bits.
 * @returns {number} Float value represented by the same bits.
 */
function cjsUint32ToFloat32(value) {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, true);
  return view.getFloat32(0, true);
}

export { cjsUint32ToFloat32 };
//# sourceMappingURL=HlslBinaryUtils.js.map
