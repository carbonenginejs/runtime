// Per-object constant-buffer layout for `EveBasicPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/** EveTransform.h:161-163 - three matrices, the simplest placeable payload. */
export class CjsEveBasicLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "EveBasicPerObjectData",
        fields: {
            world: { type: Types.MATRIX4, default: IDENTITY },
            worldLast: { type: Types.MATRIX4, default: IDENTITY },
            worldInverse: { type: Types.MATRIX4, default: IDENTITY }
        }
    }
  });
}
