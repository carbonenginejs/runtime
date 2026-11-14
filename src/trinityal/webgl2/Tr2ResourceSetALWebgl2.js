import { Tr2ResourceSetDescriptionAL } from "../Tr2ResourceSetAL/Tr2ResourceSetDescriptionAL.js";
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

import { CjsSchema } from "#schema";
import { ShaderType } from "#consts/render-context";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { MAX_RESOURCES_IN_STAGE } from "../Tr2ResourceSetAL/Tr2RegisterMapAL.js";
import { CARBON_BACKEND_ADDRESS_MODES_SYMBOL } from "#resource/format/carbonEffect/carbonEffectBackendBlock";

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
 *
 * Carbon: Tr2ResourceSetAL (trinity/trinityal/dx11/Tr2ResourceSetALDx11.h:11)
 */
export class Tr2ResourceSetALWebgl2 extends Tr2DeviceResourceAL
{
  /**
   * m_stages: per shader stage, `{ resources, samplers }` by register, with
   * dx11's offsets and counts. A resource is `{ resource, colorSpace, isBuffer }`, where
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

  /** Generated addressing arrays, keyed by the linked program's binding record. */
  _addressModes = new Map();

  /** Stable owned binding values emulate independently retained API views. */
  _description = null;

  /**
   * Resolves the description against the program's register map
   * (`Tr2ResourceSetALDx11.cpp:26-172`), then places the result on the
   * program's texture units.
   *
   * dx11's `ON_BLOCK_EXIT` destroys a set that fails part-way; every failure
   * here returns before anything outlives the call, and `Destroy` runs first.
   *
   * @adapted
   * @param {import("../Tr2ResourceSetAL/Tr2ResourceSetDescriptionAL.js").Tr2ResourceSetDescriptionAL} description What to bind.
   * @param {import("./Tr2ShaderProgramALWebgl2.js").Tr2ShaderProgramALWebgl2} program The program it binds against.
   * @param {object} _renderContext Unused, as in dx11.
   * @returns {number} An `ALResult` value.
   */
  Create(description, program, _renderContext)
  {
    this._Reset();

    // The bindings are laid out when the link finishes. Until a program linking
    // in parallel is good, the set is refused, and Tr2Material retries on its
    // next apply, as it does after any failed Create.
    if (!program.TrinityALImpl_GetObject().IsGood()) return ALResult.E_FAIL;

    if (!program.GetRegisterMap().equals(description._registerMap)) return ALResult.E_INVALIDARG;

    this._description = new Tr2ResourceSetDescriptionAL({ copy: description });
    description = this._description;
    const map = description._registerMap;
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

        const desc = description._srv[map.srvs[stageIndex][registerIndex]];
        switch (desc.type)
        {
          case RESOURCE_BUFFER:
            stage.resources[registerIndex] = { resource: desc.buffer, colorSpace: 0, isBuffer: true };
            break;
          case RESOURCE_TEXTURE:
            stage.resources[registerIndex] = { resource: desc.texture, colorSpace: desc.colorSpace, isBuffer: false };
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

        const desc = description._samplers[map.samplers[stageIndex][registerIndex]];
        if (desc.type === SAMPLER_SAMPLER)
        {
          // dx11 reads desc.sampler.m_sampler->m_samplerState (Tr2ResourceSetALDx11.cpp:78);
          // the null sampler has no state, which binds none.
          stage.samplers[registerIndex] = desc.sampler.IsValid() ? desc.sampler.TrinityALImpl_GetObject() : null;
          stage.samplerOffset = Math.min(stage.samplerOffset, registerIndex);
          stage.samplerCount = Math.max(stage.samplerCount, registerIndex + 1);
        }
      }

      for (let registerIndex = 0; registerIndex < MAX_RESOURCES_IN_STAGE; registerIndex++)
      {
        if (map.uavs[stageIndex][registerIndex] >= map.uavCount) continue;

        const desc = description._uav[map.uavs[stageIndex][registerIndex]];
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
    // dx11 reads the program as a friend (`program.m_program`); ours is its implementation.
    this._units = this._PlaceUnits(program.TrinityALImpl_GetObject());
    if (!this._units)
    {
      this._Reset();
      return ALResult.E_INVALIDARG;
    }
    this._PlaceAddressModes(program.TrinityALImpl_GetObject());
    this._isValid = true;

    return ALResult.S_OK;
  }

  /**
   * What fills each of the program's texture units: the resource its register
   * holds and the sampler its paired sampler register holds. A buffer read
   * with `texelFetch` has no paired sampler and takes none.
   *
   * Packed light metadata resolves both original source registers. Carbon's
   * copied SRVs (Tr2ResourceSetALDx11.cpp:52-60) are retained here by the copied
   * description's buffer handles; the combined texture belongs to their pair.
   * Profile samples remain outside this data/index-only transport.
   *
   * @param {import("./Tr2ShaderProgramALWebgl2.js").Tr2ShaderProgramALWebgl2} program The program.
   * @returns {object[]|null} The placements, or null for an invalid packed source pair.
   */
  _PlaceUnits(program)
  {
    const textures = program.GetTextures();
    const units = [];
    for (let i = 0; i < textures.length; ++i)
    {
      const texture = textures[i];
      const stage = this._stages[texture.stage];
      if (texture.localLightRole === "packed-texture")
      {
        if (texture.format !== "RGBA32UI"
          || !Number.isInteger(texture.lightIndexRegister) || texture.lightIndexRegister < 0 || texture.lightIndexRegister >= MAX_RESOURCES
          || !Number.isInteger(texture.lightDataRegister) || texture.lightDataRegister < 0 || texture.lightDataRegister >= MAX_RESOURCES) return null;
        const indices = stage.resources[texture.lightIndexRegister];
        const data = stage.resources[texture.lightDataRegister];
        let packedLocalLights = null;
        if (indices || data)
        {
          if (!indices?.isBuffer || !data?.isBuffer || !indices.resource.IsValid() || !data.resource.IsValid()) return null;
          const indexBuffer = indices.resource.TrinityALImpl_GetObject();
          const dataBuffer = data.resource.TrinityALImpl_GetObject();
          if (typeof indexBuffer._GetPackedShaderResource !== "function") return null;
          packedLocalLights = indexBuffer._GetPackedShaderResource(dataBuffer, texture.width, texture.dataTexelBase);
          if (!packedLocalLights) return null;
        }
        units.push({
          unit: texture.unit, resource: indices?.resource ?? null, colorSpace: 0, isBuffer: true,
          sampler: null, samplerConflict: false, packedLocalLights
        });
        continue;
      }
      const slot = texture.kind === "uavTexture"
        ? this._uavs[texture.registerIndex]
        : stage.resources[texture.registerIndex];
      const sampler = texture.samplerRegister === null ? null : stage.samplers[texture.samplerRegister];

      units.push({
        unit: texture.unit,
        resource: slot?.resource ?? null,
        colorSpace: slot?.colorSpace ?? 0,
        isBuffer: slot?.isBuffer ?? false,
        sampler,
        samplerConflict: texture.samplerConflict,
        ...(texture.rawDepthLinearState ? { rawDepthLinearState: texture.rawDepthLinearState } : {})
      });
    }
    return units;
  }

  /**
   * The program's texture units and what fills each, in unit order:
   * `{ unit, resource, colorSpace, isBuffer, sampler, samplerConflict }`. The render
   * context binds `resource.GetShaderResourceTexture(colorSpace)` and
   * `sampler.GetGpuResource()` to `unit`; a null resource or sampler leaves
   * the unit empty, as dx11 binds a null view. `samplerConflict` marks a
   * texture the shader reads through more than one sampler, of which only the
   * first can be honoured. A packed-light placement additionally references its
   * source pair's shared view; writes invalidate it independently of set identity.
   *
   * @returns {object[]} The placements.
   */
  GetUnits()
  {
    return this._units;
  }

  /**
   * Resolves the emitter's resource-indexed modes from Carbon sampler registers.
   * RebuildSamplerOverrides replaces the sampler register for every paired
   * texture (Tr2Effect.cpp:614-635); the owned description already contains that
   * result. Arrays live with this immutable resource set, not with each draw.
   * @adapted WebGL supplies unsupported sampler modes through generated uniforms.
   * @param {object} program The linked WebGL program.
   */
  _PlaceAddressModes(program)
  {
    for (const binding of program.GetConstantBuffers())
    {
      if (binding.symbol !== CARBON_BACKEND_ADDRESS_MODES_SYMBOL) continue;
      const modes = new Float32Array(binding.sizeInVec4 * 4);
      const stage = this._stages[binding.stage];
      for (const texture of program.GetTextures())
      {
        if (texture.stage !== binding.stage || texture.samplerRegister === null
          || texture.registerIndex >= binding.sizeInVec4) continue;
        const sampler = stage.samplers[texture.samplerRegister];
        const description = sampler ? sampler.GetDescription() : null;
        if (!description) continue;
        const offset = texture.registerIndex * 4;
        modes[offset] = description.addressU;
        modes[offset + 1] = description.addressV;
        modes[offset + 2] = description.addressW;
      }
      this._addressModes.set(binding, modes);
    }
  }

  /**
   * The cached modes for an explicitly identified generated binding.
   * @adapted WebGL's draw binding reads the modes its sampler object cannot hold.
   * @param {object} binding The linked program's constant-buffer record.
   * @returns {Float32Array|null} Resolved modes, or null for another program.
   */
  GetAddressModes(binding)
  {
    return this._addressModes.get(binding) ?? null;
  }

  /** Carbon's impl `Destroy` (`:179-190`), before the registry is left. */
  _Reset()
  {
    if (this._description) this._description.ClearResources();
    this._description = null;
    this._stages = Array.from({ length: ShaderType.SHADER_TYPE_COUNT }, StageInput);
    this._uavs = new Array(MAX_RESOURCES).fill(null);
    this._uavCount = 0;
    this._uavOffset = 0;
    this._isValid = false;
    this._empty = true;
    this._csUavs = false;
    this._units = [];
    this._addressModes.clear();
  }

  /**
   * Releases the set and leaves the device-resource registry.
   *
   * @implemented
   */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether `Create` succeeded.
   *
   * @implemented
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Which memory class this set occupies.
   *
   * @implemented
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the set for the device-resource registry, with dx11's keys.
   *
   * @implemented
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
   * @implemented
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }
}

CjsSchema.decorateMethod(Tr2ResourceSetALWebgl2, "Create");
// States against dx11/Tr2ResourceSetALDx11.cpp (Destroy clears the stages, UAVs and flags; SetName stores the name, with no native object to label).
CjsSchema.meta.define("Tr2ResourceSetALWebgl2")(Tr2ResourceSetALWebgl2);
CjsSchema.meta.exposureChainTo(Tr2DeviceResourceAL)(Tr2ResourceSetALWebgl2);
