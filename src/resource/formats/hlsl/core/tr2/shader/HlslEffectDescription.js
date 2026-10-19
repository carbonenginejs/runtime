import { CjsSchema } from "#schema/CjsSchema";

export const DEFAULT_TECHNIQUE = "Main";
export const ANY_TECHNIQUE = "";

/**
 * Trinity effect-description body decoded from one compiled permutation record.
 *
 * This class no longer reads bytes. The single byte-reading implementation is
 * `CjsCarbonEffectReader` (`src/format/carbonEffect/`), which decodes a body
 * into a record tree; `runtimeDescriptionFromCarbon`
 * (`../../carbonDescriptionToRuntime.js`) maps those records onto this shape,
 * and `HlslEffectRes.GetShaderByIndex` assembles the result onto an instance.
 * The byte walk that used to live here — one of two hand-written copies of
 * Carbon's description layout — was deleted when the read paths converged;
 * its version branches (8..15) moved into the shared reader.
 */
export class HlslEffectDescription
{
    /**
     * Techniques (Shader/Tr2EffectDescription.cpp:20).
     * @type {HlslEffectTechnique[]}
     */
    techniques = [];

    /**
     * Parameter name to annotations (Shader/Tr2EffectDescription.cpp:21).
     * @type {Map<string, HlslEffectParameterAnnotation[]>}
     */
    annotations = new Map();

    /**
     * Container version; ours.
     * @type {number}
     */
    version = 0;

    /**
     * Effect name or path; ours.
     * @type {string}
     */
    effectName = "";

    /**
     * Read failure; ours, null when the body decoded.
     * @type {Error|null}
     */
    readError = null;

    /**
     * Registry that received decoded state; ours, null until assembled.
     * @type {object|null}
     */
    effectStateManager = null;

    /**
   * Returns a JSON-safe summary of decoded techniques and annotations.
   *
   * @returns {object} Serializable effect-description summary.
   */
    toJSON()
    {
        return {
            version: this.version,
            effectName: this.effectName,
            techniques: this.techniques.map((entry) => entry.toJSON()),
            annotations: mapAnnotationToJson(this.annotations),
            readError: this.readError ? {
                name: this.readError.name,
                message: this.readError.message,
                details: this.readError.details || null
            } : null
        };
    }
}

/**
 * Serializes a map of parameter names to annotation arrays.
 *
 * @param {Map<string, object[]>} map Annotation map.
 * @returns {object[]} JSON-safe annotation groups.
 */
function mapAnnotationToJson(map)
{
    return Array.from(map.entries()).map(([ name, annotations ]) => ({
        name,
        annotations: annotations.map((entry) => entry.toJSON())
    }));
}

CjsSchema.meta.define(HlslEffectDescription, { className: "HlslEffectDescription", donors: [ "Tr2EffectDescription" ] });
