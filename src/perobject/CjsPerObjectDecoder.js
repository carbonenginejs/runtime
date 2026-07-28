// Names the anonymous constant-buffer slots in a translated shader.
//
// A WGSL or GLSL export declares uniforms positionally:
//
//   @group(0) @binding(4) var<uniform> cb4: array<vec4<f32>, 27>;
//
// Nothing in that line says which float4 is `Shipdata`. The information exists,
// but it is split across two sources and neither alone is enough:
//
//   - cb0 ($LocalConstants, the effect's own material parameters) IS named, in
//     the Carbon binding manifest that format-hlsl builds and that format-webgl
//     and format-webgpu both carry - format-webgpu keeps it in the ANLS chunk
//     but never surfaces it into the emitted WGSL.
//   - cb1 through cb4 are shared Carbon ABI blocks. They carry NO member names
//     at any layer, in any package, because Carbon's own shader compiler strips
//     reflection from the persisted stage blob. Their names come from the C++
//     structs instead, via CjsPerObjectAbi.
//
// This module joins the two so a caller can ask "what is cb4[13].w?" and get
// `clipRadiusSq` back.

import { CjsPerObjectRegister } from "./CjsPerObjectAbi.js";
import { CjsPerObjectPacker } from "./CjsPerObjectPacker.js";


const FLOATS_PER_REGISTER = 4;
const BYTES_PER_REGISTER = 16;
const COMPONENTS = "xyzw";


/** Resolves `cbN[i].c` to a named constant, across both naming sources. */
export class CjsPerObjectDecoder
{

    #packer = null;

    /** Struct name bound to each constant-buffer register index. */
    #bindings = new Map();

    /** Named local constants for cb0, keyed by byte offset. */
    #locals = [];

    /**
     * `options.bindings` maps a register index to a catalog struct name, for
     * example `{ 3: "EveSpaceObjectVSData", 4: "EveSpaceObjectPSData" }`. When
     * omitted, the ABI's own register convention is used.
     */
    constructor(options = {})
    {
        this.#packer = options.packer ?? new CjsPerObjectPacker();

        const bindings = options.bindings ?? {
            [CjsPerObjectRegister.perObjectVS]: "EveSpaceObjectVSData",
            [CjsPerObjectRegister.perObjectPS]: "EveSpaceObjectPSData"
        };

        for (const [register, struct] of Object.entries(bindings))
        {
            this.#bindings.set(Number(register), struct);
        }
    }

    /**
     * Adopts the named cb0 constants from a Carbon binding manifest - the
     * `bindings[].carbon.constants` array that format-hlsl produces and that
     * both shader packages carry through.
     *
     * Offsets in that array are BYTE offsets into the stage's local constant
     * blob, not float4 registers.
     */
    AddBindingManifest(stage)
    {
        const bindings = stage?.bindings ?? (Array.isArray(stage) ? stage : []);

        for (const binding of bindings)
        {
            const constants = binding?.carbon?.constants;

            if (!constants?.length)
            {
                continue;
            }

            for (const constant of constants)
            {
                this.#locals.push({
                    name: constant.name,
                    register: binding.registerIndex ?? 0,
                    byteOffset: constant.offset,
                    byteSize: constant.size,
                    dimension: constant.dimension,
                    elements: constant.elements
                });
            }
        }

        return this;
    }

    /**
     * What occupies one register of one constant buffer. Returns an empty array
     * when the register is not covered - an unmapped buffer is reported as
     * unknown, never guessed at.
     */
    Register(registerIndex, slot)
    {
        const local = this.#locals.filter(
            (constant) => constant.register === registerIndex
                && constant.byteOffset < (slot + 1) * BYTES_PER_REGISTER
                && constant.byteOffset + constant.byteSize > slot * BYTES_PER_REGISTER
        );

        if (local.length)
        {
            return local.map((constant) => ({
                source: "effect",
                name: constant.name,
                register: slot,
                component: COMPONENTS[(constant.byteOffset % BYTES_PER_REGISTER) / 4]
            }));
        }

        const struct = this.#bindings.get(registerIndex);

        if (!struct)
        {
            return [];
        }

        return this.#packer.DescribeRegister(struct, slot).map((field) => ({
            source: "abi",
            struct,
            name: field.name,
            hlsl: field.hlsl,
            register: slot,
            component: field.component,
            size: field.size
        }));
    }

    /** The single constant at `cbN[slot].component`, or null. */
    Component(registerIndex, slot, component)
    {
        const lane = slot * FLOATS_PER_REGISTER + COMPONENTS.indexOf(component);

        return this.Register(registerIndex, slot).find((entry) =>
        {
            const start = slot * FLOATS_PER_REGISTER + COMPONENTS.indexOf(entry.component);

            return lane >= start && lane < start + (entry.size ?? 1);
        }) ?? null;
    }

    /**
     * A full annotation of the uniforms a translated shader declares.
     *
     * `uniforms` is `[{ register, registerCount }]`, which is everything a WGSL
     * or GLSL declaration gives you. Each result reports how the buffer was
     * identified and, when the declared size is short, which field the shader's
     * active prefix stops after.
     */
    Annotate(uniforms = [])
    {
        return uniforms.map((uniform) =>
        {
            const struct = this.#bindings.get(uniform.register);
            const layout = struct ? this.#packer.Describe(struct) : null;
            const named = this.#locals.some((constant) => constant.register === uniform.register);

            if (!layout)
            {
                return {
                    register: uniform.register,
                    registerCount: uniform.registerCount,
                    identified: named ? "effect" : "unknown",
                    struct: null,
                    note: named
                        ? "named effect constants; see AddBindingManifest"
                        : "no member names exist for this buffer in any shader package - it needs the Carbon ABI"
                };
            }

            const truncated = uniform.registerCount < layout.registerCount;
            const boundary = truncated
                ? layout.fields.find(
                    (field) => (field.byteOffset + field.byteSize) === uniform.registerCount * BYTES_PER_REGISTER
                )
                : null;

            return {
                register: uniform.register,
                registerCount: uniform.registerCount,
                identified: "abi",
                struct,
                structRegisterCount: layout.registerCount,
                // The export sizes a uniform by the shader's ACTIVE PREFIX, so a
                // short declaration is expected and is not a mismatch.
                truncatedAfter: boundary?.name ?? null,
                unread: truncated && boundary
                    ? layout.fields.filter((field) => field.byteOffset >= uniform.registerCount * BYTES_PER_REGISTER)
                        .map((field) => field.name)
                    : [],
                mismatch: truncated && !boundary
            };
        });
    }

}
