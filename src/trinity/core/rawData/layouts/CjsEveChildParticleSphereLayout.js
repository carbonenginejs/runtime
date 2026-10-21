import { CjsSchema } from "#schema";
// Per-object constant-buffer layout for `EveChildParticleSpherePerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/**
 * EveChildParticleSphere.cpp:19-41 - the anonymous-namespace record, vertex stage only: the world matrix (written
 * transposed) and its inverse (written as is, which a row-major read sees as the inverse transpose).
 *
 * Modelled on: EveChildParticleSpherePerObjectData::Data (trinity/trinity/Eve/SpaceObject/Children/EveChildParticleSphere.cpp:33)
 */
export class CjsEveChildParticleSphereLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "EveChildParticleSpherePerObjectData",
        fields: {
            world: { type: Types.MATRIX4, default: IDENTITY },
            worldInverseTranspose: { type: Types.MATRIX4, default: IDENTITY }
        }
    }
  });
}

CjsSchema.meta.define(CjsEveChildParticleSphereLayout, {"className": "CjsEveChildParticleSphereLayout"});
