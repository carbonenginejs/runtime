// Per-object constant-buffer layout for `EveSpacePerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types, Zero4: ZERO4 } = CjsConstantLayout;


/**
 * EveSpaceObject2.h:143 - the merged VS+PS variant used by the instanced path.
 * Uploaded through a STRUCTURED BUFFER rather than a constant buffer
 * (EveInstancedMeshManager.cpp:69-77), so it carries no register.
 *
 * Field order is NOT the same as the EveSpaceObject VS/PS pair: the five clip
 * scalars sit at fields 6-10 here, before the ellipsoid. Since the upload is a
 * raw memcpy, that order is the contract.
 */
export class CjsEveSpacePerObjectLayout
{
  static structConfig = Object.freeze({
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
}
