import { Tr2BufferAL } from "../Tr2BufferAL/index.js";
import { Tr2TextureAL } from "../Tr2TextureAL/index.js";
// Source: trinity/trinityal/include/Tr2ResourceSetAL.h:44-127
// Source: trinity/trinityal/src/Tr2ResourceSetAL.cpp:152-543
import { CjsSchema, meta, blue, type } from "#schema";
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

  _registerMap = new Tr2RegisterMapAL();
  _srv = null;
  _uav = null;
  _samplers = null;

  /**
   * JS adaptation: named selectors replace C++ constructor overloads.
   * Copy/move assignment replaces the destination with a new description using
   * the corresponding selector; no native allocation is exposed.
   */
  constructor({ registers = null, program = null, copy = null, move = null } = {})
  {
    const source = copy ?? move;
    const map = source ? source._registerMap : registers ?? program?.GetRegisterMap();
    if (!map) return;
    this._registerMap = new Tr2RegisterMapAL({ copy: map });
    if (move)
    {
      this._srv = move._srv;
      this._uav = move._uav;
      this._samplers = move._samplers;
      move._srv = move._uav = move._samplers = null;
      return;
    }
    for (const [ field, count ] of [ [ "_srv", map.srvCount ], [ "_uav", map.uavCount ], [ "_samplers", map.samplerCount ] ])
    {
      if (count === 0) continue;
      // Backend references already represent implementation identities here.
      // Copies share those identities, never mutable description records.
      this[field] = copy ? copy[field].map(record => field === "_samplers" ? { ...record } : ({ ...record,
        buffer: record.buffer ? new Tr2BufferAL({ copy: record.buffer }) : null,
        texture: record.texture ? new Tr2TextureAL({ copy: record.texture }) : null }))
        : Array.from({ length: count }, () => field === "_samplers"
          ? { type: 0, sampler: null }
          : { type: 0, texture: null, buffer: null, colorSpace: 0 });
    }
  }

  /**
   * Carbon's SetSrv( stage, registerIndex, const Tr2BufferAL& buffer )
   * (Tr2ResourceSetAL.h:57).
   *
   * Adapted: Out-of-bounds JS indexes return false instead of native undefined memory
   * access.
   *
   * @returns {boolean} Whether the record changed.
   */
  @meta.adapted
  SetSrv__BufferAL(stage, registerIndex, buffer)
  {
    const current = this._SrvRecord(stage, registerIndex);
    if (!current) return false;
    if (current.type === 1 && sameValue(current.buffer, buffer)) return false;
    current.type = 1;
    const next = buffer ? new Tr2BufferAL({ copy: buffer }) : null;
    if (current.buffer) current.buffer.Destroy();
    current.buffer = next;
    return true;
  }

  /**
   * Carbon's SetSrv( stage, registerIndex, const Tr2TextureAL& texture, colorSpace = COLOR_SPACE_LINEAR )
   * (Tr2ResourceSetAL.h:58).
   *
   * Adapted: Out-of-bounds JS indexes return false instead of native undefined memory
   * access.
   *
   * @returns {boolean} Whether the record changed.
   */
  @meta.adapted
  SetSrv__TextureAL(stage, registerIndex, texture, colorSpace = 0)
  {
    const current = this._SrvRecord(stage, registerIndex);
    if (!current) return false;
    if (current.type === 2 && sameValue(current.texture, texture) && current.colorSpace === colorSpace) return false;
    current.type = 2;
    const next = texture ? new Tr2TextureAL({ copy: texture }) : null;
    if (current.texture) current.texture.Destroy();
    current.texture = next;
    current.colorSpace = colorSpace;
    return true;
  }

  /** The Srv record mapped to a stage register, or null out of range. */
  _SrvRecord(stage, registerIndex)
  {
    const index = this._registerMap.srvs[stage]?.[registerIndex];
    if (this._registerMap.srvCount === 0 || index === undefined || index >= this._registerMap.srvCount) return null;
    return this._srv[index];
  }

  /**
   * Carbon's SetUav( stage, registerIndex, const Tr2BufferAL& buffer )
   * (Tr2ResourceSetAL.h:59).
   *
   * Adapted: Out-of-bounds JS indexes return false instead of native undefined memory
   * access.
   *
   * @returns {boolean} Whether the record changed.
   */
  @meta.adapted
  SetUav__BufferAL(stage, registerIndex, buffer)
  {
    const current = this._UavRecord(stage, registerIndex);
    if (!current) return false;
    if (current.type === 1 && sameValue(current.buffer, buffer)) return false;
    current.type = 1;
    const next = buffer ? new Tr2BufferAL({ copy: buffer }) : null;
    if (current.buffer) current.buffer.Destroy();
    current.buffer = next;
    return true;
  }

  /**
   * Carbon's SetUav( stage, registerIndex, const Tr2TextureAL& texture, mip = 0 )
   * (Tr2ResourceSetAL.h:60). colorSpace stores Carbon's union member mip.
   *
   * Adapted: Out-of-bounds JS indexes return false instead of native undefined memory
   * access. JS has no unions: colorSpace stores the shared mip/colour-space word.
   *
   * @returns {boolean} Whether the record changed.
   */
  @meta.adapted
  SetUav__TextureAL(stage, registerIndex, texture, mip = 0)
  {
    const current = this._UavRecord(stage, registerIndex);
    if (!current) return false;
    if (current.type === 2 && sameValue(current.texture, texture) && current.colorSpace === mip) return false;
    current.type = 2;
    const next = texture ? new Tr2TextureAL({ copy: texture }) : null;
    if (current.texture) current.texture.Destroy();
    current.texture = next;
    current.colorSpace = mip;
    return true;
  }

  /** The Uav record mapped to a stage register, or null out of range. */
  _UavRecord(stage, registerIndex)
  {
    const index = this._registerMap.uavs[stage]?.[registerIndex];
    if (this._registerMap.uavCount === 0 || index === undefined || index >= this._registerMap.uavCount) return null;
    return this._uav[index];
  }

  /**
   * Assigns the mapped sampler and reports whether its type or identity changed.
   *
   * Adapted: Out-of-bounds JS indexes return false instead of native undefined memory
   * access.
   */
  @meta.adapted
  SetSampler(stage, registerIndex, sampler)
  {
    const index = this._registerMap.samplers[stage]?.[registerIndex];
    if (this._registerMap.samplerCount === 0 || index === undefined || index >= this._registerMap.samplerCount) return false;
    const current = this._samplers[index];
    if (current.type === 1 && current.sampler === sampler) return false;
    current.type = 1;
    current.sampler = sampler;
    return true;
  }

  /**
   * Marks the mapped shader resource as a descriptor-heap view.
   *
   * Adapted: Out-of-bounds JS indexes return false instead of native undefined memory
   * access.
   */
  @meta.adapted
  SetSrvHeapView(stage, registerIndex)
  {
    const index = this._registerMap.srvs[stage]?.[registerIndex];
    if (this._registerMap.srvCount === 0 || index === undefined || index >= this._registerMap.srvCount) return false;
    if (this._srv[index].type === 3) return false;
    this._srv[index].type = 3;
    return true;
  }

  /**
   * Marks the mapped unordered-access resource as a descriptor-heap view.
   *
   * Adapted: Out-of-bounds JS indexes return false instead of native undefined memory
   * access.
   */
  @meta.adapted
  SetUavHeapView(stage, registerIndex)
  {
    const index = this._registerMap.uavs[stage]?.[registerIndex];
    if (this._registerMap.uavCount === 0 || index === undefined || index >= this._registerMap.uavCount) return false;
    if (this._uav[index].type === 3) return false;
    this._uav[index].type = 3;
    return true;
  }

  /**
   * Marks the mapped sampler as a descriptor-heap view.
   *
   * Adapted: Out-of-bounds JS indexes return false instead of native undefined memory
   * access.
   */
  @meta.adapted
  SetSamplerHeapView(stage, registerIndex)
  {
    const index = this._registerMap.samplers[stage]?.[registerIndex];
    if (this._registerMap.samplerCount === 0 || index === undefined || index >= this._registerMap.samplerCount) return false;
    if (this._samplers[index].type === 2) return false;
    this._samplers[index].type = 2;
    return true;
  }

  /**
   * Compares the identities of the three owning arrays, preserving Carbon's
   * equality quirk.
   *
   * Adapted: JavaScript spells the native equality operator as a method; array identities
   * preserve unique_ptr comparison.
   */
  @meta.adapted
  Equals(other)
  {
    // Carbon quirk: allocation identity, not contents (cpp:434-437; CE-24).
    return this._srv === other._srv && this._uav === other._uav && this._samplers === other._samplers;
  }

  /**
   * Clears resource types and handles while retaining the map, qualifiers and
   * samplers.
   *
   * Adapted: Moved-from descriptions have null storage with unchanged counts. JS treats that
   * storage as empty instead of dereferencing a native null pointer.
   */
  @meta.adapted
  ClearResources()
  {
    for (const records of [ this._srv, this._uav ])
    {
      for (const record of records ?? [])
      {
        if (record.texture) record.texture.Destroy();
        if (record.buffer) record.buffer.Destroy();
        record.type = 0;
        record.texture = null;
        record.buffer = null;
      }
    }
  }

  /**
   * Hashes dense resource identities and heap-view enums with Carbon's ordering
   * and omissions.
   *
   * Adapted: JavaScript has no implementation pointer bytes; stable backend identities use
   * process-local 32-bit IDs. Distinct invalid backend identities are retained; moved-from
   * storage is treated as empty. Traversal, zero seed, signed-byte FNV and donor omissions
   * are preserved.
   */
  @meta.adapted
  ComputeHash()
  {
    let hash = 0;
    for (const [ records, sampler ] of [ [ this._srv, false ], [ this._uav, false ], [ this._samplers, true ] ])
    {
      for (const record of records ?? [])
      {
        if (record.type === 0) continue;
        const heap = record.type === (sampler ? 2 : 3);
        const object = sampler ? record.sampler ?? nullSampler
          : record.type === 1 ? record.buffer?.TrinityALImpl_GetObject() ?? nullBuffer : record.texture?.TrinityALImpl_GetObject() ?? nullTexture;
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

/** Native AL equality compares implementation identity, not value-object identity. */
function sameValue(left, right)
{
  return (left ? left.TrinityALImpl_GetObject() : null) === (right ? right.TrinityALImpl_GetObject() : null);
}

CjsSchema.decorateField(Tr2ResourceSetDescriptionAL, "_registerMap", type.rawStruct("Tr2RegisterMapAL"));
CjsSchema.decorateField(Tr2ResourceSetDescriptionAL, "_srv", type.array({ kind: "rawStruct", className: "Tr2ResourceSetDescriptionAL::Resource" }));
CjsSchema.decorateField(Tr2ResourceSetDescriptionAL, "_uav", type.array({ kind: "rawStruct", className: "Tr2ResourceSetDescriptionAL::Resource" }));
CjsSchema.decorateField(Tr2ResourceSetDescriptionAL, "_samplers", type.array({ kind: "rawStruct", className: "Tr2ResourceSetDescriptionAL::Sampler" }));
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "Equals", blue.method, meta.renamed("operator=="));
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "SetSrv__BufferAL", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "SetSrv__TextureAL", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "SetUav__BufferAL", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "SetUav__TextureAL", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "SetSrvHeapView", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "SetUavHeapView", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "SetSamplerHeapView", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "SetSampler", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "ClearResources", blue.method);
CjsSchema.decorateMethod(Tr2ResourceSetDescriptionAL, "ComputeHash", blue.method);
CjsSchema.blue.define(Tr2ResourceSetDescriptionAL, { className: "Tr2ResourceSetDescriptionAL" });
