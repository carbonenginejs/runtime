import { CjsByteWriter } from "../CjsByteWriter.js";
import { CjsByteReader } from "../CjsByteReader.js";
import { CjsFormatReadError, CjsFormatWriteError } from "../CjsFormatError.js";

/**
 * The one optional trailing block per pass: WebGPU bind-group layouts and
 * resource transforms.
 *
 * Neither is derivable from Carbon reflection. Carbon's `registers[]` is the D3D
 * binding model, while `(group, binding, visibility, generatedSymbol)` comes from
 * the *lowered IR's* bindings. So this is the port's only genuine invention, and
 * it is built entirely from Carbon's own techniques: count-prefixed fixed-width
 * records inside a blob referenced by `{u32 size, u32 offset}`, exactly like
 * program source.
 *
 * Both sections share **one** block rather than occupying two, because the
 * invariant worth keeping is "the Carbon region is backend-invariant, with
 * exactly one optional trailing block". They are also mutually required — a
 * transform needs a carrier binding in the same pass's layout and a transformed
 * binding needs a recipe — so one unit is the honest shape.
 *
 * ## Why the block is self-contained
 *
 * The block lives in the arena so that identical layouts dedupe across bodies the
 * way program source does; measured sharing is 30.5:1 at `(body, pass)`
 * granularity, 22 distinct blocks across 672 pairs.
 *
 * That forces one design consequence: **the block cannot contain arena offsets.**
 * An offset is only known after the arena's content sort, and the sort depends on
 * every blob's bytes — including this one. A block referencing the arena would
 * have to be interned before its own contents could be computed. Carbon never
 * meets this because no Carbon arena blob refers to the arena.
 *
 * So strings are inline here, length-prefixed, not interned. The cost is real but
 * small: a repeated `"t11"` inside 22 distinct blocks rather than one shared copy.
 * The block itself is what dedupes, and it dedupes 30x.
 */

/** Current block version. Bump when a field is added; readers may skip unknown. */
export const CARBON_EFFECT_BACKEND_BLOCK_VERSION = 1;

/**
 * Resource kinds, ordered so the wire value is stable
 * (`buildWgslSet.js:117-122`).
 */
export const CARBON_BACKEND_RESOURCE_KIND = Object.freeze([
    "uniform-buffer",
    "sampled-resource",
    "sampler",
    "storage-resource"
]);

/** Shader stages, as a bit position in the visibility mask. */
export const CARBON_BACKEND_VISIBILITY = Object.freeze([ "vertex", "fragment", "compute" ]);

/**
 * Resource-transform families. The discriminator exists so `kind`,
 * `representation`, `missingLayer` and the output name stay derivable without
 * pinning the format to one recognizer: a second family costs an enum value
 * rather than a format version bump.
 */
export const CARBON_BACKEND_TRANSFORM_FAMILY = Object.freeze([ "detail-map-array" ]);

/** Constants a `detail-map-array` transform restores rather than storing. */
export const DETAIL_MAP_ARRAY_DEFAULTS = Object.freeze({
    version: 1,
    kind: "texture-2d-array",
    stage: "fragment",
    representation: "native-or-rgba8",
    missingLayer: "reject",
    viewDimension: "2d-array",
    outputName: "DetailMapArray"
});

/** Marks an absent optional `u32`. Carbon's null-reference value. */
const ABSENT = 0xffffffff;

/**
 * Writes a length-prefixed UTF-8 string.
 *
 * @param {CjsByteWriter} writer Target writer.
 * @param {string} value Text value.
 */
function writeInlineString(writer, value)
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
 * @param {CjsByteReader} reader Source reader.
 * @returns {string} Decoded text.
 */
function readInlineString(reader)
{
    const length = reader.readUint16();
    return new TextDecoder("utf-8", { fatal: false }).decode(reader.readRaw(length));
}

/**
 * Encodes a visibility list as a bit mask.
 *
 * @param {string[]} visibility Stage names.
 * @returns {number} Bit mask.
 */
function packVisibility(visibility)
{
    let mask = 0;
    for (const stage of visibility ?? [])
    {
        const bit = CARBON_BACKEND_VISIBILITY.indexOf(stage);
        if (bit < 0)
        {
            throw new CjsFormatWriteError(`Unknown binding visibility "${stage}"`, { stage });
        }
        mask |= 1 << bit;
    }
    return mask;
}

/**
 * Decodes a visibility bit mask, in the canonical stage order.
 *
 * @param {number} mask Bit mask.
 * @returns {string[]} Stage names.
 */
function unpackVisibility(mask)
{
    const stages = [];
    for (let bit = 0; bit < CARBON_BACKEND_VISIBILITY.length; bit += 1)
    {
        if (mask & (1 << bit)) stages.push(CARBON_BACKEND_VISIBILITY[bit]);
    }
    return stages;
}

/**
 * Serialises one pass's backend block.
 *
 * @param {object} block Block contents.
 * @param {object[]} [block.bindGroups] Bind groups with their bindings.
 * @param {object[]} [block.transforms] Resource transforms.
 * @returns {Uint8Array} Self-contained block bytes.
 */
