// Physical layout for Carbon per-object constant buffers.
//
// Layout resolution over the Carbon ABI catalog, backed by the C++ struct
// declarations rather than by shader reflection - Carbon does not pack
// per-object data by reflection either, it memcpys the struct
// (EveSpaceObject2.cpp:1469-1483). A struct that is not in the catalog is NOT
// laid out on a guess; ResolveLayout returns null.
//
// HISTORY (2026-07-28): this began as the packer `RawDataStore` required and no
// package supplied. That requirement is gone, and so is the seam it filled -
// runtime-trinity computes the offsets itself from `CjsPerObjectLayouts`,
// because the physical layout turned out not to be backend-specific (WGSL
// declares `array<vec4<f32>, N>`, GLSL declares `vec4 cbN[N]` or a std140 block
// wrapping `vec4 data[N]`, and std140's stride for an array of vec4 matches
// tight C++ packing). What remains here is TOOL-side layout: byte geometry and
// register positions, which a runtime writing through named fields never needs.
//
// When a caller supplies a logical definition the packer VERIFIES it against
// the ABI instead of ignoring it, so drift between a runtime declaration and
// the Carbon header is a loud test failure rather than a silently wrong buffer.

import { CjsPerObjectFieldType, perObjectStruct, perObjectStructNames } from "./CjsPerObjectAbi.js";


const FLOATS_PER_REGISTER = 4;
const BYTES_PER_REGISTER = 16;
const COMPONENTS = "xyzw";


/** Thrown when a struct cannot be laid out, or a supplied definition contradicts the Carbon ABI. */
export class CjsPerObjectLayoutError extends Error
{

    /** Creates a layout error with stable structural details. */
    constructor(message, details = {})
    {
        super(message);
        this.name = "CjsPerObjectLayoutError";
        this.details = details;
    }

}


/** Resolves Carbon per-object struct layouts, and packs values into them. */
export class CjsPerObjectPacker
{

    /** Extra struct definitions merged over the catalog, keyed by struct name. */
    #structs = null;

    /** Resolved layouts, keyed by struct name. */
    #layouts = new Map();

    /** Creates a packer with optional caller-supplied struct definitions. */
    constructor(options = {})
    {
        this.#structs = options.structs ?? null;
    }

    /**
     * The `RawDataStore` packer contract. Returns float offsets relative to one
     * instance slot, or null when the struct is not covered by the ABI.
     *
     * `definition` is optional. When present it is checked field-for-field
     * against the ABI and a mismatch throws rather than resolving.
     */
    ResolveLayout(structName, definition = null)
    {
        const layout = this.Describe(structName);

        if (!layout)
        {
            return null;
        }

        if (definition)
        {
            this.VerifyDefinition(structName, definition);
        }

        const fields = {};

        for (const field of layout.fields)
        {
            fields[field.name] = {
                offset: field.offset,
                size: field.size,
                elements: field.elements,
                encoding: field.encoding
            };
        }

        return { fields, stride: layout.stride };
    }

