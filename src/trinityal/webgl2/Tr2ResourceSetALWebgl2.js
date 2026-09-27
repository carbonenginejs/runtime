// Source: trinity/trinityal/dx11/Tr2ResourceSetALDx11.h
// Source: trinity/trinityal/dx11/Tr2ResourceSetALDx11.cpp
// Source: trinity/trinityal/include/Tr2ResourceSetAL.h
//
// The WebGL2 resource set: a description's shader resources, unordered-access
// views and samplers, resolved per stage and register as dx11 resolves them,
// then placed on the program's texture units.
//
// dx11's `Create` (`Tr2ResourceSetALDx11.cpp:26-172`) walks the register map
// and copies each slot's view into per-stage arrays, which the render context
// binds with `*SSetShaderResources`/`*SSetSamplers` at the draw. WebGL2 has no
// registers: a shader reads a texture through a sampler uniform on a texture
// unit, and `Tr2ShaderProgramALWebgl2` has already given each of those a unit
// and recorded the register it stands for and the sampler register it is paired
// with. So the set keeps dx11's per-stage arrays and adds one more step: for
// each of the program's units, the resource and sampler that fill it.
//
// - RESOURCES, NOT HANDLES. dx11 copies views, which are stable. A WebGL2
//   buffer's data texture is uploaded lazily when first read after a write, so
//   the set keeps the AL resource and the render context asks it for its
//   texture (`GetShaderResourceTexture`) when it binds the unit.
// - NO UNORDERED ACCESS YET. dx11's validation of UAV slots is kept, and the
//   slots are recorded, but a WebGL2 buffer or texture never has an unordered
//   access view, so every one resolves to nothing, exactly as dx11 binds null
//   for a resource created without one. Compute lowered to a fragment pass
//   writes through render targets, which is the render context's business.
// - NO BIND HASHES. dx11 hashes the view pointers per stage to skip redundant
//   binds (`:139-168`); JavaScript objects have no addresses to hash, and the
//   render context compares sets by identity instead.

import { CjsSchema, impl } from "#schema";
import { ShaderType } from "#consts/render-context";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { MAX_RESOURCES_IN_STAGE } from "../Tr2ResourceSetAL/Tr2RegisterMapAL.js";

/** Tr2ResourceSetDescriptionAL::Resource::Type (`Tr2ResourceSetAL.h:74-80`). */
const RESOURCE_NONE = 0;
const RESOURCE_BUFFER = 1;
const RESOURCE_TEXTURE = 2;

/** Tr2ResourceSetDescriptionAL::Sampler::Type (`Tr2ResourceSetAL.h:98-103`). */
const SAMPLER_SAMPLER = 1;

/** dx11's `MAX_RESOURCES` (`Tr2ResourceSetALDx11.h:25`). */
const MAX_RESOURCES = 32;

/** dx11's `StageInput` (`Tr2ResourceSetALDx11.h:27-39`), without the hashes. */
function StageInput()
{
  return {
    resources: new Array(MAX_RESOURCES).fill(null),
    samplers: new Array(MAX_RESOURCES).fill(null),
    resourceCount: 0,
    resourceOffset: 0,
    samplerCount: 0,
    samplerOffset: 0
  };
}


/**
 * A resource set on a WebGL2 device.
 */
export class Tr2ResourceSetALWebgl2 extends Tr2DeviceResourceAL
{
  /**
   * m_stages: per shader stage, `{ resources, samplers }` by register, with
   * dx11's offsets and counts. A resource is `{ resource, colorSpace }`, where
   * `resource` is a `Tr2BufferALWebgl2` or `Tr2TextureALWebgl2`; a sampler is a
   * `Tr2SamplerStateALWebgl2`.
   */
  _stages = Array.from({ length: ShaderType.SHADER_TYPE_COUNT }, StageInput);

  /** m_uavs: by register, always null on WebGL2; see the head comment. */
  _uavs = new Array(MAX_RESOURCES).fill(null);

  /** m_uavOffset */
  _uavOffset = 0;

