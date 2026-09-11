// Per-object constant-buffer layout for `EveChildBulletStormPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/**
 * EveChildBulletStorm.h:20 - VS only. `targetPositionsWS` slots past the filled
 * target count stay allocator garbage (cpp:403-407); the bound is a bare
 * literal `[10]` in Carbon, not a named constant.
 */
export class CjsEveChildBulletStormLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "EveChildBulletStormPerObjectData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            effectInfo: { type: Types.VECTOR4 },
            targetPositionsWS: { type: Types.VECTOR4, count: 10 }
        }
    }
  });
}
