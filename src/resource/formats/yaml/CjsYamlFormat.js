import { CjsSchema } from "#schema/CjsSchema";

import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsYamlReader } from "./core/CjsYamlReader.js";
import {
    DEFAULT_VALUES,
    OUTPUT_DOCUMENT,
    OUTPUT_JSON,
    OUTPUT_PAYLOAD,
    OUTPUT_RAW,
    TAG_HANDLE,
    TAG_PRESERVE,
    TAG_REJECT,
    normalizeValues,
    toJsonGraph
} from "./core/helpers.js";

const FORMAT_NAME = "CjsYamlFormat";

/**
 * YAML format profile that parses YAML text or strict UTF-8 bytes into payload,
 * JSON-graph, raw, or document output with configurable tag policies, alias
 * limits, and identity/reference markers. With intAsBigInt enabled, raw output
 * retains integer scalars as bigint; payload/JSON output uses decimal strings.
 * The default remains Number conversion for compatibility.
 */
export class CjsYamlFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsYamlFormat";

    _values = DEFAULT_VALUES;

    /**
     * Creates a CjsYamlFormat with caller-provided reader configuration.
     *
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Applies caller-provided options after normalizing supported fields for the
     * YAML document reader.
     *
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {CjsYamlFormat} This format.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, options, FORMAT_NAME);
        return this;
    }

    /**
     * Returns a snapshot of the normalized reader options for the YAML document
     * reader.
     *
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {import("./core/helpers.js").CjsYamlValues} The normalized values.
     */
    GetValues(options = {})
    {
        return normalizeValues(this._values, options, FORMAT_NAME);
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the YAML document reader.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The output selected by emit: payload, raw value or document.
     */
    Read(input, options = {})
    {
        return CjsYamlFormat.read(input, this.GetValues(options));
    }

    /**
     * Reads payload from the current YAML document reader.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The JSON-safe payload graph.
     */
    ReadPayload(input, options = {})
    {
        return CjsYamlFormat.readPayload(input, this.GetValues(options));
    }

    /**
     * Reads raw from the current YAML document reader.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The converted value, with shared nodes kept as shared references.
     */
    ReadRaw(input, options = {})
    {
        return CjsYamlFormat.readRaw(input, this.GetValues(options));
    }

    /**
     * Reads document from the current YAML document reader.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {import("./core/helpers.js").CjsYamlDocument} The inventory and converted value.
     */
    ReadDocument(input, options = {})
    {
        return CjsYamlFormat.readDocument(input, this.GetValues(options));
    }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the YAML document reader.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {import("./core/helpers.js").CjsYamlInspection} The structural metadata.
     */
    Inspect(input, options = {})
    {
        return CjsYamlFormat.inspect(input, this.GetValues(options));
    }

    /**
     * Converts the current decoded payload into a JSON-safe representation for
     * the YAML document reader.
     *
     * @param {*} value Converted YAML value of any shape.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The JSON-safe graph.
     */
    ToJSON(value, options = {})
    {
        return toJsonGraph(value, this.GetValues(options));
    }

    /**
     * Provides the one-shot YAML payload reader entry point.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The output selected by emit: payload, raw value or document.
     */
    static read(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        if (values.emit === OUTPUT_RAW) return new CjsYamlReader(input, values).ReadRaw();
        if (values.emit === OUTPUT_DOCUMENT) return new CjsYamlReader(input, values).ReadDocument();
        return new CjsYamlReader(input, values).ReadPayload();
    }

    /**
     * Provides the one-shot YAML normalized-payload reader entry point.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The JSON-safe payload graph.
     */
    static readPayload(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        return new CjsYamlReader(input, values).ReadPayload();
    }

    /**
     * Provides the one-shot YAML raw-value reader entry point.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The converted value, with shared nodes kept as shared references.
     */
    static readRaw(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        return new CjsYamlReader(input, values).ReadRaw();
    }

    /**
     * Provides the one-shot YAML document reader entry point.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {import("./core/helpers.js").CjsYamlDocument} The inventory and converted value.
     */
    static readDocument(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        return new CjsYamlReader(input, values).ReadDocument();
    }

    /**
     * Provides the one-shot YAML metadata inspection entry point.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {import("./core/helpers.js").CjsYamlInspection} The structural metadata.
     */
    static inspect(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        return new CjsYamlReader(input, values).Inspect();
    }

    /**
     * Provides the one-shot YAML JSON conversion entry point.
     *
     * @param {*} value Converted YAML value of any shape.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The JSON-safe graph.
     */
    static toJSON(value, options = {})
    {
        return toJsonGraph(value, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    static id = "CjsYamlFormat";

    static extensions = [ ".yaml", ".yml" ];

    static outputs = CjsFormat.defineOutputs({
        json: { decoded: true },
        payload: { default: true, decoded: true },
        raw: { role: "debug", decoded: true },
        document: { role: "debug", decoded: true }
    });
}

export default CjsYamlFormat;

CjsSchema.meta.define(CjsYamlFormat, { className: "CjsYamlFormat" });
