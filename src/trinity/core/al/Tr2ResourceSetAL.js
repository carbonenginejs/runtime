// Source: trinity/trinityal/include/Tr2ResourceSetAL.h
// Source: trinity/trinityal/stub/Tr2ResourceSetALStub.cpp
// Source: trinity/trinityal/stub/Tr2ResourceSetALStub.h
//
// A prepared set of textures, samplers and buffers, bound in one call.
//
// THE DESCRIPTION IS WHERE THE DESIGN IS. Carbon's stub resource set is six
// methods that set a flag; the substance lives in the description in
// `include/`, which is shared by every backend. Carbon builds one description,
// creates a set from it against a shader program, and then rebinds THAT per
// draw rather than re-binding each resource.
//
// WHICH IS THE ANSWER TO A QUESTION THIS RUNTIME HAS OPEN. Every WebGPU binding
// currently sits in group 0 with no dynamic offsets, so no bind group can be
// shared between objects and there is nothing for a per-draw cache to cache.
// That was recorded as a design decision to take; it is not one. It is this
// class, and the shape of the answer is Carbon's: a description keyed by shader
// STAGE and register, from which a backend builds whatever its API calls a bind
// group, once.
//
// REGISTERS ARE PER STAGE, which is the part a flat binding model loses.
// `Tr2RegisterMapAL` carries srv, uav and sampler slots for each
// `ShaderType` separately, up to 32 per stage, because t3 in a vertex shader
// and t3 in a pixel shader are different bindings. Carbon's DXBC operands are
// the reason we already know this: the texture/sampler pairing lives in the
// operand, not the name.
//
// NOT PORTED: the heap-view setters (`SetSrvHeapView` and friends), which name a
// descriptor-heap slot rather than a resource. That is a D3D12 residency
// mechanism with no WebGPU counterpart, and Carbon's own stub carries no heap.

import { ShaderType } from "../../../global/consts/renderContext/index.js";
import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";


/** Carbon's `MAX_RESOURCES_IN_STAGE`. */
export const MAX_RESOURCES_IN_STAGE = 32;

/** How many shader stages a register map covers: `SHADER_TYPE_COUNT`. */
const STAGE_COUNT = ShaderType.SHADER_TYPE_COUNT;


function EmptyStages()
{
  return Array.from({ length: STAGE_COUNT }, () => new Array(MAX_RESOURCES_IN_STAGE).fill(null));
}

function ValidSlot(stage, registerIndex)
{
  return Number.isInteger(stage) && stage >= 0 && stage < STAGE_COUNT
    && Number.isInteger(registerIndex) && registerIndex >= 0 && registerIndex < MAX_RESOURCES_IN_STAGE;
}


/**
 * Which registers a shader program reads, per stage.
 *
 * Carbon builds this from a shader signature and compares whole maps for
 * equality, which is how it decides that two draws can share a resource set.
 */
export class Tr2RegisterMapAL
{
  #srvs = EmptyStages();

  #uavs = EmptyStages();

  #samplers = EmptyStages();

  /** Shader-resource slots per stage. @returns {Array} */
  GetSrvs()
  {
    return this.#srvs;
  }

  /** Unordered-access slots per stage. @returns {Array} */
  GetUavs()
  {
    return this.#uavs;
  }

  /** Sampler slots per stage. @returns {Array} */
  GetSamplers()
  {
    return this.#samplers;
  }

  /**
   * Records that a stage reads one register of one kind.
   *
   * @param {string} kind `srv`, `uav` or `sampler`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @returns {boolean} Whether the slot is addressable.
   */
  Use(kind, stage, registerIndex)
  {
    const slots = this.#Slots(kind);

    if (!slots || !ValidSlot(stage, registerIndex)) return false;

    slots[stage][registerIndex] = true;

    return true;
  }

