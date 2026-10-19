import { CjsSchema } from "#schema/CjsSchema";

import { HlslEffectStageInput } from "./HlslEffectStageInput.js";
import { HlslRenderContextEnum } from "../HlslRenderContextEnum.js";

/**
 * Trinity effect pass containing shader stages, resource metadata, and render state.
 */
export class HlslPass
{
    /**
     * One stage input per shader stage, embedded by value (Shader/Tr2EffectDescription.h:203).
     * @type {HlslEffectStageInput[]}
     */
    stageInputs = Array.from(
        { length: HlslRenderContextEnum.SHADER_TYPE_COUNT },
        () => new HlslEffectStageInput()
    );

    /**
     * Render-state setup handle (Shader/Tr2EffectDescription.h:205). Carbon leaves it unset.
     * @type {number}
     */
    renderStates = 0;

    /**
     * Shader-stage bit mask (Shader/Tr2EffectDescription.h:206). Carbon leaves it unset.
     * @type {number}
     */
    shaderTypeMask = 0;

    /**
     * Shader program handle (Shader/Tr2EffectDescription.h:207). Carbon leaves it unset.
     * @type {number}
     */
    shaderProgram = 0;

    /**
     * Resource-set description (Shader/Tr2EffectDescription.h:208). Carbon embeds it by value; ours stays null until the reader builds one.
     * @type {HlslResourceSetDescription|null}
     */
    resourceSetDesc = null;

    /**
     * Indirect draw layout (Shader/Tr2EffectDescription.h:211, DX12/Metal only); ours stays null until the reader builds one.
     * @type {object|null}
     */
    indirectLayout = null;

    /**
     * Registered render-state setup; ours.
     * @type {object|null}
     */
    cjsRenderStateSetup = null;

    /**
   * Returns a JSON-safe pass metadata snapshot.
   *
   * @returns {object} Serializable pass metadata.
   */
    toJSON()
    {
        return {
            stageInputs: this.stageInputs.map((entry) => entry.toJSON()),
            renderStates: this.renderStates,
            shaderTypeMask: this.shaderTypeMask,
            shaderProgram: this.shaderProgram,
            resourceSetDesc: this.resourceSetDesc?.toJSON() ?? null,
            indirectLayout: this.indirectLayout,
            cjsRenderStateSetup: this.cjsRenderStateSetup?.toJSON() ?? null
        };
    }
}

CjsSchema.meta.define(HlslPass, { className: "HlslPass", donors: [ "Tr2Pass" ] });
