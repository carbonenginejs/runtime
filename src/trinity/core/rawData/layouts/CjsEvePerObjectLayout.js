import { CjsSchema } from "#schema";
// Per-object constant-buffer layouts for `EvePerObjectVSData` and `EvePerObjectPSData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/**
 * EveConstantBufferFormats.h:16/:11 - the generic Tr2PerObjectDataStandard
 * pair, consumed by EveLineSet / EveCurveLineSet / EveEllipseSet. Each half is
 * one WorldMat, uploaded as two separate buffers.
 *
 * Modelled on: EvePerObjectVSData (trinity/trinity/Eve/EveConstantBufferFormats.h:16)
 * Modelled on: EvePerObjectPSData (trinity/trinity/Eve/EveConstantBufferFormats.h:11)
 */
export class CjsEvePerObjectLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "EvePerObjectVSData",
        fields: { WorldMat: { type: Types.MATRIX4, default: IDENTITY } }
    },
    ps: {
        struct: "EvePerObjectPSData",
        fields: { WorldMat: { type: Types.MATRIX4, default: IDENTITY } }
    }
  });
}

CjsSchema.meta.define(CjsEvePerObjectLayout, {"className": "CjsEvePerObjectLayout"});
