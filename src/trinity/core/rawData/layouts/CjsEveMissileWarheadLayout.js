// Per-object constant-buffer layout for `EveMissileWarheadPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/** EveMissileWarhead.h:194 */
export class CjsEveMissileWarheadLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "EveMissileWarheadPerObjectData",
        fields: {
            world: { type: Types.MATRIX4, default: IDENTITY },
            missileSize: { type: Types.VECTOR4 }
        }
    }
  });
}
