import { CjsSchema } from "#schema/CjsSchema";

import { HlslEffectStageInput } from "./HlslEffectStageInput.js";
import { HlslResourceSetDescription } from "../../HlslResourceSetDescription.js";

/**
 * Ray-tracing shader library metadata from v14+ Trinity effects.
 */
export class HlslEffectLibrary
{
    /**
     * Ray payload size (Shader/Tr2EffectDescription.h:217). Carbon leaves it unset.
     * @type {number}
     */
    payloadSize = 0;

    /**
     * Registered library handle (Shader/Tr2EffectDescription.h:218). Carbon leaves it unset.
     * @type {number}
     */
    libraryHandle = 0;

    /**
     * Ray-generation export name (Shader/Tr2EffectDescription.h:220).
     * @type {string}
     */
    rayGenName = "";

    /**
     * Miss export name (Shader/Tr2EffectDescription.h:221).
     * @type {string}
     */
    missName = "";

    /**
     * Closest-hit export name (Shader/Tr2EffectDescription.h:222).
     * @type {string}
     */
    closestHitName = "";

    /**
     * Any-hit export name (Shader/Tr2EffectDescription.h:223).
     * @type {string}
     */
    anyHitName = "";

    /**
     * Intersection export name (Shader/Tr2EffectDescription.h:224).
     * @type {string}
     */
    intersectionName = "";

    /**
     * Hit-group export name (Shader/Tr2EffectDescription.h:225).
     * @type {string}
     */
    hitGroupName = "";

    /**
     * Library export records; ours.
     * @type {object[]}
     */
    exports = [];

    /**
     * Global stage input, embedded by value (Shader/Tr2EffectDescription.h:227).
     * @type {HlslEffectStageInput}
     */
    globalInput = new HlslEffectStageInput();

    /**
     * Local stage input, embedded by value (Shader/Tr2EffectDescription.h:228).
     * @type {HlslEffectStageInput}
     */
    localInput = new HlslEffectStageInput();

    /**
     * Global resource-set description, embedded by value (Shader/Tr2EffectDescription.h:229).
     * @type {HlslResourceSetDescription}
     */
    globalResourceSetDesc = new HlslResourceSetDescription();

    /**
     * Captured library bytecode; ours, null until registered.
     * @type {object|null}
     */
    cjsShaderBytecode = null;

    /**
   * Returns a JSON-safe shader-library metadata snapshot.
   *
   * @returns {object} Serializable shader-library metadata.
   */
    toJSON()
    {
        return {
            payloadSize: this.payloadSize,
            libraryHandle: this.libraryHandle,
            rayGenName: this.rayGenName,
            missName: this.missName,
            closestHitName: this.closestHitName,
            anyHitName: this.anyHitName,
            intersectionName: this.intersectionName,
            hitGroupName: this.hitGroupName,
            exports: this.exports.map((entry) => ({ ...entry })),
            globalInput: this.globalInput.toJSON(),
            localInput: this.localInput.toJSON(),
            globalResourceSetDesc: this.globalResourceSetDesc.toJSON()
        };
    }
}

CjsSchema.meta.define(HlslEffectLibrary, { className: "HlslEffectLibrary", donors: [ "Tr2EffectLibrary" ] });
