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


import { IDENTITY, Types, ZERO4, buildLayouts, toRawLayout } from "./constantLayout.js";


/** EveTransform.h:161-163 - three matrices, the simplest placeable payload. */
export const EveBasic = Object.freeze({
    vs: {
        struct: "EveBasicPerObjectData",
        fields: {
            world: { type: Types.MATRIX4, default: IDENTITY },
            worldLast: { type: Types.MATRIX4, default: IDENTITY },
            worldInverse: { type: Types.MATRIX4, default: IDENTITY }
        }
    }
});


/** EveMissileWarhead.h:194 */
export const EveMissileWarhead = Object.freeze({
    vs: {
        struct: "EveMissileWarheadPerObjectData",
        fields: {
            world: { type: Types.MATRIX4, default: IDENTITY },
            missileSize: { type: Types.VECTOR4 }
        }
    }
});


/** EveSceneStaticParticles.h:105 */
export const EveSceneStaticParticles = Object.freeze({
    vs: {
        struct: "EveSceneStaticParticlesPerObjectData",
        fields: {
            world: { type: Types.MATRIX4, default: IDENTITY },
            lastWorld: { type: Types.MATRIX4, default: IDENTITY }
        }
    }
});


/**
 * EveConstantBufferFormats.h:16/:11 - the generic Tr2PerObjectDataStandard
 * pair, consumed by EveLineSet / EveCurveLineSet / EveEllipseSet. Each half is
 * one WorldMat, uploaded as two separate buffers.
 */
export const EvePerObject = Object.freeze({
    vs: {
        struct: "EvePerObjectVSData",
        fields: { WorldMat: { type: Types.MATRIX4, default: IDENTITY } }
    },
    ps: {
        struct: "EvePerObjectPSData",
        fields: { WorldMat: { type: Types.MATRIX4, default: IDENTITY } }
    }
});


/**
 * EveLensflare.cpp:41-45 - same bytes bound to VS and PS. `indices[2..3]` are
 * never written in Carbon and are left as allocator garbage.
 */
export const EveLensflare = Object.freeze({
    shared: {
        struct: "EveLensflarePerObjectData",
        fields: {
            directionScale: { type: Types.VECTOR4 },
            indices: { type: Types.UINT32, count: 4 }
        }
    }
});


/** EveSpherePin.h:25 - the ui variant (EveSpherePin.cpp:415-425). */
export const EveSpherePin = Object.freeze({
    shared: {
        struct: "EveSpherePinPerObjectData",
        fields: {
            worldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            pinPosition: { type: Types.VECTOR4 },
            pinRotation: { type: Types.VECTOR4 },
            pinColor: { type: Types.VECTOR4 },
            pinThreshold: { type: Types.VECTOR4 },
            pinRadiusPrecalc: { type: Types.VECTOR4 },
            pinUV: { type: Types.VECTOR4 }
        }
    }
});


/** EveChildSpherePin.h:16 - the same field run as the ui pin. */
export const EveChildSpherePin = Object.freeze({
    shared: {
        struct: "EveChildSpherePinPerObjectData",
        fields: {
            worldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            pinPosition: { type: Types.VECTOR4 },
            pinRotation: { type: Types.VECTOR4 },
            pinColor: { type: Types.VECTOR4 },
            pinThreshold: { type: Types.VECTOR4 },
            pinRadiusPrecalc: { type: Types.VECTOR4 },
            pinUV: { type: Types.VECTOR4 }
        }
    }
});


/**
 * EveSpaceObjectDecal.h:27-45 - uploaded as two constant buffers
 * (cpp:975-976). `unused` shares clipRadius2Sq's register and is Carbon's
 * explicit pad; it is declared so the layout is right and never written.
 */
