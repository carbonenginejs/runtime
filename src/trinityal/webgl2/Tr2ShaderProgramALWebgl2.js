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
//   without knowing the program.
// - CONSTANT BUFFERS in the `array` style are `uniform vec4 cbN[]`, set with
//   `uniform4fv`; in the `std140` style they are uniform blocks named
//   `ConstantBufferN`, each given its own binding point here.
// - TEXTURES and the data textures that stand in for typed and structured
//   buffers are sampler uniforms, each given its own texture unit here. A
//   texture's sampler is the sampler register it is paired with at its sample
//   sites. WebGL2 carries one sampler per unit, so a texture the shader samples
//   through two different samplers is recorded as `samplerConflict`; the
//   render context binds the first and reports it.
//
// A compute stage runs as a fragment pass (see `Tr2ShaderALWebgl2`), so a
// compute-only program is linked with a full-screen vertex stage of its own.

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2RegisterMapAL } from "../Tr2ResourceSetAL/Tr2RegisterMapAL.js";
import { ShaderType } from "#consts/render-context";


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

/** The uniform-block name the emitter's `std140` profile gives constant buffer `cbN`. */
function BlockNameOf(name)
{
  return name.startsWith("cb") ? `ConstantBuffer${name.slice(2)}` : name;
}


/**
 * Linked shader stages on a WebGL2 device.
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
  m_registerMap = new Tr2RegisterMapAL();

  /** The linked `WebGLProgram`, or null. */
  _program = null;

  /** The full-screen vertex stage a compute-only program was linked with. */
  _fullScreenShader = null;

  /** Constant buffers: `{ stage, registerIndex, name, style, sizeInVec4, location?, bindingPoint? }`. */
  _constantBuffers = [];

  /** Sampler uniforms: `{ stage, kind, registerIndex, name, unit, samplerRegister, samplerConflict }`. */
  _textures = [];

  /** Vertex inputs: `{ register, name, semanticName, semanticIndex, componentTypeName, mask }`. */
  _vertexInputs = [];

  /** The linker's info log from the last failed link. */
  _log = "";

  /** m_name */
  _name = "";

  /** The context the program was linked on. */
  _gl = null;

  /**
   * The register map (`Tr2ShaderProgramAL::GetRegisterMap`).
   *
   * @returns {Tr2RegisterMapAL} The map.
   */
  GetRegisterMap()
  {
    return this.m_registerMap;
  }

  /**
   * Builds command signatures for indirect draws. Carbon implements this only
   * on DX12 and answers `E_FAIL` everywhere else
   * (`trinityal/src/Tr2ShaderProgramAL.cpp:34-43`); WebGL2 has no indirect
   * draws at all.
   *
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
   * @param {Tr2ShaderALWebgl2[]} shaders The stages.
   * @param {object} renderContext The context to link against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(shaders, renderContext)
  {
    this._Reset();

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_INVALIDCALL;

    if (shaders.length === 0) return ALResult.E_INVALIDARG;

    const stages = new Map();

    for (const shader of shaders)
    {
      if (!shader.IsValid()) return ALResult.E_INVALIDARG;

      const type = shader.GetType();
      if (stages.has(type)) return ALResult.E_INVALIDARG;
      if (type !== ShaderType.VERTEX_SHADER && type !== ShaderType.PIXEL_SHADER && type !== ShaderType.COMPUTE_SHADER)
      {
        return ALResult.E_INVALIDARG;
      }

      stages.set(type, shader);
    }

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

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
      this._log = gl.getProgramInfoLog(program) ?? "";
      gl.deleteProgram(program);
      this._Reset();
      return ALResult.E_FAIL;
    }

    this._program = program;
    this._shaders = stages;
    this._vertexShader = stages.get(ShaderType.VERTEX_SHADER) ?? null;
    this._LayOutBindings(gl, program, stages);
    this.m_registerMap = new Tr2RegisterMapAL({ shaders: shaders.slice() });
    this._isValid = true;

    return ALResult.S_OK;
  }

  /**
   * Gives every constant buffer a location or binding point and every sampler
   * uniform a texture unit, from the stages' backend blocks, and sets the
   * sampler uniforms to their units.
   */
  @impl.custom
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
        this._textures.push({
          stage: type,
          kind: binding.kind,
          registerIndex: binding.registerIndex,
          name: binding.name,
          unit,
          samplerRegister: paired.length ? paired[0] : null,
          samplerConflict: paired.length > 1,
          format: binding.format ?? null
        });
      }
    }

    gl.useProgram(previous);
  }

  /** Carbon's impl `Destroy`, before the registry is left. */
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
    this.m_registerMap = new Tr2RegisterMapAL();
    this._program = null;
    this._fullScreenShader = null;
    this._constantBuffers = [];
    this._textures = [];
    this._vertexInputs = [];
    this._gl = null;
  }

  /** Releases the program and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the program linked.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Which memory class this program occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the program for the device-resource registry, with dx11's keys.
   *
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
  @impl.custom
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
  @impl.custom
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
  @impl.custom
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
  @impl.custom
  GetVertexInputs()
  {
    return this._vertexInputs;
  }

  /**
   * The linker's info log from the last failed `Create`.
   *
   * @returns {string} The log.
   */
  @impl.custom
  GetLinkLog()
  {
    return this._log;
  }
}

CjsSchema.define(Tr2ShaderProgramALWebgl2, { className: "Tr2ShaderProgramALWebgl2", carbon: "Tr2ShaderProgramAL" });
