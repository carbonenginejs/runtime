import { CjsByteWriter } from "../CjsByteWriter.js";
import { CjsByteReader } from "../CjsByteReader.js";
import { CjsFormatReadError, CjsFormatWriteError } from "../CjsFormatError.js";
import {
    CARBON_BACKEND_ENGINE_ID,
    readBackendEngineId
} from "./backendEngineId.js";
import {
    CARBON_BACKEND_TRANSFORM_FAMILY,
    DETAIL_MAP_ARRAY_DEFAULTS,
    readInlineString,
    readTransformSection,
    writeInlineString,
    writeTransformSection
} from "./carbonEffectResourceTransform.js";

/**
 * The WebGPU pass block: bind-group layouts plus the shared resource-transform
 * section.
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

/**
 * The leading byte is the TARGET ENGINE IDENTIFIER, not a version.
 *
 * It was called CARBON_EFFECT_BACKEND_BLOCK_VERSION and emitted 1, while the
 * WebGL2 writer also emitted 1 meaning something unrelated - so the byte could
 * not do the one job it was there for. Renamed to what it is, and given a
 * distinct value per backend, it identifies the block.
 *
 * Carbon container version remains the only version. Nothing stores this block:
 * a consumer builds one and reads it back in the same process, so a block from
 * a different build is caught by the trailing-byte check at the end of the read.
 *
 * The identifier is shared with the WebGL2 block rather than duplicated, so the
 * two cannot drift into meaning the same number again.
 */

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

// The transform section is shared with the GLSL block; both re-export the
// family enum and defaults so a consumer of either codec sees them.
export { CARBON_BACKEND_TRANSFORM_FAMILY, DETAIL_MAP_ARRAY_DEFAULTS };

/** Marks an absent optional `u32`. Carbon's null-reference value. */
const ABSENT = 0xffffffff;

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
 * Rebuilds a binding's WebGPU descriptor from what the block does store.
 *
 * The descriptor — `buffer`, `texture` or `sampler` — is not on the wire because
 * it is a pure function of the WGSL type, the resource kind and the structure
 * stride, all three of which are. `lowerBindingLayout.js` derives it from the
 * same three inputs on the way out; this derives it back on the way in.
 *
 * The pairs that could collide do not. `array<u32>` reaches both a structured
 * buffer and a compute typed buffer, and the structure stride separates them:
 * structured always carries one, typed never does.
 *
 * @param {object} binding Decoded binding record.
 * @returns {object} The descriptor fragment, as one `{buffer|texture|sampler}` key.
 */
function deriveBindingDescriptor(binding)
{
    const stride = binding.structureStride;

    if (binding.resourceKind === "sampler")
    {
        return { sampler: { type: "filtering" } };
    }

    if (binding.resourceKind === "uniform-buffer")
    {
        const vec4Count = /^array<vec4<f32>, (\d+)>$/u.exec(binding.type)?.[1];
        if (!vec4Count)
        {
            throw new CjsFormatReadError(
                `Backend block uniform binding has untranslatable type "${binding.type}"`,
                { type: binding.type }
            );
        }
        return {
            buffer: {
                type: "uniform",
                hasDynamicOffset: false,
                minBindingSize: Number(vec4Count) * 16
            }
        };
    }

    if (binding.resourceKind === "sampled-resource")
    {
        const texture = TEXTURE_DESCRIPTORS[binding.type];
        if (texture) return { texture: { ...texture } };

        return {
            buffer: {
                type: "read-only-storage",
                hasDynamicOffset: false,
                minBindingSize: stride === undefined ? 4 : stride
            }
        };
    }

    return {
        buffer: {
            type: "storage",
            hasDynamicOffset: false,
            minBindingSize: stride === undefined ? 4 : stride
        }
    };
}

