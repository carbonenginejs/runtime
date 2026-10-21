import { CjsSchema } from "#schema";
// Per-object constant-buffer layout for `EveSceneStaticParticlesPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/** Per-object constant-buffer layout for `EveSceneStaticParticlesPerObjectData` (EveSceneStaticParticles.h:105).
 *
 * Modelled on: EveSceneStaticParticlesPerObjectData::Data (trinity/trinity/Eve/Renderable/EveSceneStaticParticles.h:123)
 */
export class CjsEveSceneStaticParticlesLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "EveSceneStaticParticlesPerObjectData",
        fields: {
            world: { type: Types.MATRIX4, default: IDENTITY },
            lastWorld: { type: Types.MATRIX4, default: IDENTITY }
        }
    }
  });
}

CjsSchema.meta.define(CjsEveSceneStaticParticlesLayout, {"className": "CjsEveSceneStaticParticlesLayout"});
