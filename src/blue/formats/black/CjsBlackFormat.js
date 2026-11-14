import { CjsFormat } from "../../../resource/format/CjsFormat.js";
import { toJsonAcyclic } from "../../../resource/format/jsonPolicies.js";
import { CjsSchema } from "#schema";
import { YamlReader } from "../yaml/YamlReader.js";
import { BlackReader } from "./BlackReader.js";

/** The format's id, extension, magic and version (BlackReader.cpp:53, 123). */
const FORMAT_ID = "black";
const EXTENSION = ".black";
const FOURCC = 0xb1acf11e;
const VERSION = 1;

const OUTPUT_JSON = "json";
const OUTPUT_PAYLOAD = "payload";
const OUTPUT_RUNTIME = "runtime";
const OUTPUTS = new Set([ OUTPUT_JSON, OUTPUT_PAYLOAD, OUTPUT_RUNTIME ]);

/**
 * What GetValues writes for the payload and json outputs: the persisted members, every object's class, and shared
 * objects as `_id`/`_ref`. A values consumer (SOF's values fragments) needs the class on every identified object.
 */
const VALUES_OPTIONS = Object.freeze({ refs: true, forceTypeTags: true, persistOnly: true });

/**
 * CarbonEngineJS's Black format profile. Every read goes through BlackReader,
 * Carbon's reader, which builds the registered Blue classes the file names and
 * asks only Blue's class registry for them, so a class Blue lacks fails the read.
 * The payload and json outputs are those objects' values (GetValues), for callers
 * that want plain data; `inspect` reports the header and string tables.
 *
 * The older reader that decoded plain data without building objects is in
 * blue/dropped.
 */
export class CjsBlackFormat extends CjsFormat
{
    static className = "CjsBlackFormat";

    /** The default output: "json", "payload" or "runtime". */
    _emit = OUTPUT_JSON;

    /**
     * @param {{emit?: string}} [options] The default output.
     */
    constructor(options = {})
    {
        super();
        this.SetConfiguration(options);
    }

    /**
     * Sets the default output.
     *
     * @param {{emit?: string}} [options] Format values.
     * @returns {CjsBlackFormat} This format.
     */
    SetConfiguration(options = {})
    {
        this._emit = CjsBlackFormat._normalizeOptions(options, this._emit).emit;
        return this;
    }

    /**
     * The format values, with per-call ones applied.
     *
     * @param {{emit?: string}} [options] Per-call values.
     * @returns {{emit: string}} The values.
     */
    GetConfiguration(options = {})
    {
        return CjsBlackFormat._normalizeOptions(options, this._emit);
    }

    /** Reads with the default output. */
    Read(input, options = {})
    {
        return CjsBlackFormat.read(input, this.GetConfiguration(options));
    }

    /** Reads runtime objects. */
    ReadRuntime(input, options = {})
    {
        return CjsBlackFormat.readRuntime(input, this.GetConfiguration(options));
    }

    /** Reads the payload: the objects' values. */
    ReadPayload(input, options = {})
    {
        return CjsBlackFormat.readPayload(input, this.GetConfiguration(options));
    }

    /** Reports the header and string tables. */
    Inspect(input, options = {})
    {
        return CjsBlackFormat.inspect(input, this.GetConfiguration(options));
    }

    /**
     * Converts format output to JSON-compatible data.
     *
     * @param {any} value Format output.
     * @returns {any} Plain JSON-compatible data.
     */
    ToJSON(value)
    {
        return CjsBlackFormat.toJSON(value);
    }

    /**
     * One-shot read with the requested output.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Black bytes.
     * @param {{emit?: string}} [options] Format values.
     * @returns {object} The runtime result, or the payload (json: as JSON-compatible data).
     */
    static read(input, options = {})
    {
        const { emit } = CjsBlackFormat._normalizeOptions(options, OUTPUT_JSON);
        if (emit === OUTPUT_RUNTIME) return CjsBlackFormat.readRuntime(input);
        const payload = CjsBlackFormat.readPayload(input);
        return emit === OUTPUT_JSON ? CjsBlackFormat.toJSON(payload) : payload;
    }

    /**
     * One-shot runtime read.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Black bytes.
     * @param {{emit?: string}} [options] Format values.
     * @returns {{root: object, format: {id: string, version: number}, reports: object[]}} The root object.
     */
    static readRuntime(input, options = {})
    {
        CjsBlackFormat._normalizeOptions(options, OUTPUT_RUNTIME);
        const reader = CjsBlackFormat.createObjectBuilder(input);
        const root = reader.CreateObject(0);
        if (root === null) throw new TypeError(`black: ${reader.GetErrorMessage() || "Black root object is null"}`);
        return { root, format: { id: FORMAT_ID, version: VERSION }, reports: [] };
    }

    /**
     * The object builder for one file: a caching BlackReader whose `CreateObject()`
     * builds a new graph each call, as Carbon's resource manager keeps a BlackReader
     * per file (BlueResMan.cpp:722-773).
     *
     * @param {ArrayBuffer|ArrayBufferView} input Black bytes.
     * @param {{emit?: string}} [options] Format values.
     * @param {string} [fileName] The file's path, for messages.
     * @returns {BlackReader} The builder.
     * @throws {Error} When the bytes are not a Black file BlackReader reads.
     */
    static createObjectBuilder(input, options = {}, fileName = "")
    {
        CjsBlackFormat._normalizeOptions(options, OUTPUT_RUNTIME);
        const reader = new BlackReader();
        reader.SetFileName(fileName);
        if (!reader.ReadForCachingFromStream(CjsBlackFormat._view(input)))
        {
            throw new Error(`${fileName || "black"}: ${reader.GetErrorMessage() || "not a Black object file"}`);
        }
        return reader;
    }

