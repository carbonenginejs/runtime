// Carbon per-object constant-buffer ABI, sourced from the runtime Trinity layer.
//
// The layouts themselves are NOT declared here. `runtime/src/trinity` owns
// them in `CjsPerObjectLayouts`, and this module imports that one leaf through
// the narrow internal per-object subpath. The leaf has no imports of its own,
// so the rest of the Trinity layer does not come with it.
//
// This file adds only what a TOOL needs and a runtime does not:
//
//   - the HLSL names a shader declares, for naming an anonymous `cbN[i]` slot
//   - the constant-buffer register each stage binds to
//   - byte-level geometry (byte offsets, register/component positions), which
//     the Trinity layer has no use for because it writes through named fields
//
// This module previously carried a second copy of the layouts, kept in step
// with the former `runtime-trinity` donor's by a test. That fork is gone.

import { CjsPerObjectLayouts } from "#trinity/perobject";


/** Declared C++ member types. Re-exported so consumers need one import. */
export const CjsPerObjectTypes = CjsPerObjectLayouts.Types;


/**
 * Bytes per declared type, and the encoder kind that writes it. Sizes are
 * derived rather than declared: a type's float count comes from the Trinity
 * layout catalog, so the two cannot disagree.
 */
export const CjsPerObjectFieldType = Object.freeze({
    matrix4: { floats: 16, bytes: 64 },
    quaternion: { floats: 4, bytes: 16 },
    vector4: { floats: 4, bytes: 16 },
    vector3: { floats: 3, bytes: 12 },
    vector2: { floats: 2, bytes: 8 },
    float: { floats: 1, bytes: 4 },
    uint32: { floats: 1, bytes: 4 },
    int32: { floats: 1, bytes: 4 }
});


/**
 * Constant-buffer slot convention, from the two places that establish it:
 * Tr2Renderer.cpp:37-43 (engine side, "these are actually constant buffer
 * indices") and shadercompiler/ParserUtils.cpp:523-561 (compiler side, which
 * maps a declared cbuffer NAME to its index).
 *
 * Note per-object VS is cb3, not cb2 - cb2 is per-frame PS.
 */
export const CjsPerObjectRegister = Object.freeze({
    globals: 0,
    perFrameVS: 1,
    perFramePS: 2,
    perObjectVS: 3,
    perObjectPS: 4,
    perObjectRTVertexBuffer: 5,
    uiTransforms: 6
});


/** Carbon array bounds, for callers that need them without a layout lookup. */
export const CjsPerObjectLimits = Object.freeze({
    /** EveSpaceObject2.h:49 - `EVE_SPACEOBJECT_CUSTOWMASK_MAX` (sic). */
    customMaskCount: 2,

    /** Tr2ShLightingManager.h:51 - `PACKED_COEFFICIENT_COUNT`. */
    shCoefficientCount: 7,

    /** EveTurretSet.h:43 - `EVE_MAX_TURRETS_PER_SET`. */
    turretCount: 24,

    /** EveBoosterSet2.h:36 - `EVE_MAX_CONTROL_POINT_COUNT`. */
    controlPointCount: 5
});


/**
 * HLSL names for fields whose shader-side spelling differs from Carbon's C++
 * member name, so a decoded `cbN[i]` can be reported the way the shader
 * declares it.
 *
 * Source: shadercompiler/tests/RayTracingTest.cpp:654-666, which declares
 * PerObjectPS field-for-field. Only divergent names are listed; anything absent
 * uses the C++ name.
 */
const HLSL_NAMES = Object.freeze({
    EveSpaceObjectPSData: Object.freeze({
        worldTransform: "WorldMat",
        worldTransformLast: "WorldMatLast",
        invWorldTransform: "InvWorldMat",
        shipData: "Shipdata",
        clipSphereCenter: "Clipdata1.xyz",
        clipRadiusSq: "Clipdata1.w",
        clipRadius2Sq: "Miscdata.x",
        impactDataOffset: "Miscdata.y",
        clipSphereFactor2: "Miscdata.z",
        clipSphereFactor: "Miscdata.w",
        shLightingCoefficients: "ShLighting",
        customMaskMaterialIDs: "CustomMaskMaterialIDs",
        customMaskTargets: "CustomMaskTargets",
        customMaskClamps: "CustomMaskClamps",
        screenSize: "ScreenSize"
    })
});


/** Every catalogued struct name. */
export function perObjectStructNames()
{
    return CjsPerObjectLayouts.Names();
}


/**
 * One struct's ABI: the Trinity layout plus the tools layer's byte-level
 * geometry and shader-side names. Null when the struct is not catalogued -
 * callers must treat that as "not covered" and fail rather than guess.
 */
export function perObjectStruct(name)
{
    const layout = CjsPerObjectLayouts.Get(name);

    if (!layout)
    {
        return null;
    }

    const hlsl = HLSL_NAMES[name] ?? {};
    const fields = [];

    for (const field of layout.fields.values())
    {
        const type = CjsPerObjectFieldType[field.type];

        fields.push({
            name: field.name,
            type: field.type,
            elements: field.count,
            size: field.size,
            offset: field.offset,
            byteOffset: field.offset * 4,
            byteSize: type.bytes * field.count,
            default: field.default,
            isMatrix: field.isMatrix,
            isInteger: field.isInteger,
            hlsl: hlsl[field.name] ?? null
        });
    }

    return {
        struct: name,
        group: layout.group,
        stages: layout.stages,
        // A shared payload binds both slots; report the vertex one, which is
        // where Carbon's mask starts (Tr2Renderer.h:74-81).
        register: layout.stages.includes("vs")
            ? CjsPerObjectRegister.perObjectVS
            : CjsPerObjectRegister.perObjectPS,
        fields,
        stride: layout.stride,
        byteSize: layout.stride * 4,
        registerCount: layout.registerCount
    };
}
