// Source: trinity/trinityal/dx11/Tr2ShaderProgramALDx11.h
// Source: trinity/trinityal/dx11/Tr2ShaderProgramALDx11.cpp
// Source: trinity/trinityal/include/Tr2ShaderProgramAL.h
//
// The WebGL2 shader program: the stages linked into one `WebGLProgram`, and
// the binding tables the render context binds through.
//
// dx11's program only collects its stages and builds the register map
// (`Tr2ShaderProgramALDx11.cpp:11-86`); D3D11 binds each stage's registers
// separately, so nothing needs linking. WebGL2 links the stages into one
// program, and a register is not a binding slot there - a constant buffer is a
// named uniform array or uniform block, a texture a named sampler uniform on a
// texture unit. So linking also lays those out, from each stage's WebGL backend
// block (`Tr2ShaderALWebgl2.GetStageBlock`):
//
// - VERTEX INPUTS are bound to attribute locations equal to their DXBC input
//   registers before linking, so a vertex layout can address a register
//   without knowing the program. Linked scalar categories are kept separately:
//   the GLSL emitter float-lowers integer inputs while retaining DXBC reflection.
// - CONSTANT BUFFERS in the `array` style are `uniform vec4 cbN[]`, set with
//   `uniform4fv`; in the `std140` style they are uniform blocks named
//   `ConstantBufferN`, each given its own binding point here.
// - TEXTURES and the data textures that stand in for typed and structured
//   buffers are sampler uniforms, each given its own texture unit here. A
//   texture's sampler is the sampler register it is paired with at its sample
//   sites. WebGL2 carries one sampler per unit, so a texture the shader samples
//   through two different samplers is recorded as `samplerConflict`; the
//   render context binds the first and reports it.
// - FRAGMENT OUTPUTS retain the emitter's OSGN-derived names and locations.
//   Linking resolves active outputs once; the render context enables only their
//   attached draw buffers, without discarding the other bound targets.
//
// A compute stage runs as a fragment pass (see `Tr2ShaderALWebgl2`), so a
// compute-only program is linked with a full-screen vertex stage of its own.

import { CjsSchema, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult, Failed } from "../ALResult.js";
import * as CcpLog from "../../global/logging/ccpLog.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2RegisterMapAL } from "../Tr2ResourceSetAL/Tr2RegisterMapAL.js";
import { ShaderType } from "#consts/render-context";
import { CARBON_BACKEND_ADDRESS_MODES_SYMBOL } from "#resource/format/carbonEffect/carbonEffectBackendBlock";