/** Texture descriptors by WGSL type (`lowerBindingLayout.js:90-95`). */
const TEXTURE_DESCRIPTORS = Object.freeze({
    "texture_2d<f32>": Object.freeze({ sampleType: "float", viewDimension: "2d", multisampled: false }),
    "texture_cube<f32>": Object.freeze({ sampleType: "float", viewDimension: "cube", multisampled: false }),
    "texture_3d<f32>": Object.freeze({ sampleType: "float", viewDimension: "3d", multisampled: false }),
    "texture_2d_array<f32>": Object.freeze({ sampleType: "float", viewDimension: "2d-array", multisampled: false })
});

/**
 * Serialises one pass's backend block.
 *
 * @param {object} block Block contents.
 * @param {object[]} [block.bindGroups] Bind groups with their bindings.
 * @param {object[]} [block.transforms] Resource transforms.
 * @returns {Uint8Array} Self-contained block bytes.
 */
/**
 * Refuses a binding whose derived fields disagree with what the reader rebuilds.
 *
 * `identity`, `scopeIdentity` and the per-binding `group` are not stored: the
 * reader recomputes them from the register triple, the visibility mask and the
 * enclosing group. A binding that carries a different value therefore does not
 * fail - it round-trips into a different binding, and the engine matches on
 * exactly these strings.
 *
 * `scopeIdentity` deserves the sharpest check, because the wire cannot preserve
 * what it is derived from. Visibility is stored as a **bitmask**, so it is a
 * set; `scopeIdentity` is built from `visibility[0]`, so it depends on an
 * order. A binding written as `[fragment, vertex]` reads back as
 * `[vertex, fragment]` and its scope silently moves from `@fragment` to
 * `@vertex`. Canonical order is the only order the format can represent, so a
 * producer must write it.
 *
 * @param {object} binding Binding record.
 * @param {object} group Enclosing bind group.
 */
function assertDerivedBindingFieldsAgree(binding, group)
{
    const identity = `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
    const canonical = unpackVisibility(packVisibility(binding.visibility));
    const derived = [
        [ "identity", binding.identity, identity ],
        [ "scopeIdentity", binding.scopeIdentity, `${identity}@${canonical[0]}` ],
        [ "group", binding.group, group.group ]
    ];

    for (const [ field, actual, expected ] of derived)
    {
        if (actual === undefined || actual === null) continue;
        if (actual === expected) continue;

        throw new CjsFormatWriteError(
            `Binding ${identity} sets ${field} to ${JSON.stringify(actual)}, but the reader rebuilds`
            + ` ${JSON.stringify(expected)}. The value is not stored, so writing this would silently`
            + ` change the binding.`,
            { identity, field, actual, expected }
        );
    }
}

export function writeBackendBlock(block)
{
    const bindGroups = block.bindGroups ?? [];
    const transforms = block.transforms ?? [];
    const writer = new CjsByteWriter(256);

    writer.u8(CARBON_BACKEND_ENGINE_ID.webgpu);

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
            assertDerivedBindingFieldsAgree(binding, group);
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

    writeTransformSection(writer, transforms);

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

    readBackendEngineId(reader, CARBON_BACKEND_ENGINE_ID.webgpu, options.source ?? "backend block");

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
            const record = {
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
            };
            bindings.push({ ...record, ...deriveBindingDescriptor(record) });
        }
        bindGroups.push({ group, bindings });
    }

    const transforms = readTransformSection(reader, layoutKey);

    // A sized record must land exactly on its declared end. Trailing bytes mean
    // the writer knew fields this reader does not, which with no version byte is
    // the ONLY signal that a block came from a different build - so this check is
    // load-bearing rather than defensive.
    // This is the only surviving form of a closed-schema check: under a record
    // layout a field either exists at its offset or the read fails, so there is
    // nothing per-field left to assert, but exhaustiveness is still checkable and
    // is exactly what a silently-discarded tail would violate.
    if (reader.remaining !== 0)
    {
        throw new CjsFormatReadError(
            `Backend block has ${reader.remaining} unparsed trailing byte(s); rebuild the effect package`,
            { source: options.source ?? "backend block", trailingBytes: reader.remaining }
        );
    }

    return {
        layoutKey,
        bindGroups,
        transforms,
        trailingBytes: 0
    };
}
