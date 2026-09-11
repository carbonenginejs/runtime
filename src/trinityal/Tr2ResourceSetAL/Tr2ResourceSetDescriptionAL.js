// Source: trinity/trinityal/include/Tr2ResourceSetAL.h:44-127
// Source: trinity/trinityal/src/Tr2ResourceSetAL.cpp:152-543
import { impl } from "#schema";
import { MAX_RESOURCES_IN_STAGE, Tr2RegisterMapAL } from "./Tr2RegisterMapAL.js";

// Hash identities for the three distinct native invalid implementations:
// src/Tr2BufferAL.cpp:49, src/Tr2TextureAL.cpp:16, src/Tr2SamplerStateAL.cpp:10.
// Null remains the existing JS AL's invalid handle representation in records.
const nullBuffer = {};
const nullTexture = {};
const nullSampler = {};
const identities = new WeakMap();
let nextIdentity = 1;

/** A program's mapped resources. Constant buffers travel SetConstants. */
export class Tr2ResourceSetDescriptionAL
{
  static MAX_RESOURCES_IN_STAGE = MAX_RESOURCES_IN_STAGE;

  m_registerMap = new Tr2RegisterMapAL();
  m_srv = null;
  m_uav = null;
  m_samplers = null;

  /**
   * JS adaptation: named selectors replace C++ constructor overloads.
   * Copy/move assignment replaces the destination with a new description using
   * the corresponding selector; no native allocation is exposed.
   */
  constructor({ registers = null, program = null, copy = null, move = null } = {})
  {
    const source = copy ?? move;
    const map = source ? source.m_registerMap : registers ?? program?.GetRegisterMap();
    if (!map) return;
    this.m_registerMap = new Tr2RegisterMapAL({ copy: map });
    if (move)
    {
      this.m_srv = move.m_srv;
      this.m_uav = move.m_uav;
      this.m_samplers = move.m_samplers;
      move.m_srv = move.m_uav = move.m_samplers = null;
      return;
    }
    for (const [ field, count ] of [ [ "m_srv", map.srvCount ], [ "m_uav", map.uavCount ], [ "m_samplers", map.samplerCount ] ])
    {
      if (count === 0) continue;
      // Backend references already represent implementation identities here.
      // Copies share those identities, never mutable description records.
      this[field] = copy ? copy[field].map(record => ({ ...record }))
        : Array.from({ length: count }, () => field === "m_samplers"
          ? { type: 0, sampler: null }
          : { type: 0, texture: null, buffer: null, colorSpace: 0 });
    }
  }

  /** resourceType selects the C++ buffer (1) or texture (2) overload. */
  @impl.adapted
  @impl.reason("JS lacks static overload selection; final resourceType selects buffer versus texture. Out-of-bounds indexes return false instead of native undefined memory access.")
  SetSrv(stage, registerIndex, resource, colorSpace = 0, resourceType = 2)
  {
    const index = this.m_registerMap.srvs[stage]?.[registerIndex];
    if (this.m_registerMap.srvCount === 0 || index === undefined || index >= this.m_registerMap.srvCount) return false;
    const current = this.m_srv[index];
    if (resourceType === 1)
    {
      if (current.type === 1 && current.buffer === resource) return false;
      current.type = 1;
      current.buffer = resource;
    }
    else
    {
      if (current.type === 2 && current.texture === resource && current.colorSpace === colorSpace) return false;
      current.type = 2;
      current.texture = resource;
      current.colorSpace = colorSpace;
    }
    return true;
  }

  /** colorSpace also stores Carbon's union member mip. */
  @impl.adapted
  @impl.reason("JS lacks static overload selection and unions: final resourceType selects buffer versus texture; colorSpace stores the shared mip/colour-space word. Out-of-bounds indexes return false.")
  SetUav(stage, registerIndex, resource, mip = 0, resourceType = 2)
  {
    const index = this.m_registerMap.uavs[stage]?.[registerIndex];
    if (this.m_registerMap.uavCount === 0 || index === undefined || index >= this.m_registerMap.uavCount) return false;
    const current = this.m_uav[index];
    if (resourceType === 1)
    {
      if (current.type === 1 && current.buffer === resource) return false;
      current.type = 1;
      current.buffer = resource;
    }
    else
    {
      if (current.type === 2 && current.texture === resource && current.colorSpace === mip) return false;
      current.type = 2;
      current.texture = resource;
      current.colorSpace = mip;
    }
    return true;
  }