    /**
     * One-shot payload read: the root object's values, with each object's class
     * and shared objects as `_id`/`_ref`.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Black bytes.
     * @param {{emit?: string}} [options] Format values.
     * @returns {{comments: object[], object: object}} The payload.
     */
    static readPayload(input, options = {})
    {
        CjsBlackFormat._normalizeOptions(options, OUTPUT_PAYLOAD);
        const { root } = CjsBlackFormat.readRuntime(input);
        return { comments: [], object: CjsSchema.getValues(root, {}, VALUES_OPTIONS) };
    }

    /**
     * The header and string tables, without building an object.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Black bytes.
     * @param {{emit?: string}} [options] Format values.
     * @returns {{format: {id: string, version: number}, byteLength: number, dataOffset: number, strings: string[], wideStrings: string[]}} The summary.
     */
    static inspect(input, options = {})
    {
        CjsBlackFormat._normalizeOptions(options, OUTPUT_JSON);
        const view = CjsBlackFormat._view(input);
        const reader = CjsBlackFormat.createObjectBuilder(view);
        return {
            format: { id: FORMAT_ID, version: VERSION },
            byteLength: view.byteLength,
            dataOffset: reader._dataStart,
            strings: [ ...reader._strings ],
            wideStrings: [ ...reader._wstrings ]
        };
    }

    /**
     * JSON-compatible conversion.
     *
     * @param {any} value Format output.
     * @returns {any} Plain JSON-compatible data.
     */
    static toJSON(value)
    {
        return toJsonAcyclic(value, "Reader");
    }

    /**
     * Whether the bytes start with Black's magic. Magic selects the Black reader; version and body failures
     * remain that reader's errors and are never reinterpreted as Red/YAML.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Candidate bytes.
     * @returns {boolean} True when the little-endian Black magic is present.
     */
    static probeSupport(input)
    {
        if (!(input instanceof ArrayBuffer) && !ArrayBuffer.isView(input)) return false;
        const view = input instanceof ArrayBuffer ? new DataView(input) : new DataView(input.buffer, input.byteOffset, input.byteLength);
        return view.byteLength >= 4 && view.getUint32(0, true) === FOURCC;
    }

    static id = "CjsBlackFormat";

    static extensions = [ EXTENSION ];

    static fourCC = FOURCC;

    static version = VERSION;

    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true },
        payload: { decoded: true },
        runtime: { decoded: true }
    });

    /**
     * The builder for one object file: Carbon keeps a reader per file and builds a
     * new object from it on every LoadObject (BlueResMan.cpp:722-773). The reader
     * follows the bytes, not the extension: a valid Black header gets a caching
     * BlackReader, and anything else is read as YAML by a caching YamlReader
     * (BlueResMan.cpp:806-840). A .red path normally arrives as compiled Black
     * bytes, since the file system swaps .red for .black (BlueFileUtil.cpp:374-387).
     *
     * @adapted a reader that fails to cache throws with its message, where Carbon logs it and loads nothing.
     * @param {Uint8Array|ArrayBuffer} bytes Object file bytes, Black or YAML.
     * @param {object} context Loading context used for the diagnostic path.
     * @returns {object} A builder that creates a fresh object for each caller.
     */
    static createBlackObjectBuilder(bytes, context)
    {
        const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); // alloc: byte view
        if (CjsBlackFormat.probeSupport(view)) return CjsBlackFormat.createObjectBuilder(view, {}, context?.path ?? "");
        let offset = 0;
        const reader = new YamlReader();
        reader.SetFileName(context?.path ?? "");
        const cached = reader.ReadForCachingFromStream({
            Read(buffer, size)
            {
                const count = Math.min(size, view.length - offset);
                buffer.set(view.subarray(offset, offset + count));
                offset += count;
                return count;
            }
        });
        if (!cached) throw new Error(`${context?.path ?? "object"}: ${reader.GetErrorMessage() || "not a Black or YAML object file"}`);
        return reader;
    }

    /**
     * The format values: only the output is a choice. The decoding options of the
     * dropped plain-data reader (schemas, source shapes, payload field names,
     * output classes) have no meaning for BlackReader and are refused.
     *
     * @param {object} options Values to apply.
     * @param {string} emit The output when none is given.
     * @returns {{emit: string}} The values.
     * @throws {TypeError} For an unknown output or a retired option.
     */
    static _normalizeOptions(options, emit)
    {
        if (options === null || options === undefined) return { emit };
        if (typeof options !== "object") throw new TypeError("CjsBlackFormat options must be an object.");
        for (const key of Object.keys(options))
        {
            if (key !== "emit") throw new TypeError(`CjsBlackFormat: option "${key}" belonged to the dropped plain-data reader; BlackReader reads the registered classes (blue/dropped/README.md).`);
        }
        const value = options.emit ?? emit;
        if (!OUTPUTS.has(value)) throw new TypeError(`CjsBlackFormat: unknown output "${value}".`);
        return { emit: value };
    }

    /**
     * A byte view over the input.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Black bytes.
     * @returns {Uint8Array} The view.
     * @throws {TypeError} When the input is not bytes.
     */
    static _view(input)
    {
        if (input instanceof Uint8Array) return input;
        if (input instanceof ArrayBuffer) return new Uint8Array(input);
        if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        throw new TypeError("CjsBlackFormat reads bytes: an ArrayBuffer or a view of one.");
    }
}