  /**
   * How many registers of one kind are used, across every stage.
   *
   * Carbon keeps `srvCount`, `uavCount` and `samplerCount` as fields; counting
   * on demand cannot drift out of step with the slots.
   *
   * @param {string} kind `srv`, `uav` or `sampler`.
   * @returns {number} The count.
   */
  Count(kind)
  {
    const slots = this.#Slots(kind);

    if (!slots) return 0;

    return slots.reduce((total, stage) => total + stage.filter(Boolean).length, 0);
  }

  /**
   * Whether two maps describe the same registers.
   *
   * Carbon's `operator==`, and the reason it exists: two programs with the same
   * register map can share a resource set.
   *
   * @param {Tr2RegisterMapAL} other The map to compare with.
   * @returns {boolean} True when they match.
   */
  Equals(other)
  {
    if (!(other instanceof Tr2RegisterMapAL)) return false;

    for (const kind of [ "srv", "uav", "sampler" ])
    {
      const mine = this.#Slots(kind);
      const theirs = other.#Slots(kind);

      for (let stage = 0; stage < STAGE_COUNT; stage += 1)
      {
        for (let slot = 0; slot < MAX_RESOURCES_IN_STAGE; slot += 1)
        {
          if (!mine[stage][slot] !== !theirs[stage][slot]) return false;
        }
      }
    }

    return true;
  }

  #Slots(kind)
  {
    if (kind === "srv") return this.#srvs;
    if (kind === "uav") return this.#uavs;
    if (kind === "sampler") return this.#samplers;

    return null;
  }
}


/**
 * What a resource set binds, per shader stage and register.
 */
export class Tr2ResourceSetDescriptionAL
{
  #srvs = EmptyStages();

  #uavs = EmptyStages();

  #samplers = EmptyStages();

  #constantBuffers = EmptyStages();

  /**
   * Binds a shader resource - a texture or a buffer - at one register.
   *
   * A TEXTURE CARRIES ITS COLOUR SPACE HERE, which Carbon's signature makes
   * explicit and defaults to linear. The same texture bound as sRGB and as
   * linear is two different bindings.
   *
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {object} resource A `Tr2TextureAL` or `Tr2BufferAL`.
   * @param {number} [colorSpace] A colour space; linear when omitted.
   * @returns {boolean} Whether the slot is addressable.
   */
  SetSrv(stage, registerIndex, resource, colorSpace = 0)
  {
    if (!ValidSlot(stage, registerIndex)) return false;

    this.#srvs[stage][registerIndex] = { resource, colorSpace };

    return true;
  }

  /**
   * Binds an unordered-access resource at one register.
   *
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {object} resource A `Tr2TextureAL` or `Tr2BufferAL`.
   * @param {number} [mip] The mip level, for a texture.
   * @returns {boolean} Whether the slot is addressable.
   */
  SetUav(stage, registerIndex, resource, mip = 0)
  {
    if (!ValidSlot(stage, registerIndex)) return false;

    this.#uavs[stage][registerIndex] = { resource, mip };

    return true;
  }

  /**
   * Binds a sampler at one register.
   *
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {object} sampler A `Tr2SamplerStateAL`.
   * @returns {boolean} Whether the slot is addressable.
   */
  SetSampler(stage, registerIndex, sampler)
  {
    if (!ValidSlot(stage, registerIndex)) return false;

    this.#samplers[stage][registerIndex] = { sampler };

    return true;
  }

  /**
   * Binds a constant buffer at one register.
   *
   * The register is the one `Tr2Renderer` names - b0 effect, b1/b2 per frame,
   * b3/b4 per object.
   *
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {object} buffer A `Tr2ConstantBufferAL`.
   * @returns {boolean} Whether the slot is addressable.
   */
  SetConstantBuffer(stage, registerIndex, buffer)
  {
    if (!ValidSlot(stage, registerIndex)) return false;

    this.#constantBuffers[stage][registerIndex] = { buffer };

    return true;
  }