export const EveSpaceObjectDecal = Object.freeze({
    vs: {
        struct: "DecalVSPerObjectData",
        fields: {
            worldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            invWorldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            decalMatrix: { type: Types.MATRIX4, default: IDENTITY },
            inverseDecalMatrix: { type: Types.MATRIX4, default: IDENTITY },
            parentBoneMatrix: { type: Types.MATRIX4, default: IDENTITY },
            invParentBoneMatrix: { type: Types.MATRIX4, default: IDENTITY }
        }
    },
    ps: {
        struct: "DecalPSPerObjectData",
        fields: {
            // .x killCount (a uint widened to float), .y the 0..1 visibility
            // ramp, .zw reserved (cpp:369-382).
            displayData: { type: Types.VECTOR4 },
            shipData: { type: Types.VECTOR4 },
            clipData: { type: Types.VECTOR4 },
            clipRadius2Sq: { type: Types.FLOAT },
            unused: { type: Types.VECTOR3 },
            shLightingCoefficients: { type: Types.VECTOR4, count: 7, default: ZERO4 }
        }
    }
});


/**
 * EveBoosterSet2.h:48-71 - a VertexShaderData + PixelShaderData pair uploaded
 * as two constant buffers (cpp:1325-1329). `boosterIntensity` is declared on
 * BOTH stages and written separately for each; it is not a duplicate. The
 * padding scalars are Carbon's explicit register pads and stay unwritten.
 */
export const EveBoosterSet = Object.freeze({
    vs: {
        struct: "EveBoosterSetVSData",
        fields: {
            shipMatrix: { type: Types.MATRIX4, default: IDENTITY },
            boosterIntensity: { type: Types.FLOAT },
            shipSpeed: { type: Types.FLOAT },
            maxBoosterSize: { type: Types.FLOAT },
            padding: { type: Types.FLOAT },
            // EVE_MAX_CONTROL_POINT_COUNT (EveBoosterSet2.h:36)
            trailsControlPositions: { type: Types.VECTOR4, count: 5 },
            trailsControlNormals: { type: Types.VECTOR4, count: 5 }
        }
    },
    ps: {
        struct: "EveBoosterSetPSData",
        fields: {
            boosterIntensity: { type: Types.FLOAT },
            trailIntensity: { type: Types.FLOAT },
            warpIntensity: { type: Types.FLOAT },
            padding2: { type: Types.FLOAT }
        }
    }
});


/**
 * EveChildBulletStorm.h:20 - VS only. `targetPositionsWS` slots past the filled
 * target count stay allocator garbage (cpp:403-407); the bound is a bare
 * literal `[10]` in Carbon, not a named constant.
 */
export const EveChildBulletStorm = Object.freeze({
    vs: {
        struct: "EveChildBulletStormPerObjectData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            effectInfo: { type: Types.VECTOR4 },
            targetPositionsWS: { type: Types.VECTOR4, count: 10 }
        }
    }
});


/**
 * EveStretch2.cpp:327-337 - Carbon uploads the contiguous member run
 * m_source..m_effectData[2] (EveStretch2.h:105-109) as four vec4s to VS and PS.
 */
export const EveStretch2 = Object.freeze({
    shared: {
        struct: "EveStretch2PerObjectData",
        fields: {
            sourceData: { type: Types.VECTOR4 },
            destinationData: { type: Types.VECTOR4 },
            effectData: { type: Types.VECTOR4, count: 2 }
        }
    }
});


/**
 * EveSpaceObject2.h:99 (vs) / :122 (ps) - the persistent pair. Unlike every
 * other entry here these live as members on the owner across frames and are
 * READ BACK (GetParentData cpp:1877-1883, GetPerObjectStructs cpp:1485-1490),
 * which is why the record exposes Get accessors at all.
 *
 * The HLSL counterpart names are from shadercompiler/tests/RayTracingTest.cpp:654-666,
 * which declares this block field-for-field.
 */
