import { CjsSchema } from "#schema/CjsSchema";

/**
 * Dispatches caller-supplied bytes to an explicitly registered FSD reader.
 *
 * This class deliberately performs no filesystem, network, provider, build,
 * or resource-index work.
 */
export class CjsFsd64Reader
{
    _readers = new Map();

    /**
     * Registers one approved file-specific reader by logical path.
     *
     * @param {string} path Logical resource path; matched case-insensitively with forward slashes.
     * @param {Function|{Read: Function, ReadJSON?: Function}} reader Reader object, or a Read function.
     * @param {object} [options={}] Registration options.
     * @param {boolean} [options.replace] True to replace an existing registration.
     * @returns {CjsFsd64Reader} This registry.
     * @throws {Error} When the path is already registered and replace is not true.
     */
    Register(path, reader, options = {})
    {
        const key = NormalizeReaderKey(path);
        const implementation = NormalizeReader(reader);

        if (this._readers.has(key) && options.replace !== true)
        {
            const error = new Error(`FSD reader is already registered: ${key}`);
            error.code = "CJS_FSD_READER_EXISTS";
            error.path = key;
            throw error;
        }

        this._readers.set(key, implementation);
        return this;
    }

    /**
     * Removes a reader without affecting any caller-owned bytes or data.
     *
     * @param {string} path Logical resource path.
     * @returns {boolean} True when a reader was removed.
     */
    Remove(path)
    {
        return this._readers.delete(NormalizeReaderKey(path));
    }

    /**
     * Reports whether an exact file-specific reader is registered.
     *
     * @param {string} path Logical resource path.
     * @returns {boolean} True when a reader is registered for the path.
     */
    Has(path)
    {
        return this._readers.has(NormalizeReaderKey(path));
    }

    /**
     * Lists registered logical paths in deterministic order.
     *
     * @returns {Array<string>} Normalized paths, sorted.
     */
    List()
    {
        return [ ...this._readers.keys() ].sort();
    }

    /**
     * Reads caller-supplied bytes with the reader registered for options.path.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
     * @param {object} [options={}] Read options, passed to the reader with the normalized path.
     * @param {string} options.path Logical resource path of the registered reader.
     * @returns {Promise<unknown>} The reader's result.
     * @throws {Error} When no reader is registered for the path.
     */
    async Read(input, options = {})
    {
        const path = NormalizeReaderKey(options.path);
        const reader = this._readers.get(path);

        if (!reader)
        {
            const error = new Error(`No FSD reader is registered for: ${path}`);
            error.code = "CJS_FSD_READER_NOT_FOUND";
            error.path = path;
            throw error;
        }

        const bytes = NormalizeBytes(input);
        return reader.Read(bytes, {
            ...options,
            path,
        });
    }

    /**
     * Reads caller-supplied bytes as a plain JSON-compatible value through the
     * schema-backed reader registered for options.path.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
     * @param {object} [options={}] Read options, passed to the reader with the normalized path.
     * @param {string} options.path Logical resource path of the registered reader.
     * @returns {Promise<unknown>} The reader's plain JSON-compatible result.
     * @throws {Error} When no reader is registered or it has no ReadJSON.
     */
    async ReadJSON(input, options = {})
    {
        const path = NormalizeReaderKey(options.path);
        const reader = this._readers.get(path);

        if (!reader)
        {
            const error = new Error(`No FSD reader is registered for: ${path}`);
            error.code = "CJS_FSD_READER_NOT_FOUND";
            error.path = path;
            throw error;
        }

        // Host feature check: the FSD reader is supplied by the host application.
        if (typeof reader.ReadJSON !== "function")
        {
            const error = new Error(`FSD reader does not expose JSON decoding: ${path}`);
            error.code = "CJS_FSD_JSON_READER_INVALID";
            error.path = path;
            throw error;
        }

        const bytes = NormalizeBytes(input);
        return reader.ReadJSON(bytes, {
            ...options,
            path,
        });
    }
}

/**
 * Produces a stable registry key without importing resource-source policy.
 *
 * @param {unknown} value Logical resource path.
 * @returns {string} Trimmed, forward-slashed, lowercase key.
 * @throws {TypeError} When value is not a non-empty string.
 */
function NormalizeReaderKey(value)
{
    if (typeof value !== "string" || value.trim() === "")
    {
        const error = new TypeError("FSD reader path must be a non-empty string.");
        error.code = "CJS_FSD_PATH_INVALID";
        throw error;
    }

    return value.trim().replaceAll("\\", "/").toLowerCase();
}

/**
 * Accepts object readers and function shorthand while storing one contract.
 *
 * @param {unknown} value Reader object or Read function.
 * @returns {{Read: Function, ReadJSON?: Function}} The reader object.
 * @throws {TypeError} When value has no Read function.
 */
function NormalizeReader(value)
{
    if (typeof value === "function")
    {
        return { Read: value };
    }

    // Host feature check: the FSD reader is supplied by the host application.
    if (!value || typeof value.Read !== "function")
    {
        const error = new TypeError("FSD reader must be a function or expose Read(bytes, context).");
        error.code = "CJS_FSD_READER_INVALID";
        throw error;
    }

    return value;
}

/**
 * Creates a byte view over accepted binary inputs without copying or mutation.
 *
 * @param {ArrayBuffer|ArrayBufferView} input Caller bytes.
 * @returns {Uint8Array} A view over the same storage.
 * @throws {TypeError} When input is neither an ArrayBuffer nor a view.
 */
function NormalizeBytes(input)
{
    if (input instanceof ArrayBuffer)
    {
        return new Uint8Array(input);
    }

    if (ArrayBuffer.isView(input))
    {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    const error = new TypeError("FSD input must be an ArrayBuffer or an ArrayBuffer view.");
    error.code = "CJS_FSD_INPUT_INVALID";
    throw error;
}

export default CjsFsd64Reader;

CjsSchema.meta.define(CjsFsd64Reader, { className: "CjsFsd64Reader" });
