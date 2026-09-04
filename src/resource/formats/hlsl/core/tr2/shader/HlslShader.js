import { HlslRenderContextEnum } from "../HlslRenderContextEnum.js";
import { ANY_TECHNIQUE, HlslEffectDescription } from "./HlslEffectDescription.js";

/**
 * Trinity shader wrapper around a decoded `HlslEffectDescription`.
 */
export class HlslShader
{
    /**
   * Creates an empty shader wrapper.
   */
    constructor()
    {
        this.m_sortValue = 0;
        this.m_effect = new HlslEffectDescription();
        this.m_hasVertexBufferAccessInRtShadow = false;
    }

    /**
   * Finds a technique index by name, or returns the first technique for `ANY_TECHNIQUE`.
   *
   * @param {string} [name] Technique name to locate.
   * @returns {number} Technique index, or -1 when missing.
   */
    GetTechniqueIndex(name = ANY_TECHNIQUE)
    {
        if (!this.m_effect.techniques.length)
        {
            return -1;
        }
        if (name === ANY_TECHNIQUE || name === null || name === undefined)
        {
            return 0;
        }
        return this.m_effect.techniques.findIndex((technique) => technique.name === name);
    }

    /**
   * Returns the number of passes in a decoded technique.
   *
   * @param {number} techniqueIndex Technique index.
   * @returns {number} Pass count.
   */
    GetPassCount(techniqueIndex)
    {
        const technique = this.m_effect.techniques[techniqueIndex];
        return technique ? technique.passes.length : 0;
    }

    // THREE METHODS ARE GONE FROM HERE, and this note is why they should not
    // come back. ApplyAllStateForPass, ApplyRenderStates and ApplyShaderOverride
    // mirrored Tr2Shader and reached the state manager as
    // `renderContext?.m_esm?.ApplyShaderProgram?.(...)`. Tr2RenderContext has no
    // `m_esm` property - the manager is private behind GetEffectStateManager() -
    // so every one of those calls short-circuited to nothing while
    // ApplyAllStateForPass still returned true. Nothing ever called them.
    //
    // The placement is the root cause: a format reader has no live render context
    // to import, so the calls had to be duck-typed, and once they were duck-typed
    // the optional chain hid the fact that they never worked. Applying pass state
    // belongs to Tr2Shader on the Trinity side, which is where the effect read
    // path settled it.

    /**
   * Returns the shader-stage bit mask for a technique.
   *
   * @param {number} techniqueIndex Technique index.
   * @returns {number} Shader-stage bit mask.
   */
    GetShaderTypeMask(techniqueIndex)
    {
        return this.m_effect.techniques[techniqueIndex]?.shaderTypeMask || 0;
    }

    /**
   * Finds the first constant metadata record with the supplied name.
   *
   * @param {string} name Constant name.
   * @returns {object|null} Constant metadata or null.
   */
    GetConstant(name)
    {
        for (const technique of this.m_effect.techniques)
        {
            for (const pass of technique.passes)
            {
                for (const stage of pass.stageInputs)
                {
                    const found = stage.constants.find((constant) => constant.name === name);
                    if (found) return found;
                }
            }
        }
        return null;
    }

    /**
   * Finds the first SRV or UAV resource metadata record with the supplied name.
   *
   * @param {string} name Resource name.
   * @returns {object|null} Resource metadata or null.
   */
    GetResource(name)
    {
        for (const technique of this.m_effect.techniques)
        {
            for (const pass of technique.passes)
            {
                for (const stage of pass.stageInputs)
                {
                    for (const resource of stage.resources.values())
                    {
                        if (resource.name === name) return resource;
                    }
                    for (const resource of stage.uavs.values())
                    {
                        if (resource.name === name) return resource;
                    }
                }
            }
        }
        return null;
    }

    /**
   * Looks up annotations attached to a parameter name.
   *
   * @param {string} parameterName Parameter name.
   * @returns {object[]|null} Annotation records or null.
   */
    GetParameterAnnotations(parameterName)
    {
        return this.m_effect.annotations.get(parameterName) || null;
    }

    /**
   * Returns Carbon's compact pass sort value.
   *
   * @returns {number} Sort value.
   */
    GetSortValue()
    {
        return this.m_sortValue;
    }

    /**
   * Returns the decoded effect description.
   *
   * @returns {HlslEffectDescription} Effect description.
   */
    GetEffectDescription()
    {
        return this.m_effect;
    }

    /**
   * Returns the decoded effect description.
   *
   * @returns {HlslEffectDescription} Effect description.
   */
    GetEffect()
    {
        return this.m_effect;
    }

    /**
   * Recomputes Carbon's sort value from the first technique/pass handles.
   */
    ProcessEffect()
    {
        this.m_sortValue = 0;
        const technique = this.m_effect.techniques[0];
        const pass = technique?.passes?.[0];
        if (!pass) return;

        const ps = pass.stageInputs[HlslRenderContextEnum.PIXEL_SHADER]?.m_shader & 0x3ff;
        const vs = pass.stageInputs[HlslRenderContextEnum.VERTEX_SHADER]?.m_shader & 0x3ff;
        const states = pass.renderStates & 0x3ff;
        const numPasses = technique.passes.length & 0x3;

        this.m_sortValue = (numPasses << 30) | (ps << 20) | (vs << 10) | states;
    }

    /**
   * Reports whether this shader uses vertex-buffer access in RT shadow mode.
   *
   * @returns {boolean} True when RT shadow vertex-buffer access is flagged.
   */
    HasVertexBufferAccessInRtShadow()
    {
        return this.m_hasVertexBufferAccessInRtShadow;
    }

    /**
   * Returns a JSON-safe shader wrapper summary.
   *
   * @returns {object} Serializable shader summary.
   */
    toJSON()
    {
        return {
            m_sortValue: this.m_sortValue,
            m_hasVertexBufferAccessInRtShadow: this.m_hasVertexBufferAccessInRtShadow,
            effect: this.m_effect.toJSON()
        };
    }
}