/** The full-screen triangle a compute-as-fragment pass draws with. */
const FULL_SCREEN_VERTEX = `#version 300 es
void main()
{
    vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

/** Binding kinds a shader samples through a texture unit. */
const TEXTURE_KINDS = new Set([ "resource", "bufferTexture", "structuredTexture", "uavTexture" ]);

/** The texture units WebGL2 guarantees each stage; a larger device limit is not relied on. */
const TEXTURE_UNITS_PER_STAGE = 16;

/** Ours: where a program's link stands; see IsGood. */
const LINK_NONE = 0;
const LINK_PENDING = 1;
const LINK_GOOD = 2;
const LINK_FAILED = 3;

/** The uniform-block name the emitter's `std140` profile gives constant buffer `cbN`. */
function BlockNameOf(name)
{
  return name.startsWith("cb") ? `ConstantBuffer${name.slice(2)}` : name;
}


/**
 * Linked shader stages on a WebGL2 device.
 *
 * Carbon: Tr2ShaderProgramAL (trinity/trinityal/dx11/Tr2ShaderProgramALDx11.h:13)
 */
export class Tr2ShaderProgramALWebgl2 extends Tr2DeviceResourceAL
{
  /** m_isValid */
  _isValid = false;

  /** m_shaders: the stages, keyed by `ShaderType`. */
  _shaders = new Map();

  /** m_vertexShader */
  _vertexShader = null;

  /** m_registerMap */
  _registerMap = new Tr2RegisterMapAL();

  /** The linked `WebGLProgram`, or null. */
  _program = null;

  /** The full-screen vertex stage a compute-only program was linked with. */
  _fullScreenShader = null;

  /** Constant buffers: `{ stage, registerIndex, name, style, sizeInVec4, location?, bindingPoint? }`. */
  _constantBuffers = [];

  /** Sampler uniforms: `{ stage, kind, registerIndex, name, unit, samplerRegister, samplerConflict }`. */
  _textures = [];

  /** Bone uniform blocks: `{ name, bindingPoint, byteLength }`. A block is not a texture, so it costs no unit. */
  _boneBlocks = [];

  /** Vertex inputs: `{ register, name, semanticName, semanticIndex, componentTypeName, mask }`. */
  _vertexInputs = [];

  /** @adapted Linked GLSL scalar categories by location; logical DXBC integer inputs can be float-lowered. */
  _vertexAttributeTypes = new Map();

  /** @adapted WebGL2 draw buffers may enable only locations active in the linked fragment stage. */
  _fragmentOutputMask = 0;

  /** Ours: where linking stands: LINK_NONE, LINK_PENDING, LINK_GOOD or LINK_FAILED. */
  _linkState = LINK_NONE;

  /** Ours: the KHR_parallel_shader_compile extension when linking runs in parallel, else null. */
  _parallel = null;

  /** Ours: the pixel or compute stage, for laying out fragment outputs once the link finishes. */
  _fragmentStage = null;

  /** The linker's info log from the last failed link. */
  _log = "";

  /** m_name */
  _name = "";

  /** The context the program was linked on. */
  _gl = null;

  /**
   * The register map (`Tr2ShaderProgramAL::GetRegisterMap`).
   *
   * @implemented
   * @returns {Tr2RegisterMapAL} The map.
   */
  GetRegisterMap()
  {
    return this._registerMap;
  }

  /**
   * Builds command signatures for indirect draws. Carbon implements this only
   * on DX12 and answers `E_FAIL` everywhere else
   * (`trinityal/src/Tr2ShaderProgramAL.cpp:34-43`); WebGL2 has no indirect
   * draws at all.
   *
   * @notSupported
   * @param {object} _bufferLayout The indirect buffer layout.
   * @param {object} _renderContext The context.
   * @returns {number} `E_FAIL`.
   */
  CreateCommandSignatures(_bufferLayout, _renderContext)
  {
    return ALResult.E_FAIL;
  }

  /**
   * Collects the stages and links them (`Tr2ShaderProgramALDx11.cpp:11-73`).
   *
   * The refusals are dx11's: an invalid context, no stages, an invalid stage,
   * two stages of one type. Linking and laying out the bindings is WebGL2's;
   * see the head comment.
   *
   * The stages arrive as `Tr2ShaderAL` values, as dx11's `::Tr2ShaderAL*`
   * array does, and each one's implementation is read as dx11 reads
   * `shaders[i].m_shader` (`:48-49`).
   *
   * @adapted Links WebGL stages, refuses a stage over its texture-unit budget, and verifies retained output locations.
   * @param {object[]} shaders The `Tr2ShaderAL` stages.
   * @param {number} count How many of them to link.
   * @param {object} renderContext The context to link against.
   * @returns {number} An `ALResult` value.
   */
  Create(shaders, count, renderContext)
  {
    this._Reset();

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_INVALIDCALL;

    if (count === 0) return ALResult.E_INVALIDARG;

    const stages = new Map();
    const linked = [];

    for (let i = 0; i < count; ++i)
    {
      if (!shaders[i].IsValid()) return ALResult.E_INVALIDARG;

      const type = shaders[i].GetType();
      if (stages.has(type)) return ALResult.E_INVALIDARG;
      if (type !== ShaderType.VERTEX_SHADER && type !== ShaderType.PIXEL_SHADER && type !== ShaderType.COMPUTE_SHADER)
      {
        return ALResult.E_INVALIDARG;
      }

      const shader = shaders[i].TrinityALImpl_GetObject();
      stages.set(type, shader);
      linked.push(shader);
    }

    if (!this._FitsTextureUnits(stages)) return ALResult.E_INVALIDARG;

    const gl = al.GetWebgl2();
    const program = gl.createProgram();
    if (!program) return ALResult.E_OUTOFMEMORY;

    this._gl = gl;

    if (stages.has(ShaderType.VERTEX_SHADER))
    {
      gl.attachShader(program, stages.get(ShaderType.VERTEX_SHADER).GetGpuResource());
    }
    else if (stages.has(ShaderType.COMPUTE_SHADER))
    {
      this._fullScreenShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(this._fullScreenShader, FULL_SCREEN_VERTEX);
      gl.compileShader(this._fullScreenShader);
      gl.attachShader(program, this._fullScreenShader);
    }

    const fragment = stages.get(ShaderType.PIXEL_SHADER) ?? stages.get(ShaderType.COMPUTE_SHADER);
    if (fragment) gl.attachShader(program, fragment.GetGpuResource());

    const vertexBlock = stages.get(ShaderType.VERTEX_SHADER)?.GetStageBlock() ?? null;
    this._vertexInputs = vertexBlock ? vertexBlock.stageInputs.slice() : [];
    for (const input of this._vertexInputs) gl.bindAttribLocation(program, input.register, input.name);

    gl.linkProgram(program);

    this._program = program;
    this._shaders = stages;
    this._vertexShader = stages.get(ShaderType.VERTEX_SHADER) ?? null;
    this._fragmentStage = fragment ?? null;
    this._registerMap = new Tr2RegisterMapAL({ shaders: linked });
    this._isValid = true;

    // PARALLEL LINKING (KHR_parallel_shader_compile): nothing here waits for
    // the driver. The program exists now and IsGood answers false until the
    // driver reports completion; draws and resource sets skip it until then.
    this._parallel = al.GetParallelShaderCompile();
    this._linkState = LINK_PENDING;
    if (this._parallel) return ALResult.S_OK;

    // Without the extension the link is finished now, as before, so a refusal
    // is Create's failure.
    const result = this._FinishLink();
    if (Failed(result)) this._Reset();
    return result;
  }

  /**
   * Ours: whether the program has finished linking and can draw. With
   * KHR_parallel_shader_compile it polls the driver without waiting
   * (`COMPLETION_STATUS_KHR`) and finishes the link the first time it is
   * done; a failed link is permanently not good, and logs once. A failed
   * program is also reset, so it is no longer valid, as one refused at Create
   * is not. Without the extension the link finished in Create.
   *
   * @cjs
   * @returns {boolean} Whether the program is linked and laid out.
   */
  IsGood()
  {
    if (this._linkState === LINK_GOOD) return true;
    if (this._linkState !== LINK_PENDING || !this._isValid) return false;
    if (!this._gl.getProgramParameter(this._program, this._parallel.COMPLETION_STATUS_KHR)) return false;
    if (Failed(this._FinishLink()))
    {
      // Permanently not good: the refusal is logged once, in _FinishLink.
      this._Reset();
      this._linkState = LINK_FAILED;
    }
    return this._linkState === LINK_GOOD;
  }

  /**
   * Reads the finished link and lays the program out: the link status, the
   * attribute types, the fragment outputs and the bindings
   * (`Tr2ShaderProgramALDx11.cpp:51-73` for what dx11 does at Create).
   *
   * @cjs
   * @returns {number} An `ALResult` value; a refusal is logged.
   */
  _FinishLink()
  {
    const gl = this._gl, program = this._program, fragment = this._fragmentStage;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
      // A stage that failed to compile reports here: its compile was not waited for.
      const stageLogs = [ ...this._shaders.values() ].map(stage => stage.GetCompileLog()).filter(Boolean);
      this._log = [ gl.getProgramInfoLog(program) ?? "", ...stageLogs ].filter(Boolean).join("\n");
      this._LogRefusal();
      return ALResult.E_FAIL;
    }

    const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let index = 0; index < attributeCount; ++index)
    {
      const attribute = gl.getActiveAttrib(program, index);
      const location = gl.getAttribLocation(program, attribute.name);
      let scalar = "FLOAT";
      switch (attribute.type)
      {
        case gl.INT: case gl.INT_VEC2: case gl.INT_VEC3: case gl.INT_VEC4: scalar = "INT"; break;
        case gl.UNSIGNED_INT: case gl.UNSIGNED_INT_VEC2: case gl.UNSIGNED_INT_VEC3: case gl.UNSIGNED_INT_VEC4: scalar = "UINT"; break;
      }
      this._vertexAttributeTypes.set(location, scalar);
    }
    if (fragment && !this._LayOutFragmentOutputs(gl, program, fragment))
    {
      this._LogRefusal();
      return ALResult.E_INVALIDARG;
    }
    this._LayOutBindings(gl, program, this._shaders);
    this._linkState = LINK_GOOD;

    return ALResult.S_OK;
  }

  /**
   * Prints why this program was refused. The effect state manager caches a refused
   * program, so each logs once, and its draws are skipped with no GL error to show why.
   *
   * @cjs
   */
  _LogRefusal()
  {
    CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "WebGL2 refused a shader program: %s", this._log);
  }

  /**
   * Whether every stage fits the texture-unit budget. The format's merges stop at
   * their best result even when that is still over budget, so this is where such
   * a shader is refused by name, not left to a link failure or a device that
   * happens to offer more units. Each program logs this once: the effect state
   * manager remembers a refused program.
   *
   * @cjs D3D11 has no such limit to enforce here.
   * @param {Map<number, Tr2ShaderALWebgl2>} stages The stages, by `ShaderType`.
   * @returns {boolean} Whether all of them fit.
   */
  _FitsTextureUnits(stages)
  {
    for (const [ type, shader ] of stages)
    {
      const block = shader.GetStageBlock();
      if (!block) continue;

      const textures = block.bindings.filter(binding => TEXTURE_KINDS.has(binding.kind));
      if (textures.length <= TEXTURE_UNITS_PER_STAGE) continue;

      const names = textures.map(binding => binding.name).join(", ");
      this._log = `Stage ${type} uses ${textures.length} texture units, over the budget of ${TEXTURE_UNITS_PER_STAGE}: ${names}`;
      this._LogRefusal();
      return false;
    }

    return true;
  }

  /**
   * The bone blocks this program reads.
   *
   * @cjs
   * @returns {{name: string, bindingPoint: number, byteLength: number}[]} The blocks.
   */
  GetBoneBlocks()
  {
    return this._boneBlocks;
  }

  /**
   * Resolves the retained output declarations once at link time.
   *
   * @adapted D3D keeps output locations in bytecode; WebGL2 validates active draw buffers.
   * @param {WebGL2RenderingContext} gl The device.
   * @param {WebGLProgram} program The linked program.
   * @param {Tr2ShaderALWebgl2} fragment Its fragment stage.
   * @returns {boolean} Whether active locations agree with the emitter's reflection.
   */
  _LayOutFragmentOutputs(gl, program, fragment)
  {
    const block = fragment.GetStageBlock();
    if (!block)
    {
      this._log = "Fragment output reflection is missing";
      return false;
    }

    const compute = fragment.GetType() === ShaderType.COMPUTE_SHADER;
    const outputs = compute ? block.computeFragment?.uavOutputs ?? [] : block.stageOutputs;
    if (!Array.isArray(outputs))
    {
      this._log = "Fragment output reflection is missing";
      return false;
    }
    for (let index = 0; index < outputs.length; index++)
    {
      const output = outputs[index];
      const name = compute ? output.glslName : output.name;
      const expected = compute ? output.location : output.semanticIndex;
      const location = gl.getFragDataLocation(program, name);
      // OpenGL ES 3.0 GetFragDataLocation returns -1 for inactive outputs.
      if (location === -1) continue;
      if (location !== expected)
      {
        this._log = `Fragment output ${name} linked at ${location}, expected ${expected}`;
        return false;
      }
      this._fragmentOutputMask |= 1 << location;
    }
    return true;
  }

  /**
   * Gives every constant buffer a location or binding point and every sampler
   * uniform a texture unit, from the stages' backend blocks, and sets the
   * sampler uniforms to their units.
   *
   * @adapted WebGL2 has sampler uniforms instead of native resource views;
   *   preserve the packed-light layout from the backend block for the resource set.
   */
  _LayOutBindings(gl, program, stages)
  {
    const previous = gl.getParameter(gl.CURRENT_PROGRAM);
    const units = new Map();
    let nextBindingPoint = 0;

    gl.useProgram(program);

    for (const [ type, shader ] of stages)
    {
      const block = shader.GetStageBlock();
      if (!block) continue;

      for (const binding of block.bindings)
      {
        if (binding.kind === "constantBuffer")
        {
          const record = {
            stage: type,
            registerIndex: binding.registerIndex,
            name: binding.name,
            style: binding.style,
            sizeInVec4: binding.sizeInVec4
          };

          if (binding.symbol === CARBON_BACKEND_ADDRESS_MODES_SYMBOL)
          {
            record.symbol = binding.symbol;
            record.addressModes = { empty: new Float32Array(binding.sizeInVec4 * 4), current: null };
          }

          if (binding.style === "std140")
          {
            const index = gl.getUniformBlockIndex(program, BlockNameOf(binding.name));
            if (index !== gl.INVALID_INDEX)
            {
              record.bindingPoint = nextBindingPoint++;
              gl.uniformBlockBinding(program, index, record.bindingPoint);
            }
          }
          else
          {
            record.location = gl.getUniformLocation(program, binding.name);
          }

          this._constantBuffers.push(record);
          continue;
        }

        if (binding.kind === "structuredUbo")
        {
          const index = gl.getUniformBlockIndex(program, `${binding.name}Block`);
          if (index !== gl.INVALID_INDEX)
          {
            const bindingPoint = nextBindingPoint++;
            gl.uniformBlockBinding(program, index, bindingPoint);
            this._boneBlocks.push({ name: binding.name, bindingPoint, byteLength: binding.capacityElements * binding.strideBytes });
          }
          continue;
        }

        if (!TEXTURE_KINDS.has(binding.kind)) continue;

        // One unit per uniform name: a uniform both stages declare is one uniform.
        let unit = units.get(binding.name);
        if (unit === undefined)
        {
          unit = units.size;
          units.set(binding.name, unit);
          const location = gl.getUniformLocation(program, binding.name);
          if (location) gl.uniform1i(location, unit);
        }

        const paired = binding.pairedSamplerRegisters ?? [];
        const texture = {
          stage: type,
          kind: binding.kind,
          registerIndex: binding.registerIndex,
          name: binding.name,
          unit,
          samplerRegister: paired.length ? paired[0] : null,
          samplerConflict: paired.length > 1,
          format: binding.format ?? null
        };
        const rawDepthLinearLocation = gl.getUniformLocation(program, `cjsRawDepthLinear_${binding.name}`);
        if (rawDepthLinearLocation) texture.rawDepthLinearState = { location: rawDepthLinearLocation, current: false };
        if (binding.localLightRole)
        {
          texture.localLightRole = binding.localLightRole;
          texture.lightIndexRegister = binding.lightIndexRegister;
          texture.lightDataRegister = binding.lightDataRegister;
          texture.lightProfileRegister = binding.lightProfileRegister;
          texture.width = binding.width;
          texture.dataTexelBase = binding.dataTexelBase;
        }
        this._textures.push(texture);
      }
    }

    gl.useProgram(previous);
  }

  /**
   * Carbon's impl `Destroy`, before the registry is left.
   * @adapted Also clears the linked WebGL2 input categories and fragment-output mask.
   */
  _Reset()
  {
    const gl = this._gl;

    if (gl)
    {
      if (this._program) gl.deleteProgram(this._program);
      if (this._fullScreenShader) gl.deleteShader(this._fullScreenShader);
    }

    this._isValid = false;
    this._shaders = new Map();
    this._vertexShader = null;
    this._registerMap = new Tr2RegisterMapAL();
    this._program = null;
    this._fullScreenShader = null;
    this._constantBuffers = [];
    this._textures = [];
    this._boneBlocks = [];
    this._vertexInputs = [];
    this._vertexAttributeTypes = new Map();
    this._fragmentOutputMask = 0;
    this._linkState = LINK_NONE;
    this._parallel = null;
    this._fragmentStage = null;
    this._gl = null;
  }

  /**
   * Releases the program and leaves the device-resource registry.
   *
   * @implemented
   */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the program linked.
   *
   * @implemented
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Which memory class this program occupies.
   *
   * @implemented
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the program for the device-resource registry, with dx11's keys.
   *
   * @implemented
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2ShaderProgramAL";
    description.name = this._name;
  }

  /**
   * Names the program. WebGL has no debug names, so it is kept for `Describe`.
   *
   * @implemented
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }

  /**
   * The linked `WebGLProgram` the render context uses.
   *
   * @returns {WebGLProgram|null} The program.
   */
  GetGpuResource()
  {
    return this._program;
  }

  /**
   * The constant buffers, each with its uniform location (array style) or
   * binding point (std140). See the head comment.
   *
   * @returns {object[]} The records.
   */
  GetConstantBuffers()
  {
    return this._constantBuffers;
  }

  /**
   * The sampler uniforms, each with its texture unit and paired sampler
   * register. See the head comment.
   *
   * @returns {object[]} The records.
   */
  GetTextures()
  {
    return this._textures;
  }

  /**
   * The vertex stage's inputs, bound to attribute locations equal to their
   * registers.
   *
   * @returns {object[]} The inputs.
   */
  GetVertexInputs()
  {
    return this._vertexInputs;
  }

  /**
   * The linker's info log from the last failed `Create`.
   *
   * @returns {string} The log.
   */
  GetLinkLog()
  {
    return this._log;
  }
}

// States against dx11/Tr2ShaderProgramALDx11.cpp (Destroy, IsValid, GetRegisterMap, Describe, SetName; memory class AL_MEMORY_MANAGED). CreateCommandSignatures is dx12-only (dx12/Tr2ShaderProgramALDx12.cpp:357): WebGL2 has no indirect command signatures, so it returns E_FAIL.
CjsSchema.decorateMethod(Tr2ShaderProgramALWebgl2, "Create");
CjsSchema.meta.define("Tr2ShaderProgramALWebgl2")(Tr2ShaderProgramALWebgl2);
CjsSchema.meta.exposureChainTo(Tr2DeviceResourceAL)(Tr2ShaderProgramALWebgl2);
