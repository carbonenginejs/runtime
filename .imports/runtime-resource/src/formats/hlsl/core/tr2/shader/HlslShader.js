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

    /**
   * Applies shader program and render-state handles for one pass to a render context.
   *
   * @param {number} techniqueIndex Technique index.
   * @param {number} passIndex Pass index.
   * @param {object} renderContext Render context with an `m_esm` state manager.
   * @returns {boolean} True when the pass existed.
   */
    ApplyAllStateForPass(techniqueIndex, passIndex, renderContext)
    {
        const pass = this.m_effect.techniques[techniqueIndex]?.passes?.[passIndex];
        if (!pass) return false;
        renderContext?.m_esm?.ApplyShaderProgram?.(pass.shaderProgram);
        renderContext?.m_esm?.ApplyRenderStates?.(pass.renderStates);
        return true;
    }

    /**
   * Applies only render-state handles for one pass to a render context.
   *
   * @param {number} techniqueIndex Technique index.
   * @param {number} passIndex Pass index.
   * @param {object} renderContext Render context with an `m_esm` state manager.
   * @returns {boolean} True when the pass existed.
   */
    ApplyRenderStates(techniqueIndex, passIndex, renderContext)
    {
        const pass = this.m_effect.techniques[techniqueIndex]?.passes?.[passIndex];
        if (!pass) return false;
        renderContext?.m_esm?.ApplyRenderStates?.(pass.renderStates);
        return true;
    }

    /**
   * Registers and applies a shader program override for a pass.
   *
   * @param {number} techniqueIndex Base technique index.
   * @param {number} passIndex Base pass index.
   * @param {HlslShader} overrideShader Shader providing the override program.
   * @param {number} overridePassIndex Override pass index.
   * @param {object} renderContext Render context with an `m_esm` state manager.
   * @returns {number} Override program handle, or 0 when unavailable.
   */
    ApplyShaderOverride(techniqueIndex, passIndex, overrideShader, overridePassIndex, renderContext)
    {
        const program = this.m_effect.techniques[techniqueIndex]?.passes?.[passIndex]?.shaderProgram;
        const overrideProgram = overrideShader?.m_effect?.techniques?.[0]?.passes?.[overridePassIndex]?.shaderProgram;
        if (!program || !overrideProgram) return 0;
        const combined = renderContext?.m_esm?.RegisterShaderProgramOverride?.(program, overrideProgram) || 0;
        renderContext?.m_esm?.ApplyShaderProgram?.(combined);
        return combined;
    }

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
