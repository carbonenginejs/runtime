// Per-object constant-data layouts.
//
// This catalog has no CarbonEngine counterpart, which is why it is Cjs* rather
// than Tr2*/Tri*: C++ gets a struct's layout free from the type system
// (`accumulator->Allocate<T>()` + placement new), so Carbon never needs to
// declare one. JavaScript has to.
//
// Carbon uploads per-object data by memcpy'ing the C++ struct straight into the
// constant buffer (EveSpaceObject2.cpp:1469-1483), so the C++ declaration order
// IS the byte layout the shader reads. Field ORDER and field SIZE are therefore
// the entire binding contract: renaming a field is safe, reordering or resizing
// one silently shifts every field after it.
//
// The declaration vocabulary and the resolver are shared with the per-frame
// catalog; see constantLayout.js.
//
// Layouts are grouped per object, with up to three buffers:
//
//   vs      - bound to the vertex stage (and cs/gs/hs/ds, per Carbon's mask)
//   ps      - bound to the pixel stage
//   shared  - ONE buffer bound to both stages, where Carbon uploads the same
//             bytes twice rather than declaring a pair
//
// Every matrix stored here is TRANSPOSED, matching Carbon's `= Transpose(m)`
// staging fill. See the carbon-math-conventions skill.
//
// Defaults are frozen and are COPIED into a record's buffer on allocation,
// never assigned by reference. Carbon's arena does not clear on Alloc, so a
// field with no default shows the previous tenant's bytes - that reproduces
// "unwritten slots = allocator garbage". Declaring a default opts a field out
// of that.


// Each group lives in its own file under `layouts/`, named for the donor header
// that declares it. This file composes them and resolves a struct name to the
// layout RawData consumes.

import { Types, buildLayouts, toRawLayout } from "./constantLayout.js";
import { EveBasic } from "./layouts/EveBasic.js";
import { EveMissileWarhead } from "./layouts/EveMissileWarhead.js";
import { EveSceneStaticParticles } from "./layouts/EveSceneStaticParticles.js";
import { EvePerObject } from "./layouts/EvePerObject.js";
import { EveLensflare } from "./layouts/EveLensflare.js";
import { EveSpherePin } from "./layouts/EveSpherePin.js";
import { EveChildSpherePin } from "./layouts/EveChildSpherePin.js";
import { EveSpaceObjectDecal } from "./layouts/EveSpaceObjectDecal.js";
import { EveBoosterSet } from "./layouts/EveBoosterSet.js";
import { EveChildBoosterSet } from "./layouts/EveChildBoosterSet.js";
import { EveChildBulletStorm } from "./layouts/EveChildBulletStorm.js";
import { EveStretch2 } from "./layouts/EveStretch2.js";
import { EveSpaceObject } from "./layouts/EveSpaceObject.js";
import { EveTurretSet } from "./layouts/EveTurretSet.js";
import { EveSpacePerObject } from "./layouts/EveSpacePerObject.js";
import { Tr2PerObject } from "./layouts/Tr2PerObject.js";


const GROUPS = Object.freeze({
    EveBasic,
    EveMissileWarhead,
    EveSceneStaticParticles,
    EvePerObject,
    EveLensflare,
    EveSpherePin,
    EveChildSpherePin,
    EveSpaceObjectDecal,
    EveBoosterSet,
    EveChildBoosterSet,
    EveChildBulletStorm,
    EveStretch2,
    EveSpaceObject,
    EveTurretSet,
    EveSpacePerObject,
    Tr2PerObject
});


/**
 * Resolved per-object layouts, keyed by struct name.
 *
 * Offsets are FLOAT offsets from the start of one record. Carbon's C++ layout
 * needs no padding here because every per-object struct is hand-padded with
 * explicit `_unused` / `padding` members so each float4-sized member already
 * lands on a register boundary; both invariants are asserted at build time.
 */
export class CjsPerObjectLayouts
{

    static Types = Types;

    static Groups = GROUPS;

    /** Resolved layouts by struct name, built once. */
    static #layouts = null;

    /**
     * The layout for one struct name, or null when it is not catalogued. A
     * caller must treat null as "not covered" and fail rather than guess.
     */
    static Get(struct)
    {
        const layouts = CjsPerObjectLayouts.#Resolved();

        return layouts.get(struct) ?? null;
    }

    /** Every catalogued struct name. */
    static Names()
    {
        return [...CjsPerObjectLayouts.#Resolved().keys()];
    }

    /**
     * A layout in the shape RawData consumes: float offsets keyed by name,
     * plus the stride, stages, and the defaults to apply on allocation.
     *
     * `per-object-layouts.test.js` asserts the encodings agree with
     * `RawDataType`, which constantLayout.js deliberately does not import.
     */
    static ToRawLayout(struct)
    {
        const layout = CjsPerObjectLayouts.Get(struct);

        return layout ? toRawLayout(layout) : null;
    }

    /** The group a struct belongs to, with its stage key, or null. */
    static Find(struct)
    {
        for (const [group, buffers] of Object.entries(GROUPS))
        {
            for (const [key, buffer] of Object.entries(buffers))
            {
                if (buffer.struct === struct)
                {
                    return { group, key, buffer };
                }
            }
        }

        return null;
    }

    /**
     * The resolved layout map, built once on first use and cached.
     * @returns {Map} struct name -> resolved layout
     */
    static #Resolved()
    {
        if (!CjsPerObjectLayouts.#layouts)
        {
            CjsPerObjectLayouts.#layouts = buildLayouts(GROUPS, "CjsPerObjectLayouts");
        }

        return CjsPerObjectLayouts.#layouts;
    }

}
