import { CjsFormatWriteError, CjsFormatReadError } from "../CjsFormatError.js";
import { DETAIL_MAP_ARRAY_NAME } from "../../formats/hlsl/core/detailMapFamily.js";

/**
 * The resource-transform section, shared by every backend's per-pass block.
 *
 * A resource transform is a recipe for building one backend resource out of
 * several Carbon ones. It is deliberately backend-neutral: `detail-map-array`
 * merges `Detail1Map`, `Detail2Map` and `Detail3Map` into one array texture, and
 * that decision is about the *resources*, not about WGSL or GLSL. Both backends
 * want the identical merge, for different reasons - WebGPU to reduce binding
 * churn, WebGL 2 because the family otherwise needs 17 texture units against a
 * limit of 16.
 *
 * So the section lives here rather than in either backend's block codec, and the
 * two codecs compose it. A transform written by one backend decodes identically
 * under the other.
 */

/**
 * Resource-transform families. The discriminator exists so `kind`,
 * `representation`, `missingLayer` and the output name stay derivable without
 * pinning the format to one recognizer: a second family costs an enum value
 * rather than a format version bump.
 */
export const CARBON_BACKEND_TRANSFORM_FAMILY = Object.freeze([
    "detail-map-array",
    "local-light-profile-neutral"
]);

/** Constants a `detail-map-array` transform restores rather than storing. */
export const DETAIL_MAP_ARRAY_DEFAULTS = Object.freeze({
    version: 1,
    kind: "texture-2d-array",
    stage: "fragment",
    representation: "native-or-rgba8",
    missingLayer: "reject",
    viewDimension: "2d-array",
    // The merged array's name is owned by the detail-map family, not restated
    // here. It has been renamed once already (DetailMapArray -> DetailArrayMap),
    // and a second literal is a second place for the next rename to miss.
    outputName: DETAIL_MAP_ARRAY_NAME
});

/**
 * Constants a `local-light-profile-neutral` transform restores rather than
 * storing.
 *
 * Unlike `detail-map-array` this transform has no output resource: its whole
 * content is that an input resource was replaced by a constant. It exists so a
 * described Carbon resource that the backend deliberately dropped is still
 * accounted for - a resource that simply disappears is indistinguishable from
 * one that was lost, and the integrity rules reject that on purpose.
 *
 * `LightProfileArray` is multiplied into a light's attenuation, so the constant
 * is one, not zero. That is the same value the shader's own no-profile path
 * produces, which is why dropping it is neutral rather than dark.
 */
export const LOCAL_LIGHT_PROFILE_NEUTRAL_DEFAULTS = Object.freeze({
    version: 1,
    kind: "constant",
    stage: "fragment",
    representation: "constant-one",
    missingLayer: "ignore",
    viewDimension: null,
    outputName: null
});

/**
 * Per-family constant sets, keyed by family name.
 *
 * The reader restores these rather than storing them, so a family that omitted
 * its entry here would silently inherit another family's constants.
 */
const TRANSFORM_DEFAULTS_BY_FAMILY = Object.freeze({
    "detail-map-array": DETAIL_MAP_ARRAY_DEFAULTS,
    "local-light-profile-neutral": LOCAL_LIGHT_PROFILE_NEUTRAL_DEFAULTS
});

/**
 * Refuses a transform whose restored fields disagree with its family.
 *
 * Every field below is dropped on write and rebuilt from the family constants
 * on read, so a document that disagrees does not fail - it round-trips into a
 * *different* document, which is the failure shape that produced both the
 * `selectedOptions` and the register-pair bugs. A caller may supply its own
 * transform plan, so agreement is checked here rather than assumed from the
 * one producer that happens to emit constants.
 *
 * An absent field is not a disagreement: omitting it is the normal way to say
 * "restore the family value".
 *
 * @param {object} transform Resource transform.
 * @param {string} family Resolved family name.
 * @param {object} defaults Family constants the reader restores.
 */
function assertRestoredFieldsAgree(transform, family, defaults)
{
    const restored = [
        [ "version", transform.version, defaults.version ],
        [ "kind", transform.kind, defaults.kind ],
        [ "stage", transform.stage, defaults.stage ],
        [ "representation", transform.representation, defaults.representation ],
        [ "missingLayer", transform.missingLayer, defaults.missingLayer ],
        [ "output.name", transform.output?.name, defaults.outputName ],
        [ "output.viewDimension", transform.output?.viewDimension, defaults.viewDimension ]
    ];

    for (const [ field, actual, expected ] of restored)
    {
        if (actual === undefined || actual === null) continue;
        if (actual === expected) continue;

        throw new CjsFormatWriteError(
            `Resource transform "${transform.id}" sets ${field} to ${JSON.stringify(actual)}, but the`
            + ` "${family}" family restores ${JSON.stringify(expected)} on read. The value is not`
            + ` stored, so writing this would silently change the document.`,
            { transform: transform.id, family, field, actual, expected }
        );
    }

    // Layer count is positional on the wire: the reader counts the inputs it
    // read. A document claiming a different count is claiming something the
    // bytes cannot carry.
    const layerCount = transform.output?.layerCount;

    if (layerCount !== undefined && layerCount !== null && layerCount !== transform.inputs.length)
    {
        throw new CjsFormatWriteError(
            `Resource transform "${transform.id}" declares ${layerCount} output layers but carries`
            + ` ${transform.inputs.length} inputs; the reader derives the count from the inputs.`,
            { transform: transform.id, family, declared: layerCount, inputs: transform.inputs.length }
        );
    }
}

