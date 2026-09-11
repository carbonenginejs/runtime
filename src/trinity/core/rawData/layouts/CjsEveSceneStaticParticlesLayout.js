// Per-object constant-buffer layout for `EveSceneStaticParticlesPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/** EveSceneStaticParticles.h:105 */
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