  /** Assigns the mapped sampler and reports whether its type or identity changed. */
  @impl.adapted
  @impl.reason("Out-of-bounds JS indexes return false instead of native undefined memory access.")
  SetSampler(stage, registerIndex, sampler)
  {
    const index = this.m_registerMap.samplers[stage]?.[registerIndex];
    if (this.m_registerMap.samplerCount === 0 || index === undefined || index >= this.m_registerMap.samplerCount) return false;
    const current = this.m_samplers[index];
    if (current.type === 1 && current.sampler === sampler) return false;
    current.type = 1;
    current.sampler = sampler;
    return true;
  }

  /** Marks the mapped shader resource as a descriptor-heap view. */
  @impl.adapted
  @impl.reason("Out-of-bounds JS indexes return false instead of native undefined memory access.")
  SetSrvHeapView(stage, registerIndex)
  {
    const index = this.m_registerMap.srvs[stage]?.[registerIndex];
    if (this.m_registerMap.srvCount === 0 || index === undefined || index >= this.m_registerMap.srvCount) return false;
    if (this.m_srv[index].type === 3) return false;
    this.m_srv[index].type = 3;
    return true;
  }

  /** Marks the mapped unordered-access resource as a descriptor-heap view. */
  @impl.adapted
  @impl.reason("Out-of-bounds JS indexes return false instead of native undefined memory access.")
  SetUavHeapView(stage, registerIndex)
  {
    const index = this.m_registerMap.uavs[stage]?.[registerIndex];
    if (this.m_registerMap.uavCount === 0 || index === undefined || index >= this.m_registerMap.uavCount) return false;
    if (this.m_uav[index].type === 3) return false;
    this.m_uav[index].type = 3;
    return true;
  }

  /** Marks the mapped sampler as a descriptor-heap view. */
  @impl.adapted
  @impl.reason("Out-of-bounds JS indexes return false instead of native undefined memory access.")
  SetSamplerHeapView(stage, registerIndex)
  {
    const index = this.m_registerMap.samplers[stage]?.[registerIndex];
    if (this.m_registerMap.samplerCount === 0 || index === undefined || index >= this.m_registerMap.samplerCount) return false;
    if (this.m_samplers[index].type === 2) return false;
    this.m_samplers[index].type = 2;
    return true;
  }

  /**
   * Compares the identities of the three owning arrays, preserving Carbon's
   * equality quirk.
   */
  @impl.adapted
  @impl.reason("JavaScript spells the native equality operator as a method; array identities preserve unique_ptr comparison.")
  Equals(other)
  {
    // Carbon quirk: allocation identity, not contents (cpp:434-437; CE-24).
    return this.m_srv === other.m_srv && this.m_uav === other.m_uav && this.m_samplers === other.m_samplers;
  }

  /**
   * Clears resource types and handles while retaining the map, qualifiers and
   * samplers.
   */
  @impl.adapted
  @impl.reason("Moved-from descriptions have null storage with unchanged counts. JS treats that storage as empty instead of dereferencing a native null pointer.")
  ClearResources()
  {
    for (const records of [ this.m_srv, this.m_uav ])
    {
      for (const record of records ?? [])
      {
        record.type = 0;
        record.texture = null;
        record.buffer = null;
      }
    }
  }

  /**
   * Hashes dense resource identities and heap-view enums with Carbon's ordering
   * and omissions.
   */
  @impl.adapted
  @impl.reason("JavaScript has no implementation pointer bytes; stable backend identities use process-local 32-bit IDs. Distinct invalid backend identities are retained; moved-from storage is treated as empty. Traversal, zero seed, signed-byte FNV and donor omissions are preserved.")
  ComputeHash()
  {
    let hash = 0;
    for (const [ records, sampler ] of [ [ this.m_srv, false ], [ this.m_uav, false ], [ this.m_samplers, true ] ])
    {
      for (const record of records ?? [])
      {
        if (record.type === 0) continue;
        const heap = record.type === (sampler ? 2 : 3);
        const object = sampler ? record.sampler ?? nullSampler
          : record.type === 1 ? record.buffer ?? nullBuffer : record.texture ?? nullTexture;
        let identity = heap ? record.type : 0;
        if (!heap)
        {
          if (!identities.has(object)) identities.set(object, nextIdentity++);
          identity = identities.get(object);
        }
        // Carbon quirk: no map, empty-slot, category or qualifier contribution
        // (cpp:457-543; CE-25). CcpHash.cpp:17-28 XORs signed int8_t bytes.
        for (let byte = 0; byte < 4; byte += 1)
        {
          hash = Math.imul(hash, 16777619) ^ ((identity >>> (byte * 8) & 255) << 24 >> 24);
        }
      }
    }
    return hash >>> 0;
  }
}
