// The shared machinery behind the constant-data catalogs.
//
// C++ gets a struct's layout free from the type system, so Carbon never
// declares one; JavaScript has to. Two catalogs need the same declaration
// vocabulary and the same resolver - CjsPerObjectLayouts (per draw) and
// CjsPerFrameLayouts (per frame) - so it lives here rather than being forked.
//
// Carbon uploads both kinds by memcpy'ing the C++ struct straight into the
// constant buffer, so the C++ declaration order IS the byte layout the shader
// reads. Field ORDER and field SIZE are therefore the entire binding contract:
// renaming a field is safe, reordering or resizing one silently shifts every
// field after it.


/**
 * Declared C++ member types. String values rather than ordinals so a typo
 * throws at lookup instead of silently packing wrong, and a layout dump reads
 * `"matrix4"` rather than `3`.
 */
export const Types = Object.freeze({
    /** 16 floats. Stored transposed; written with SetAndTranspose. */
    MATRIX4: "matrix4",

    /** 4 floats. */
    QUATERNION: "quaternion",

    /** 4 floats. */
    VECTOR4: "vector4",

    /** 4 floats - Carbon `Color` (BlueVectorTypes.h:46: `float r, g, b, a`). */
    COLOR: "color",

    /** 3 floats. */
    VECTOR3: "vector3",

    /** 2 floats. */
    VECTOR2: "vector2",

    /** 1 float. */
    FLOAT: "float",

    /** 1 lane, bit-cast into the buffer's Uint32 view. */
    UINT32: "uint32",

    /** 1 lane, two's-complement bit-cast. */
    INT32: "int32"
});


/** Float lanes per declared type. */
export const LANES = Object.freeze({
    [Types.MATRIX4]: 16,
    [Types.QUATERNION]: 4,
    [Types.VECTOR4]: 4,
    [Types.COLOR]: 4,
    [Types.VECTOR3]: 3,
    [Types.VECTOR2]: 2,
    [Types.FLOAT]: 1,
    [Types.UINT32]: 1,
    [Types.INT32]: 1
});


/**
 * Declared type -> the encoder kind that writes its bytes. These are the string
 * values of `RawDataType`, written literally rather than imported so this
 * module stays free of a cycle (RawData imports the catalogs, which import
 * this). Anything absent encodes as `"vector"`.
 */
export const ENCODINGS = Object.freeze({
    [Types.MATRIX4]: "matrix",
    [Types.UINT32]: "uint",
    [Types.INT32]: "int"
});


/** Which stages each buffer key binds to. */
export const STAGES = Object.freeze({
    vs: Object.freeze(["vs"]),
    ps: Object.freeze(["ps"]),
    shared: Object.freeze(["vs", "ps"])
});


export const ZERO4 = Object.freeze([0, 0, 0, 0]);


export const IDENTITY = Object.freeze([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
]);


/**
 * Resolves every group's buffers into flat, offset-bearing layouts, keyed by
 * struct name. `owner` names the calling catalog so a thrown message points at
 * the file to fix.
 */
export function buildLayouts(groups, owner)
{
    const layouts = new Map();

    for (const [group, buffers] of Object.entries(groups))
    {
        for (const [key, buffer] of Object.entries(buffers))
        {
            if (layouts.has(buffer.struct))
            {
                throw new Error(`${owner}: duplicate struct name "${buffer.struct}"`);
            }

            layouts.set(buffer.struct, resolveLayout(group, key, buffer, owner));
        }
    }

    return layouts;
}


/** Lays out one buffer, asserting Carbon's two register invariants. */
export function resolveLayout(group, key, buffer, owner)
{
    const fields = new Map();
    let offset = 0;

    for (const [name, declared] of Object.entries(buffer.fields))
    {
        const lanes = LANES[declared.type];

        if (lanes === undefined)
        {
            throw new Error(`${owner}: ${buffer.struct}.${name} has unknown type "${declared.type}"`);
        }

        const count = declared.count ?? 1;

        // Carbon hand-pads these structs so no float4-sized member ever needs
        // implicit padding. A catalog entry that breaks that is wrong, so it
        // fails loud rather than silently inserting a gap.
        if (lanes >= 4 && offset % 4)
        {
            throw new Error(
                `${owner}: ${buffer.struct}.${name} would start at float ${offset}, `
                + "which is not a register boundary"
            );
        }

        fields.set(name, {
            name,
            type: declared.type,
            offset,
            size: lanes,
            count,
            default: declared.default ?? null,
            isMatrix: declared.type === Types.MATRIX4,
            isInteger: declared.type === Types.UINT32 || declared.type === Types.INT32
        });

        offset += lanes * count;
    }

    // Tr2PerObjectData.h:57 - "Size of per-object data must be a multiple of
    // Vector4". The same holds for a per-frame buffer's registers. Reproduced
    // so a bad catalog entry fails at build, not on screen.
    if (offset % 4)
    {
        throw new Error(
            `${owner}: ${buffer.struct} is ${offset} floats, not a multiple of Vector4`
        );
    }

    return {
        struct: buffer.struct,
        group,
        key,
        stages: STAGES[key] ?? STAGES.vs,
        fields,
        stride: offset,
        registerCount: offset / 4
    };
}


/**
 * A resolved layout in the shape RawData consumes: float offsets keyed by
 * name, plus the stride, stages, and the defaults to apply on allocation.
 *
 * A default on an array field is repeated across every element: the neutral
 * for a slot - identity for an unused custom mask - applies to every slot, not
 * just the first.
 */
export function toRawLayout(layout)
{
    const fields = {};
    const defaults = [];

    for (const field of layout.fields.values())
    {
        fields[field.name] = {
            offset: field.offset,
            size: field.size,
            elements: field.count,
            encoding: ENCODINGS[field.type] ?? "vector"
        };

        if (field.default)
        {
            defaults.push({
                offset: field.offset,
                values: field.count > 1
                    ? Array.from({ length: field.count }, () => [ ...field.default ]).flat()
                    : [ ...field.default ]
            });
        }
    }

    return { fields, stride: layout.stride, stages: layout.stages, defaults };
}