export function writeBackendBlock(block)
{
    const bindGroups = block.bindGroups ?? [];
    const transforms = block.transforms ?? [];
    const writer = new CjsByteWriter(256);

    writer.u8(CARBON_EFFECT_BACKEND_BLOCK_VERSION);

    writer.u8(bindGroups.length);
    for (const group of bindGroups)
    {
        writer.u8(group.group);
        writer.u8(group.bindings.length);
        for (const binding of group.bindings)
        {
            const kind = CARBON_BACKEND_RESOURCE_KIND.indexOf(binding.resourceKind);
            if (kind < 0)
            {
                throw new CjsFormatWriteError(`Unknown resource kind "${binding.resourceKind}"`, {
                    resourceKind: binding.resourceKind
                });
            }
            writer.u8(kind);
            writer.u8(binding.registerSpace);
            writer.u8(binding.binding);
            writer.u8(packVisibility(binding.visibility));
            writer.u32(binding.registerIndex);
            writer.u32(binding.structureStride ?? ABSENT);
            writer.u8(binding.arrayLayerCount ?? 0);
            writeInlineString(writer, binding.type);
            writeInlineString(writer, binding.generatedSymbol);
            // A binding either carries a transform id or it does not; an empty
            // string is not a legal id, so length zero encodes absence.
            writeInlineString(writer, binding.transformId ?? "");
        }
    }

    writer.u8(transforms.length);
    for (const transform of transforms)
    {
        const family = CARBON_BACKEND_TRANSFORM_FAMILY.indexOf(transform.family ?? "detail-map-array");
        if (family < 0)
        {
            throw new CjsFormatWriteError(`Unknown transform family "${transform.family}"`, {
                family: transform.family
            });
        }
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
            writer.u8(input.registerSpace);
            writer.u8(input.registerIndex);
            writeInlineString(writer, input.parameter);
        }
    }

    return writer.toBytes();
}

/**
 * Parses one pass's backend block, restoring every derived field.
 *
 * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes Block bytes.
 * @param {object} [options] Read options.
 * @param {string} [options.layoutKey] Enclosing pass key, restored onto records.
 * @param {string} [options.source] Source name for error details.
 * @returns {object} Block contents with derived fields restored.
 */
export function readBackendBlock(bytes, options = {})
{
    const reader = new CjsByteReader(bytes, { source: options.source ?? "backend block" });
    const layoutKey = options.layoutKey ?? null;

    const version = reader.readUint8();
    if (version > CARBON_EFFECT_BACKEND_BLOCK_VERSION)
    {
        // Forward compatibility: an unknown block version means a newer writer
        // added fields. Report the pass as having no backend data rather than
        // misparsing it; the enclosing `{size, offset}` pair makes it skippable.
        return { version, unsupported: true, bindGroups: [], transforms: [] };
    }

    const bindGroups = [];
    const groupCount = reader.readUint8();
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1)
    {
        const group = reader.readUint8();
        const bindings = [];
        const bindingCount = reader.readUint8();
        for (let index = 0; index < bindingCount; index += 1)
        {
            const resourceKind = CARBON_BACKEND_RESOURCE_KIND[reader.readUint8()];
            const registerSpace = reader.readUint8();
            const binding = reader.readUint8();
            const visibility = unpackVisibility(reader.readUint8());
            const registerIndex = reader.readUint32();
            const structureStride = reader.readUint32();
            const arrayLayerCount = reader.readUint8();
            const type = readInlineString(reader);
            const generatedSymbol = readInlineString(reader);
            const transformId = readInlineString(reader);

            const identity = `${resourceKind}:${registerSpace}:${registerIndex}`;
            bindings.push({
                group,
                binding,
                resourceKind,
                registerSpace,
                registerIndex,
                visibility,
                type,
                generatedSymbol,
                identity,
                scopeIdentity: `${identity}@${visibility[0]}`,
                ...(structureStride === ABSENT ? {} : { structureStride }),
                ...(arrayLayerCount === 0 ? {} : { arrayLayerCount }),
                ...(transformId === "" ? {} : { transformId })
            });
        }
        bindGroups.push({ group, bindings });
    }

    const transforms = [];
    const transformCount = reader.readUint8();
    for (let index = 0; index < transformCount; index += 1)
    {
        const family = CARBON_BACKEND_TRANSFORM_FAMILY[reader.readUint8()];
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
                identity,
                scopeIdentity: `${identity}@${DETAIL_MAP_ARRAY_DEFAULTS.stage}`
            });
        }

        transforms.push({
            id,
            family,
            version: DETAIL_MAP_ARRAY_DEFAULTS.version,
            kind: DETAIL_MAP_ARRAY_DEFAULTS.kind,
            stage: DETAIL_MAP_ARRAY_DEFAULTS.stage,
            representation: DETAIL_MAP_ARRAY_DEFAULTS.representation,
            missingLayer: DETAIL_MAP_ARRAY_DEFAULTS.missingLayer,
            layoutKey,
            inputs,
            output: {
                name: DETAIL_MAP_ARRAY_DEFAULTS.outputName,
                viewDimension: DETAIL_MAP_ARRAY_DEFAULTS.viewDimension,
                layerCount: inputs.length,
                identity: inputs[0]?.identity ?? null,
                scopeIdentity: inputs[0]?.scopeIdentity ?? null
            }
        });
    }

    // A sized record parsed at a known version must land exactly on its declared
    // end. Trailing bytes mean the writer knew fields this reader does not — the
    // same skew an unknown `blobVersion` reports, arriving without a version bump.
    // This is the only surviving form of a closed-schema check: under a record
    // layout a field either exists at its offset or the read fails, so there is
    // nothing per-field left to assert, but exhaustiveness is still checkable and
    // is exactly what a silently-discarded tail would violate.
    if (reader.remaining !== 0)
    {
        throw new CjsFormatReadError(
            `Backend block has ${reader.remaining} unparsed trailing byte(s) at version ${version}`,
            { source: options.source ?? "backend block", version, trailingBytes: reader.remaining }
        );
    }

    return {
        version,
        unsupported: false,
        layoutKey,
        bindGroups,
        transforms,
        trailingBytes: 0
    };
}