/**
 * Writes a length-prefixed UTF-8 string.
 *
 * @param {object} writer Target byte writer.
 * @param {string} value Text value.
 */
export function writeInlineString(writer, value)
{
    const bytes = new TextEncoder().encode(String(value ?? ""));
    if (bytes.length > 0xffff)
    {
        throw new CjsFormatWriteError("Backend block string exceeds 65535 bytes", {
            byteLength: bytes.length
        });
    }
    writer.u16(bytes.length);
    writer.bytes(bytes);
}

/**
 * Reads a length-prefixed UTF-8 string.
 *
 * @param {object} reader Source byte reader.
 * @returns {string} Decoded text.
 */
export function readInlineString(reader)
{
    const length = reader.readUint16();
    return new TextDecoder("utf-8", { fatal: false }).decode(reader.readRaw(length));
}

/**
 * Writes the count-prefixed resource-transform section.
 *
 * @param {object} writer Target byte writer.
 * @param {object[]} transforms Resource transforms.
 */
export function writeTransformSection(writer, transforms)
{
    writer.u8(transforms.length);

    for (const transform of transforms)
    {
        const familyName = transform.family ?? "detail-map-array";
        const family = CARBON_BACKEND_TRANSFORM_FAMILY.indexOf(familyName);
        if (family < 0)
        {
            throw new CjsFormatWriteError(`Unknown transform family "${transform.family}"`, {
                family: transform.family
            });
        }
        assertRestoredFieldsAgree(transform, familyName, TRANSFORM_DEFAULTS_BY_FAMILY[familyName]);
        writer.u8(family);
        // `id` stays on the wire: a caller may supply it, and it propagates into
        // the engine binding as `transformId`. Deriving it would foreclose the
        // caller-supplied plan path to save four bytes.
        writeInlineString(writer, transform.id);
        writer.u8(transform.inputs.length);
        for (const input of transform.inputs)
        {
            // Array position is the layer. Safe because `parameter` stays on the
            // wire, so layer identity remains cross-checkable rather than
            // asserted by position.
            //
            // Checked rather than trusted: the reader rebuilds each input's
            // identity from this pair, so a producer that omits it does not fail
            // here -- it writes two zero bytes and every layer reads back as
            // register 0. That is a wrong package that loads, which is worse
            // than one that throws.
            if (!Number.isInteger(input.registerSpace) || !Number.isInteger(input.registerIndex))
            {
                throw new TypeError(
                    `Resource transform input ${input.parameter} needs integer registerSpace and`
                    + ` registerIndex; the reader rebuilds its identity from them`
                );
            }
            writer.u8(input.registerSpace);
            writer.u8(input.registerIndex);
            writeInlineString(writer, input.parameter);
        }
    }
}

/**
 * Reads the count-prefixed resource-transform section, restoring derived fields.
 *
 * @param {object} reader Source byte reader.
 * @param {string|null} layoutKey Enclosing pass key, restored onto records.
 * @returns {object[]} Resource transforms.
 */
export function readTransformSection(reader, layoutKey)
{
    const transforms = [];
    const transformCount = reader.readUint8();

    for (let index = 0; index < transformCount; index += 1)
    {
        const family = CARBON_BACKEND_TRANSFORM_FAMILY[reader.readUint8()];
        const defaults = TRANSFORM_DEFAULTS_BY_FAMILY[family];
        if (!defaults)
        {
            throw new CjsFormatReadError(`Transform family "${family}" has no restored constants`, {
                family
            });
        }
        const id = readInlineString(reader);
        const inputs = [];
        const inputCount = reader.readUint8();
        for (let layer = 0; layer < inputCount; layer += 1)
        {
            const registerSpace = reader.readUint8();
            const registerIndex = reader.readUint8();
            const parameter = readInlineString(reader);
            const identity = `sampled-resource:${registerSpace}:${registerIndex}`;
            inputs.push({
                parameter,
                layer,
                // Kept alongside the identity they compose: a consumer checking
                // the transform against a binding set compares registers, and
                // re-parsing them back out of the identity string is a second
                // place for the format of that string to matter.
                registerSpace,
                registerIndex,
                identity,
                scopeIdentity: `${identity}@${defaults.stage}`
            });
        }

        transforms.push({
            id,
            family,
            version: defaults.version,
            kind: defaults.kind,
            stage: defaults.stage,
            representation: defaults.representation,
            missingLayer: defaults.missingLayer,
            layoutKey,
            inputs,
            output: {
                name: defaults.outputName,
                viewDimension: defaults.viewDimension,
                layerCount: inputs.length,
                identity: inputs[0]?.identity ?? null,
                scopeIdentity: inputs[0]?.scopeIdentity ?? null
            }
        });
    }

    return transforms;
}