export const EveSpaceObject = Object.freeze({
    vs: {
        struct: "EveSpaceObjectVSData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            worldTransformLast: { type: Types.MATRIX4, default: IDENTITY },
            invWorldTransform: { type: Types.MATRIX4, default: IDENTITY },
            // Four independent floats, not a bitfield: .x booster glow
            // intensity, .y activation strength, .z dirt level, .w bounding
            // sphere radius. Constructor value at cpp:195.
            shipData: { type: Types.VECTOR4, default: Object.freeze([1, 1, 0, 1]) },
            clipData: { type: Types.VECTOR4 },
            // Carbon's spelling (sic) - "ellpsoid" matches the source struct.
            ellpsoidRadii: { type: Types.VECTOR4 },
            ellpsoidCenter: { type: Types.VECTOR4 },
            // EVE_SPACEOBJECT_CUSTOWMASK_MAX (sic) = 2, EveSpaceObject2.h:49.
            // EveCustomMask::ZeroPerObjectData writes IDENTITY into an unused
            // slot, not zero (EveCustomMask.cpp:88-93).
            customMaskMatrix: { type: Types.MATRIX4, count: 2, default: IDENTITY },
            customMaskData: { type: Types.VECTOR4, count: 2 },
            // GPU ring offsets - engine-owned, no CPU derivation exists.
            boneOffsets: { type: Types.UINT32, count: 4 },
            morphTargetVertexDataOffset: { type: Types.UINT32 },
            morphTargetAnimationDataOffset: { type: Types.UINT32 },
            activeMorphTargetsCount: { type: Types.UINT32 },
            bakedMorphTargetVertexDataOffset: { type: Types.UINT32 },
            customData: { type: Types.VECTOR4, default: Object.freeze([0, 0, 0, 0]) }
        }
    },
    ps: {
        struct: "EveSpaceObjectPSData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            worldTransformLast: { type: Types.MATRIX4, default: IDENTITY },
            invWorldTransform: { type: Types.MATRIX4, default: IDENTITY },
            shipData: { type: Types.VECTOR4, default: Object.freeze([1, 1, 0, 1]) },
            // Clipdata1.xyz / .w - a SIGNED squared radius; the sign carries
            // the inside/outside test (RayTracingTest.cpp:678-679).
            clipSphereCenter: { type: Types.VECTOR3 },
            clipRadiusSq: { type: Types.FLOAT },
            // Miscdata.xyzw - all four lanes used.
            clipRadius2Sq: { type: Types.FLOAT },
            impactDataOffset: { type: Types.FLOAT },
            clipSphereFactor2: { type: Types.FLOAT },
            clipSphereFactor: { type: Types.FLOAT },
            // Tr2ShLightingManager::PACKED_COEFFICIENT_COUNT = 7.
            shLightingCoefficients: { type: Types.VECTOR4, count: 7, default: ZERO4 },
            customMaskMaterialIDs: { type: Types.VECTOR4, count: 2 },
            customMaskTargets: { type: Types.VECTOR4, count: 2 },
            // Both slots packed into one vec4: (u0, v0, u1, v1).
            customMaskClamps: { type: Types.VECTOR4 },
            // EveSpaceObject2 never writes this; the children's literal is the
            // only documented neutral (EveChildMesh.cpp:65).
            screenSize: { type: Types.VECTOR4, default: Object.freeze([0.5, 0.5, 0.5, 1]) },
            customData: { type: Types.VECTOR4, default: Object.freeze([0, 0, 0, 0]) }
        }
    }
});


/**
 * EveTurretSet.h:47 (vs) / :63 (ps). The turret translation and rotation rings
 * are filled for VISIBLE turrets only; the remainder stays allocator garbage.
 */