  /**
   * What is bound at one register, or null.
   *
   * @param {string} kind `srv`, `uav`, `sampler` or `constantBuffer`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @returns {object|null} The binding.
   */
  Get(kind, stage, registerIndex)
  {
    const slots = this.#Slots(kind);

    if (!slots || !ValidSlot(stage, registerIndex)) return null;

    return slots[stage][registerIndex];
  }

  /**
   * Drops every bound resource, keeping samplers and constant buffers.
   *
   * Carbon `Tr2ResourceSetDescriptionAL::ClearResources`
   * (`trinityal/src/Tr2ResourceSetAL.cpp:439-455`), and the ASYMMETRY IS THE
   * POINT: it walks the srv and uav slots and touches nothing else. A sampler
   * is authored static state that arrives with the effect, so clearing it
   * would throw away a binding nothing is going to put back. Resources are the
   * things that change when a material's textures change, which is why
   * `Tr2Material.InvalidateResourceSets` calls this and not a full reset.
   *
   * MISSED BY THE FIRST PORT of this class, and the omission was live:
   * `InvalidateResourceSets` marked the set dirty while leaving the stale
   * bindings in place, so a material could rebind textures it no longer used.
   */
  ClearResources()
  {
    for (const slots of [ this.#srvs, this.#uavs ])
    {
      for (const stage of slots) stage.fill(null);
    }
  }

  /**
   * The register map this description fills.
   *
   * Carbon constructs a description FROM a register map or a shader program;
   * deriving the map from the description is the same relationship read the
   * other way, and it is what a backend needs to build a layout.
   *
   * @returns {Tr2RegisterMapAL} The map.
   */
  GetRegisterMap()
  {
    const map = new Tr2RegisterMapAL();

    for (const [ kind, slots ] of [ [ "srv", this.#srvs ], [ "uav", this.#uavs ], [ "sampler", this.#samplers ] ])
    {
      slots.forEach((stage, stageIndex) =>
      {
        stage.forEach((binding, registerIndex) =>
        {
          if (binding) map.Use(kind, stageIndex, registerIndex);
        });
      });
    }

    return map;
  }

  #Slots(kind)
  {
    if (kind === "srv") return this.#srvs;
    if (kind === "uav") return this.#uavs;
    if (kind === "sampler") return this.#samplers;
    if (kind === "constantBuffer") return this.#constantBuffers;

    return null;
  }
}


/**
 * A resource set the backend has accepted.
 *
 * Carbon's stub sets a flag and returns success, because the whole meaning of a
 * resource set lives in a descriptor heap or bind group there is none of here.
 * The description is kept, which is the departure every stub in this family
 * makes: a headless caller can read back what it asked to bind.
 */
export class Tr2ResourceSetALStub extends Tr2BaseDeviceResourceAL
{
  /** m_isValid */
  #isValid = false;

  #description = null;

  #program = null;

  /**
   * Creates the resource set against a shader program.
   *
   * @param {Tr2ResourceSetDescriptionAL} description What to bind.
   * @param {object} program A `Tr2ShaderProgramAL`.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult`.
   */
  Create(description, program, renderContext)
  {
    if (!renderContext?.IsValid()) return ALResult.E_INVALIDARG;

    this.#description = description ?? null;
    this.#program = program ?? null;
    this.#isValid = true;

    return ALResult.S_OK;
  }

  /** @returns {boolean} Whether the set was created. */
  IsValid()
  {
    return this.#isValid;
  }

  /** Releases the set. */
  Destroy()
  {
    this.#isValid = false;
    this.#description = null;
    this.#program = null;
  }

  /** @returns {Tr2ResourceSetDescriptionAL|null} What this set binds. */
  GetDescription()
  {
    return this.#description;
  }

  /** @returns {object|null} The program this set was created against. */
  GetProgram()
  {
    return this.#program;
  }

  /** @returns {number} A `Tr2ALMemoryType`. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }
}
