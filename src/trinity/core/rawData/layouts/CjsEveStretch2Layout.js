// Per-object constant-buffer layout for `EveStretch2PerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Types } = CjsConstantLayout;


/**
 * EveStretch2.cpp:327-337 - Carbon uploads the contiguous member run
 * m_source..m_effectData[2] (EveStretch2.h:105-109) as four vec4s to VS and PS.
 */
export class CjsEveStretch2Layout
{
  static structConfig = Object.freeze({
    shared: {
        struct: "EveStretch2PerObjectData",
        fields: {
            sourceData: { type: Types.VECTOR4 },
            destinationData: { type: Types.VECTOR4 },
            effectData: { type: Types.VECTOR4, count: 2 }
        }
    }
  });
}
