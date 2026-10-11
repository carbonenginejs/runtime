// Source: fsd/BinaryLoaderHelper.h

/** Whole-buffer DataViews, so repeated reads do not allocate a view each. */
const views = new WeakMap();

/**
 * Byte helpers shared by Carbon's legacy FSD loader (BinaryLoaderHelper.h).
 *
 * Carbon addresses the data as `const char*` plus a byte offset and reads
 * values with `reinterpret_cast`. Here the data is a `Uint8Array` and values
 * are read through a `DataView`, little-endian, which is what the cast reads
 * on every platform Carbon builds for. A read beyond the buffer throws
 * RangeError where the C++ read is undefined behaviour.
 */
export class BinaryLoaderHelper
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "BinaryLoaderHelper";

    /**
     * Copy `dataSize` bytes from `offset` (BinaryLoaderHelper.h:10-14).
     *
     * Carbon copies into a `std::string`; this copies into a new buffer, so
     * reads from the copy cannot reach the bytes around it.
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {number} dataSize Bytes to copy.
     * @returns {Uint8Array} The copy.
     */
    static getSubsetOfData(data, offset, dataSize)
    {
        return data.slice(offset, offset + dataSize);
    }

    /**
     * Read a little-endian `uint32_t` (BinaryLoaderHelper.h:16-20).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @returns {number} The value.
     * @throws {RangeError} When the read leaves the buffer.
     */
    static getUnsignedIntFromData(data, offset)
    {
        return BinaryLoaderHelper.getDataView(data).getUint32(data.byteOffset + offset, true);
    }

    /**
     * Return a DataView over the whole buffer behind `data`. Callers add
     * `data.byteOffset` to their offsets.
     *
     * Adapted: JavaScript has no `reinterpret_cast`; a DataView is how it
     * reads typed values from bytes. Not in Carbon.
     *
     * @param {Uint8Array} data Source bytes.
     * @returns {DataView} A view of `data.buffer`.
     */
    static getDataView(data)
    {
        let view = views.get(data.buffer);

        if (!view)
        {
            view = new DataView(data.buffer);
            views.set(data.buffer, view);
        }

        return view;
    }
}

export default BinaryLoaderHelper;