export const EveTurretSet = Object.freeze({
    vs: {
        struct: "EveTurretSetVSData",
        fields: {
            baseCutoffData: { type: Types.VECTOR4 },
            turretSetData: { type: Types.VECTOR4 },
            shipMatrix: { type: Types.MATRIX4, default: IDENTITY },
            prevShipMatrix: { type: Types.MATRIX4, default: IDENTITY },
            // GPU bone-ring offsets - engine-owned.
            currentBoneOffset: { type: Types.UINT32 },
            prevBoneOffset: { type: Types.UINT32 },
            _unused: { type: Types.UINT32, count: 2 },
            // EVE_MAX_TURRETS_PER_SET (EveTurretSet.h:43)
            turretTranslation: { type: Types.VECTOR4, count: 24 },
            turretRotation: { type: Types.QUATERNION, count: 24 }
        }
    },
    ps: {
        struct: "EveTurretSetPSData",
        fields: {
            shipData: { type: Types.VECTOR4 },
            clipData1: { type: Types.VECTOR4 },
            clipRadius2Sq: { type: Types.FLOAT },
            unused: { type: Types.VECTOR3 },
            shLightingCoefficients: { type: Types.VECTOR4, count: 7, default: ZERO4 }
        }
    }
});


/**
 * EveSpaceObject2.h:143 - the merged VS+PS variant used by the instanced path.
 * Uploaded through a STRUCTURED BUFFER rather than a constant buffer
 * (EveInstancedMeshManager.cpp:69-77), so it carries no register.
 *
 * Field order is NOT the same as the EveSpaceObject VS/PS pair: the five clip
 * scalars sit at fields 6-10 here, before the ellipsoid. Since the upload is a
 * raw memcpy, that order is the contract.
 */
export const EveSpacePerObject = Object.freeze({
    shared: {
        struct: "EveSpacePerObjectData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            worldTransformLast: { type: Types.MATRIX4, default: IDENTITY },
            invWorldTransform: { type: Types.MATRIX4, default: IDENTITY },
            // This struct's own initialiser is (0,0,0,0), unlike the
            // EveSpaceObject2 constructor's (1,1,0,1).
            shipData: { type: Types.VECTOR4 },
            clipSphereCenter: { type: Types.VECTOR3 },
            clipRadiusSq: { type: Types.FLOAT },
            clipRadius2Sq: { type: Types.FLOAT },
            impactDataOffset: { type: Types.FLOAT },
            clipSphereFactor2: { type: Types.FLOAT },
            clipSphereFactor: { type: Types.FLOAT },
            ellpsoidRadii: { type: Types.VECTOR4 },
            ellpsoidCenter: { type: Types.VECTOR4 },
            // EveSpaceObject2.h:160 initialises this to all-zero, contradicting
            // EveCustomMask::ZeroPerObjectData's IdentityMatrix. The zero path
            // is the live one, so identity wins; reproduced as written.
            customMaskMatrix: { type: Types.MATRIX4, count: 2, default: IDENTITY },
            customMaskData: { type: Types.VECTOR4, count: 2 },
            customMaskMaterialIDs: { type: Types.VECTOR4, count: 2 },
            customMaskTargets: { type: Types.VECTOR4, count: 2 },
            customMaskClamps: { type: Types.VECTOR4 },
            boneOffsets: { type: Types.UINT32, count: 4 },
            customData: { type: Types.VECTOR4 },
            shLighting: { type: Types.VECTOR4, count: 7, default: ZERO4 }
        }
    }
});


/** Tr2ConstantBufferFormats.h:35 - the generic, non-EVE per-object block. */
/**
 * Tr2ConstantBufferFormats.h:35. Catalogued but deliberately PRODUCERLESS in
 * this package: its only Carbon filler is `Tr2InteriorPlaceable::GetPerObjectData`
 * (Interior/Tr2InteriorPlaceable.cpp:555-585), and interior placeables are not
 * Trinity-layer classes. The layout lives here because the catalog is the
 * org-wide truth, exported on the `/perobject` subpath; whichever package ports
 * the placeable consumes it from there rather than redeclaring it.
 */
export const Tr2PerObject = Object.freeze({
    vs: {
        struct: "Tr2PerObjectVSData",
        fields: {
            WorldMat: { type: Types.MATRIX4, default: IDENTITY },
            boundingCylinderLocalHeight: { type: Types.FLOAT },
            boundingCylinderLocalXZCenter: { type: Types.VECTOR2 },
            boundingCylinderRotation: { type: Types.FLOAT }
        }
    }
});


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