  /** m_uavCount */
  _uavCount = 0;

  /** m_csUavs */
  _csUavs = false;

  /** m_empty */
  _empty = true;

  /** m_isValid */
  _isValid = false;

  /** m_name */
  _name = "";

  /** The program's texture units, each with what fills it; see `GetUnits`. */
  _units = [];

  /**
   * Resolves the description against the program's register map
   * (`Tr2ResourceSetALDx11.cpp:26-172`), then places the result on the
   * program's texture units.
   *
   * dx11's `ON_BLOCK_EXIT` destroys a set that fails part-way; every failure
   * here returns before anything outlives the call, and `Destroy` runs first.
   *
   * @param {import("../Tr2ResourceSetAL/Tr2ResourceSetDescriptionAL.js").Tr2ResourceSetDescriptionAL} description What to bind.
   * @param {import("./Tr2ShaderProgramALWebgl2.js").Tr2ShaderProgramALWebgl2} program The program it binds against.
   * @param {object} _renderContext Unused, as in dx11.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(description, program, _renderContext)
  {
    this._Reset();

    if (!program.GetRegisterMap().equals(description.m_registerMap)) return ALResult.E_INVALIDARG;

    const map = description.m_registerMap;
    const stages = Array.from({ length: ShaderType.SHADER_TYPE_COUNT }, StageInput);
    const uavs = new Array(MAX_RESOURCES).fill(null);
    let uavOffset = MAX_RESOURCES;
    let uavCount = 0;
    let csUavs = false;
    let hasPsUavs = false;

    for (const stage of stages)
    {
      stage.resourceOffset = MAX_RESOURCES;
      stage.samplerOffset = MAX_RESOURCES;
    }

    for (let stageIndex = 0; stageIndex < ShaderType.SHADER_TYPE_COUNT; stageIndex++)
    {
      const stage = stages[stageIndex];

      for (let registerIndex = 0; registerIndex < MAX_RESOURCES_IN_STAGE; registerIndex++)
      {
        if (map.srvs[stageIndex][registerIndex] >= map.srvCount) continue;

        const desc = description.m_srv[map.srvs[stageIndex][registerIndex]];
        switch (desc.type)
        {
          case RESOURCE_BUFFER:
            stage.resources[registerIndex] = { resource: desc.buffer, colorSpace: 0 };
            break;
          case RESOURCE_TEXTURE:
            stage.resources[registerIndex] = { resource: desc.texture, colorSpace: desc.colorSpace };
            break;
          case RESOURCE_NONE:
            continue;
          default:
            return ALResult.E_INVALIDARG;
        }
        stage.resourceOffset = Math.min(stage.resourceOffset, registerIndex);
        stage.resourceCount = Math.max(stage.resourceCount, registerIndex + 1);
      }

      for (let registerIndex = 0; registerIndex < MAX_RESOURCES_IN_STAGE; registerIndex++)
      {
        if (map.samplers[stageIndex][registerIndex] >= map.samplerCount) continue;

        const desc = description.m_samplers[map.samplers[stageIndex][registerIndex]];
        if (desc.type === SAMPLER_SAMPLER)
        {
          stage.samplers[registerIndex] = desc.sampler;
          stage.samplerOffset = Math.min(stage.samplerOffset, registerIndex);
          stage.samplerCount = Math.max(stage.samplerCount, registerIndex + 1);
        }
      }

      for (let registerIndex = 0; registerIndex < MAX_RESOURCES_IN_STAGE; registerIndex++)
      {
        if (map.uavs[stageIndex][registerIndex] >= map.uavCount) continue;

        const desc = description.m_uav[map.uavs[stageIndex][registerIndex]];
        if (desc.type === RESOURCE_NONE) continue;
        if (stageIndex !== ShaderType.PIXEL_SHADER && stageIndex !== ShaderType.COMPUTE_SHADER) return ALResult.E_INVALIDARG;

        if (stageIndex === ShaderType.PIXEL_SHADER) hasPsUavs = true;
        else if (hasPsUavs) return ALResult.E_INVALIDARG;

        if (desc.type !== RESOURCE_BUFFER && desc.type !== RESOURCE_TEXTURE) return ALResult.E_INVALIDARG;

        // dx11 binds the buffer's m_uav, or the texture's m_uav[mip] when it
        // has that many; a WebGL2 resource has neither.
        uavs[registerIndex] = null;
        uavCount = registerIndex + 1;
        uavOffset = Math.min(uavOffset, registerIndex);
        csUavs = stageIndex === ShaderType.COMPUTE_SHADER;
      }
    }

    let empty;
    if (uavCount)
    {
      empty = false;
      uavCount -= uavOffset;
    }
    else
    {
      empty = true;
      uavOffset = 0;
    }

    for (const stage of stages)
    {
      if (stage.resourceCount > stage.resourceOffset)
      {
        stage.resourceCount -= stage.resourceOffset;
        empty = false;
      }
      else
      {
        stage.resourceCount = 0;
      }

      if (stage.samplerCount > stage.samplerOffset)
      {
        stage.samplerCount -= stage.samplerOffset;
        empty = false;
      }
      else
      {
        stage.samplerCount = 0;
      }
    }

    this._stages = stages;
    this._uavs = uavs;
    this._uavOffset = uavOffset;
    this._uavCount = uavCount;
    this._csUavs = csUavs;
    this._empty = empty;
    this._units = this._PlaceUnits(program);
    this._isValid = true;

    return ALResult.S_OK;
  }

  /**
   * What fills each of the program's texture units: the resource its register
   * holds and the sampler its paired sampler register holds. A buffer read
   * with `texelFetch` has no paired sampler and takes none.
   *
   * @param {import("./Tr2ShaderProgramALWebgl2.js").Tr2ShaderProgramALWebgl2} program The program.
   * @returns {object[]} The placements; see `GetUnits`.
   */
  @impl.custom
  _PlaceUnits(program)
  {
    return program.GetTextures().map(texture =>
    {
      const stage = this._stages[texture.stage];
      const slot = texture.kind === "uavTexture"
        ? this._uavs[texture.registerIndex]
        : stage.resources[texture.registerIndex];
      const sampler = texture.samplerRegister === null ? null : stage.samplers[texture.samplerRegister];

      return {
        unit: texture.unit,
        resource: slot?.resource ?? null,
        colorSpace: slot?.colorSpace ?? 0,
        sampler,
        samplerConflict: texture.samplerConflict
      };
    });
  }