    /**
     * The full physical description of one struct: float offsets, byte offsets,
     * and the constant register each field lands in. Cached per packer.
     */
    Describe(structName)
    {
        if (this.#layouts.has(structName))
        {
            return this.#layouts.get(structName);
        }

        const entry = this.#Struct(structName);

        if (!entry)
        {
            return null;
        }

        const layout = buildLayout(structName, entry);
        this.#layouts.set(structName, layout);

        return layout;
    }

    /**
     * The fields occupying one float4 register of a struct, in order. Use this
     * to name an anonymous `cbN[i]` slot from a shader export.
     */
    DescribeRegister(structName, registerIndex)
    {
        const layout = this.Describe(structName);

        if (!layout)
        {
            return [];
        }

        const start = registerIndex * FLOATS_PER_REGISTER;
        const end = start + FLOATS_PER_REGISTER;

        return layout.fields
            .flatMap((field) => field.slots)
            .filter((slot) => slot.offset < end && slot.offset + slot.size > start);
    }

    /**
     * Candidate structs whose register count could explain a shader's declared
     * `array<vec4<f32>, N>` uniform.
     *
     * A WGSL/GLSL export sizes a uniform by the ACTIVE PREFIX - the highest
     * register the shader body actually reads - not by the full struct, so an
     * exact match on the total is only one of the answers. `truncatedAfter`
     * names the last field inside the prefix, which is how `cb4[27]` resolves to
     * EveSpaceObjectPSData ending at `customMaskClamps`, with `screenSize` and
     * `customData` simply unread.
     */
    IdentifyByRegisterCount(registerCount, options = {})
    {
        const stage = options.stage ?? null;
        const matches = [];

        for (const name of this.#Names())
        {
            const layout = this.Describe(name);

            if (!layout || (stage && !layout.stages.includes(stage)))
            {
                continue;
            }

            if (layout.registerCount === registerCount)
            {
                matches.push({ struct: name, exact: true, truncatedAfter: null, layout });
                continue;
            }

            if (registerCount < layout.registerCount)
            {
                const boundary = layout.fields.filter(
                    (field) => (field.byteOffset + field.byteSize) === registerCount * BYTES_PER_REGISTER
                );

                if (boundary.length)
                {
                    matches.push({
                        struct: name,
                        exact: false,
                        truncatedAfter: boundary[boundary.length - 1].name,
                        layout
                    });
                }
            }
        }

        return matches;
    }

    /**
     * Checks a logical definition against the Carbon ABI. Throws on the first
     * disagreement; returns the layout when they match.
     *
     * `definition` is `RawDataStore`'s normalized form: an ordered array of
     * `{ name, size, elements, encoding }` with `size` in floats.
     */
    VerifyDefinition(structName, definition)
    {
        const layout = this.Describe(structName);

        if (!layout)
        {
            throw new CjsPerObjectLayoutError(
                `${structName} is not in the Carbon per-object ABI catalog`,
                { struct: structName }
            );
        }

        if (definition.length !== layout.fields.length)
        {
            throw new CjsPerObjectLayoutError(
                `${structName} declares ${definition.length} fields but the Carbon ABI has ${layout.fields.length}`,
                { struct: structName, declared: definition.map((field) => field.name), abi: layout.fields.map((field) => field.name) }
            );
        }

        for (let index = 0; index < definition.length; index++)
        {
            const declared = definition[index];
            const field = layout.fields[index];
            const declaredElements = declared.elements ?? 1;

            if (declared.name !== field.name)
            {
                throw new CjsPerObjectLayoutError(
                    `${structName} field ${index} is "${declared.name}" but the Carbon ABI has "${field.name}"`,
                    { struct: structName, index }
                );
            }

            if (declared.size !== field.size || declaredElements !== field.elements)
            {
                throw new CjsPerObjectLayoutError(
                    `${structName}.${field.name} is declared ${declared.size}x${declaredElements} floats `
                    + `but the Carbon ABI has ${field.size}x${field.elements}`,
                    { struct: structName, field: field.name }
                );
            }

            if (declared.encoding && declared.encoding !== field.encoding)
            {
                throw new CjsPerObjectLayoutError(
                    `${structName}.${field.name} is declared "${declared.encoding}" but the Carbon ABI encodes it as "${field.encoding}"`,
                    { struct: structName, field: field.name }
                );
            }
        }

        return layout;
    }

    /**
     * Packs values into the struct's byte layout and returns the Float32Array a
     * caller would upload. Integer-encoded fields are bit-cast into the float
     * lanes.
     *
     * MATRIX CONVENTION - `options.matrices` says what the caller is holding:
     *
     *   "raw"     (default) values already hold what the C++ struct holds, i.e.
     *             TRANSPOSED. This is what a per-object record contains, and
     *             what `CjsPerObjectSynthesizer` emits. Matrices are copied
     *             through untouched.
     *   "logical" values are untransposed row-vector matrices and are
     *             transposed here, reproducing Carbon's `= Transpose(m)`
     *             staging fill. This is what a producer holds before writing.
     *
     * Passing an already-transposed value as "logical" transposes it twice,
     * which corrupts the rotation block while leaving the translation column
     * looking right (carbon-math-conventions F6). `CjsPerObjectSynthesizer`
     * reports its convention on every result.
     *
     * runtime-trinity has no equivalent choice: its records are always
     * GPU-form, and `SetAndTranspose`/`GetTransposed` are the only matrix
     * accessors. This option exists because a tool may be handed either.
     *
     * Unwritten fields are ZERO here, which is a deliberate deviation: Carbon
     * leaves them as allocator garbage (RawDataStore's "write what you rely on"
     * contract). Zero makes a synthesized buffer reproducible, which is the
     * point of synthesizing one. Pass `values` from the synthesizer to get
     * Carbon's documented neutrals instead of bare zero.
     */
    Pack(structName, values = {}, options = {})
    {
        const transpose = (options.matrices ?? "raw") === "logical";

        const layout = this.Describe(structName);

        if (!layout)
        {
            throw new CjsPerObjectLayoutError(
                `${structName} is not in the Carbon per-object ABI catalog`,
                { struct: structName, known: this.#Names() }
            );
        }

        const floats = new Float32Array(layout.stride);
        const uints = new Uint32Array(floats.buffer);

        for (const field of layout.fields)
        {
            const value = values[field.name];

            if (value === undefined || value === null)
            {
                continue;
            }

            writeField(field, flatten(value), floats, uints, transpose);
        }

        return floats;
    }

    /** Resolves one caller-supplied or canonical struct definition. */
    #Struct(structName)
    {
        if (this.#structs && Object.prototype.hasOwnProperty.call(this.#structs, structName))
        {
            return this.#structs[structName];
        }

        return perObjectStruct(structName);
    }

    /** Lists every canonical and caller-supplied struct name once. */
    #Names()
    {
        const names = perObjectStructNames();

        return this.#structs ? [...new Set([...names, ...Object.keys(this.#structs)])] : names;
    }

}


/**
 * Lays out one struct under Carbon's C++ rules and asserts the two invariants
 * Carbon itself relies on: every float4-sized member starts on a register
 * boundary (Carbon hand-pads to guarantee this), and the struct is a whole
 * number of registers (Tr2PerObjectData.h:83-87).
 */
function buildLayout(structName, entry)
{
    const fields = [];

    for (const declared of entry.fields)
    {
        const slots = [];

        for (let element = 0; element < declared.elements; element++)
        {
            const elementOffset = declared.offset + element * declared.size;

            slots.push({
                field: declared.name,
                name: declared.elements > 1 ? `${declared.name}[${element}]` : declared.name,
                element,
                offset: elementOffset,
                size: declared.size,
                register: Math.floor(elementOffset / FLOATS_PER_REGISTER),
                component: COMPONENTS[elementOffset % FLOATS_PER_REGISTER],
                encoding: encodingOf(declared),
                hlsl: declared.hlsl
            });
        }

        fields.push({
            name: declared.name,
            type: declared.type,
            encoding: encodingOf(declared),
            size: declared.size,
            elements: declared.elements,
            offset: declared.offset,
            byteOffset: declared.byteOffset,
            byteSize: declared.byteSize,
            register: Math.floor(declared.offset / FLOATS_PER_REGISTER),
            component: COMPONENTS[declared.offset % FLOATS_PER_REGISTER],
            hlsl: declared.hlsl,
            slots
        });
    }

    return {
        name: structName,
        group: entry.group,
        stages: entry.stages,
        register: entry.register,
        fields,
        stride: entry.stride,
        byteSize: entry.byteSize,
        registerCount: entry.registerCount
    };
}


/** The encoder kind for a field, from its declared type. */
function encodingOf(field)
{
    if (field.isMatrix)
    {
        return "matrix";
    }

    return field.isInteger ? "uint" : "vector";
}


/** Writes one field's elements, applying the encoding kind. */
function writeField(field, value, floats, uints, transpose)
{
    for (let element = 0; element < field.elements; element++)
    {
        const source = element * field.size;
        const destination = field.offset + element * field.size;

        if (source >= value.length)
        {
            // Fewer elements supplied than the array declares - the remainder
            // keeps whatever it already had, matching Carbon's per-element fills
            // (turret arrays are written for VISIBLE turrets only).
            break;
        }

        if (field.encoding === "matrix" && transpose)
        {
            writeTransposed(field.size, value, source, floats, destination);
            continue;
        }

        if (field.encoding === "uint" || field.encoding === "int")
        {
            for (let index = 0; index < field.size; index++)
            {
                uints[destination + index] = value[source + index] | 0;
            }

            continue;
        }

        for (let index = 0; index < field.size; index++)
        {
            const component = value[source + index];
            floats[destination + index] = component === undefined ? 0 : component;
        }
    }
}


/** Square-matrix transpose on the shared byte layout: buffer(r,c) = value(c,r). */
function writeTransposed(size, value, source, floats, destination)
{
    const order = Math.sqrt(size);

    for (let row = 0; row < order; row++)
    {
        for (let column = 0; column < order; column++)
        {
            floats[destination + row * order + column] = value[source + column * order + row] ?? 0;
        }
    }
}


/** Accepts a flat array, a typed array, or an array of element arrays. */
function flatten(value)
{
    if (ArrayBuffer.isView(value))
    {
        return value;
    }

    if (Array.isArray(value) && value.length && (Array.isArray(value[0]) || ArrayBuffer.isView(value[0])))
    {
        return value.flatMap((element) => Array.from(element));
    }

    return Array.isArray(value) ? value : [value];
}
