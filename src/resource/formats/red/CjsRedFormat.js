import { parseDocument, isMap, isScalar } from "yaml";
import { CjsSchema } from "#schema/CjsSchema";
import { YamlReader } from "../../../global/blue/YamlReader.js";
import { CjsFormat } from "../../format/CjsFormat.js";

/**
 * Resource adapter for Carbon's YamlReader.
 *
 * Returns a registered Blue object directly. Import the classes required by
 * the document before reading. For values, use CjsSchema.getValues on that
 * object through the Blue values service; Red has no separate payload or raw
 * graph representation. Parsed JavaScript graphs are not Red input.
 */
export class CjsRedFormat extends CjsFormat
{
    static className = "CjsRedFormat";

    /**
     * Read with the profile defaults and per-call native reader settings.
     * Adapted: resource profiles supply bytes or text to the Carbon reader.
     * @param {string|ArrayBuffer|ArrayBufferView} input UTF-8 Red document.
     * @param {object} [options] Per-call settings.
     * @returns {object|null} Constructed Blue object.
     */
    Read(input, options = {})
    {
        return CjsRedFormat.read(input, { ...this.options, ...options });
    }

    /**
     * Construct the document through the canonical Blue class registry.
     * Adapted: decode resource bytes before CreateObjectFromString.
     * @param {string|ArrayBuffer|ArrayBufferView} input UTF-8 Red document.
     * @param {object} [options] Native reader settings.
     * @param {boolean} [options.isStrict=false] Escalate reader warnings.
     * @param {boolean} [options.doInitialize=true] Call mapped IInitialize.
     * @param {string} [options.emit="runtime"] The sole supported output.
     * @returns {object|null} Constructed Blue object.
     */
    static read(input, options = {})
    {
        const values = options || {};
        if (values.emit != null && values.emit !== "runtime")
        {
            throw new TypeError("CjsRedFormat supports only runtime output; export values through CjsSchema.getValues.");
        }

        const text = DecodeText(input);

        const reader = new YamlReader();
        if (values.isStrict !== undefined) reader._isStrict = Boolean(values.isStrict);
        if (values.doInitialize !== undefined) reader.SetDoInitialize(Boolean(values.doInitialize));
        return reader.CreateObjectFromString(text);
    }

    /**
     * Inspect the mandatory first type member without constructing any objects.
     * Adapted: format routing needs a structural probe independent of class
     * registration, initialization and supported member storage.
     * @param {string|ArrayBuffer|ArrayBufferView} input UTF-8 Red document.
     * @returns {{className: string}} The authored root class.
     */
    static inspect(input)
    {
        const document = parseDocument(DecodeText(input), {
            schema: "failsafe", resolveKnownTags: false, uniqueKeys: false
        });
        if (document.errors.length) throw document.errors[0];
        const first = isMap(document.contents) ? document.contents.items[0] : null;
        if (!first || !isScalar(first.key) || first.key.value !== "type"
            || !isScalar(first.value) || typeof first.value.value !== "string" || !first.value.value)
        {
            throw new TypeError("Red requires a root mapping whose first member is type.");
        }
        return { className: first.value.value };
    }

    static id = "CjsRedFormat";

    static extensions = [ ".red" ];

    static outputs = CjsFormat.defineOutputs({
        runtime: { default: true, decoded: true }
    });
}

export default CjsRedFormat;

CjsSchema.meta.define(CjsRedFormat, { className: "CjsRedFormat" });

/**
 * Decode only the byte range supplied by the resource loader.
 * @param {string|ArrayBuffer|ArrayBufferView} input UTF-8 Red document.
 * @returns {string} Scalar source text.
 */
function DecodeText(input)
{
    if (typeof input === "string") return input;
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input))
    {
        return new TextDecoder().decode(input);
    }
    throw new TypeError("CjsRedFormat requires Red text or UTF-8 bytes.");
}
