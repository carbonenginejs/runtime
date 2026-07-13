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

export class CjsYamlFormat
{
    #values = DEFAULT_VALUES;

    constructor(options = {})
    {
        this.SetValues(options);
    }

    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, options, FORMAT_NAME);
        return this;
    }

    GetValues(options = {})
    {
        return normalizeValues(this.#values, options, FORMAT_NAME);
    }

    Read(input, options = {})
    {
        return CjsYamlFormat.read(input, this.GetValues(options));
    }

    ReadPayload(input, options = {})
    {
        return CjsYamlFormat.readPayload(input, this.GetValues(options));
    }

    ReadRaw(input, options = {})
    {
        return CjsYamlFormat.readRaw(input, this.GetValues(options));
    }

    ReadDocument(input, options = {})
    {
        return CjsYamlFormat.readDocument(input, this.GetValues(options));
    }

    Inspect(input, options = {})
    {
        return CjsYamlFormat.inspect(input, this.GetValues(options));
    }

    ToJSON(value, options = {})
    {
        return toJsonGraph(value, this.GetValues(options));
    }

    static read(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        if (values.emit === OUTPUT_RAW) return new CjsYamlReader(input, values).ReadRaw();
        if (values.emit === OUTPUT_DOCUMENT) return new CjsYamlReader(input, values).ReadDocument();
        return new CjsYamlReader(input, values).ReadPayload();
    }

    static readPayload(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        return new CjsYamlReader(input, values).ReadPayload();
    }

    static readRaw(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        return new CjsYamlReader(input, values).ReadRaw();
    }

    static readDocument(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        return new CjsYamlReader(input, values).ReadDocument();
    }

    static inspect(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME);
        return new CjsYamlReader(input, values).Inspect();
    }

    static toJSON(value, options = {})
    {
        return toJsonGraph(value, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    static OUTPUT_JSON = OUTPUT_JSON;
    static OUTPUT_PAYLOAD = OUTPUT_PAYLOAD;
    static OUTPUT_RAW = OUTPUT_RAW;
    static OUTPUT_DOCUMENT = OUTPUT_DOCUMENT;
    static TAG_PRESERVE = TAG_PRESERVE;
    static TAG_REJECT = TAG_REJECT;
    static TAG_HANDLE = TAG_HANDLE;
    static id = "yaml";
    static extensions = Object.freeze([ ".yaml", ".yml" ]);
    static type = Object.freeze([ "data" ]);
    static mediaTypes = Object.freeze([ "data" ]);
    static inputTypes = Object.freeze([ "yaml" ]);
    static outputTypes = Object.freeze([ OUTPUT_JSON, OUTPUT_PAYLOAD ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_RAW, OUTPUT_DOCUMENT ]);
}

export default CjsYamlFormat;