  /**
   * The program's texture units and what fills each, in unit order:
   * `{ unit, resource, colorSpace, sampler, samplerConflict }`. The render
   * context binds `resource.GetShaderResourceTexture(colorSpace)` and
   * `sampler.GetGpuResource()` to `unit`; a null resource or sampler leaves
   * the unit empty, as dx11 binds a null view. `samplerConflict` marks a
   * texture the shader reads through more than one sampler, of which only the
   * first can be honoured.
   *
   * @returns {object[]} The placements.
   */
  @impl.custom
  GetUnits()
  {
    return this._units;
  }

  /** Carbon's impl `Destroy` (`:179-190`), before the registry is left. */
  _Reset()
  {
    this._stages = Array.from({ length: ShaderType.SHADER_TYPE_COUNT }, StageInput);
    this._uavs = new Array(MAX_RESOURCES).fill(null);
    this._uavCount = 0;
    this._uavOffset = 0;
    this._isValid = false;
    this._empty = true;
    this._csUavs = false;
    this._units = [];
  }

  /** Releases the set and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether `Create` succeeded.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Which memory class this set occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the set for the device-resource registry, with dx11's keys.
   *
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2ResourceSetAL";
    description.name = this._name;
  }

  /**
   * Names the set. WebGL has no debug names, so it is kept for `Describe`.
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }
}

CjsSchema.define(Tr2ResourceSetALWebgl2, { className: "Tr2ResourceSetALWebgl2", carbon: "Tr2ResourceSetAL" });
