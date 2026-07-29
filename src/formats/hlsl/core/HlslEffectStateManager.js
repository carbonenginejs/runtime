import { HlslRenderStateSetup } from "./HlslRenderStateSetup.js";

/**
 * In-memory JavaScript substitute for Carbon's effect state manager registry.
 */
export class HlslEffectStateManager
{
    /**
   * Creates empty registries for shaders, programs, render states, and libraries.
   */
    constructor()
    {
        this._nextShader = 1;
        this._nextProgram = 1;
        this._nextRenderState = 1;
        this._nextLibrary = 1;
        this.shaders = new Map();
        this.shaderPrograms = new Map();
        this.renderStates = new Map();
        this.shaderLibraries = new Map();
    }

    /**
   * Registers a shader stage payload and returns a stable numeric handle.
   *
   * @param {number} stageType Trinity shader stage enum value.
   * @param {object} bytecode Captured shader bytecode.
   * @param {object} signature Stage signature metadata.
   * @param {string} [effectName] Source effect name or path.
   * @returns {number} Shader handle.
   */
    RegisterShader(stageType, bytecode, signature, effectName = "")
    {
        const handle = this._nextShader++;
        this.shaders.set(handle, {
            stageType,
            bytecode,
            signature,
            effectName
        });
        return handle;
    }

    /**
   * Registers a shader program from one or more shader handles.
   *
   * @param {number[]} shaderHandles Shader handles in effect stage order.
   * @param {number} [stageCount] Number of active stage handles to use.
   * @returns {number} Shader program handle.
   */
    RegisterShaderProgram(shaderHandles, stageCount = shaderHandles.length)
    {
        const handle = this._nextProgram++;
        this.shaderPrograms.set(handle, {
            shaderHandles: shaderHandles.slice(0, stageCount),
            stageCount
        });
        return handle;
    }

    /**
   * Registers a program override pairing for Carbon-compatible call sites.
   *
   * @param {number} program Base shader program handle.
   * @param {number} overrideProgram Override shader program handle.
   * @returns {number} Override program handle.
   */
    RegisterShaderProgramOverride(program, overrideProgram)
    {
        const handle = this._nextProgram++;
        this.shaderPrograms.set(handle, {
            program,
            overrideProgram,
            isOverride: true
        });
        return handle;
    }

    /**
   * Registers a render-state setup and returns its handle.
   *
   * @param {HlslRenderStateSetup|Map<number, number>|object} states Render-state setup.
   * @returns {number} Render-state handle.
   */
    RegisterRenderStateSetup(states)
    {
        const handle = this._nextRenderState++;
        this.renderStates.set(handle, states instanceof HlslRenderStateSetup ? states : new HlslRenderStateSetup(states));
        return handle;
    }

    /**
   * Registers a DXIL/DXBC library bytecode payload and returns its handle.
   *
   * @param {object} bytecode Captured shader-library bytecode.
   * @returns {number} Shader library handle.
   */
    RegisterShaderLibrary(bytecode)
    {
        const handle = this._nextLibrary++;
        this.shaderLibraries.set(handle, bytecode);
        return handle;
    }

    /**
   * Looks up a registered shader by handle.
   *
   * @param {number} handle Shader handle.
   * @returns {object|null} Registered shader metadata or null.
   */
    GetShader(handle)
    {
        return this.shaders.get(handle) || null;
    }

    /**
   * Looks up a registered shader program by handle.
   *
   * @param {number} handle Shader program handle.
   * @returns {object|null} Registered program metadata or null.
   */
    GetShaderProgram(handle)
    {
        return this.shaderPrograms.get(handle) || null;
    }

    /**
   * Looks up a registered render-state setup by handle.
   *
   * @param {number} handle Render-state handle.
   * @returns {HlslRenderStateSetup|null} Registered render-state setup or null.
   */
    GetRenderStateSetup(handle)
    {
        return this.renderStates.get(handle) || null;
    }
}
