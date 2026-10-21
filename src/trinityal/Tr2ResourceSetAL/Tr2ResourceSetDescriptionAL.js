import { Tr2BufferAL } from "../Tr2BufferAL/index.js";
import { Tr2TextureAL } from "../Tr2TextureAL/index.js";
import { Tr2SamplerStateAL } from "../Tr2SamplerStateAL/index.js";
// Source: trinity/trinityal/include/Tr2ResourceSetAL.h:44-127
// Source: trinity/trinityal/src/Tr2ResourceSetAL.cpp:152-543
import { CjsSchema, meta, blue, type } from "#schema";
import { MAX_RESOURCES_IN_STAGE, Tr2RegisterMapAL } from "./Tr2RegisterMapAL.js";

// Hash identities for the native invalid buffer and texture implementations
// (src/Tr2BufferAL.cpp:49, src/Tr2TextureAL.cpp:16): those JS handles report
// null when uncreated. A sampler record holds a Tr2SamplerStateAL by value
// (Tr2ResourceSetAL.h:116), whose uncreated implementation is its own shared
// null sampler (src/Tr2SamplerStateAL.cpp:10), so it needs no stand-in.
const nullBuffer = {};
const nullTexture = {};
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
      this[field] = copy ? copy[field].map(record => field === "_samplers" ? { ...record, sampler: new Tr2SamplerStateAL({ copy: record.sampler }) } : ({ ...record,
        buffer: record.buffer ? new Tr2BufferAL({ copy: record.buffer }) : null,
        texture: record.texture ? new Tr2TextureAL({ copy: record.texture }) : null }))
        : Array.from({ length: count }, () => field === "_samplers"
          ? { type: 0, sampler: new Tr2SamplerStateAL() }
          : { type: 0, texture: null, buffer: null, colorSpace: 0 });
    }
  }

  /**
   * Carbon's SetSrv( stage, registerIndex, const Tr2BufferAL& buffer )
   * (Tr2ResourceSetAL.h:57).
   *
   * Carbon's own checks return false: no mapped resources of the kind, or a
   * register that maps to no resource. The stage/register lookup itself is
   * unchecked in Carbon, so a stage or register outside the map throws a
   * RangeError (ruling 11).
   *
   * Adapted: the record keeps its own copy of the handle and destroys the one it
   * replaces; JavaScript has no copy assignment or destructors.
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
   * Carbon's own checks return false: no mapped resources of the kind, or a
   * register that maps to no resource. The stage/register lookup itself is
   * unchecked in Carbon, so a stage or register outside the map throws a
   * RangeError (ruling 11).
   *
   * Adapted: the record keeps its own copy of the handle and destroys the one it
   * replaces; JavaScript has no copy assignment or destructors.
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

  /**
   * The Srv record mapped to a stage register, or null where Carbon's checks
   * return false.
   * @throws {RangeError} When the stage or register is outside the map.
   */
  _SrvRecord(stage, registerIndex)
  {
    if (this._registerMap.srvCount === 0) return null;
    const index = RegisterAt(this._registerMap.srvs, stage, registerIndex);
    if (index >= this._registerMap.srvCount) return null;
    return this._srv[index];
  }

  /**
   * Carbon's SetUav( stage, registerIndex, const Tr2BufferAL& buffer )
   * (Tr2ResourceSetAL.h:59).
   *
   * Carbon's own checks return false: no mapped resources of the kind, or a
   * register that maps to no resource. The stage/register lookup itself is
   * unchecked in Carbon, so a stage or register outside the map throws a
   * RangeError (ruling 11).
   *
   * Adapted: the record keeps its own copy of the handle and destroys the one it
   * replaces; JavaScript has no copy assignment or destructors.
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
   * Carbon's own checks return false: no mapped resources of the kind, or a
   * register that maps to no resource. The stage/register lookup itself is
   * unchecked in Carbon, so a stage or register outside the map throws a
   * RangeError (ruling 11).
   *
   * Adapted: JS has no unions: colorSpace stores the shared mip/colour-space word.
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

  /**
   * The Uav record mapped to a stage register, or null where Carbon's checks
   * return false.
   * @throws {RangeError} When the stage or register is outside the map.
   */
  _UavRecord(stage, registerIndex)
  {
    if (this._registerMap.uavCount === 0) return null;
    const index = RegisterAt(this._registerMap.uavs, stage, registerIndex);
    if (index >= this._registerMap.uavCount) return null;
    return this._uav[index];
  }

  /**
   * Carbon's SetSampler( stage, registerIndex, const Tr2SamplerStateAL& sampler )
   * (Tr2ResourceSetAL.h:64, Tr2ResourceSetAL.cpp:413-430): assigns the mapped
   * sampler by value and reports whether its type or implementation changed.
   *
   * Carbon's own checks return false: no mapped resources of the kind, or a
   * register that maps to no resource. The stage/register lookup itself is
   * unchecked in Carbon, so a stage or register outside the map throws a
   * RangeError (ruling 11).
   *
   * Adapted: the record keeps its own copy of the handle, as the C++ assignment does.
   *
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The sampler register.
   * @param {Tr2SamplerStateAL} sampler The sampler state.
   * @returns {boolean} Whether the record changed.
   */
  @meta.adapted
  SetSampler(stage, registerIndex, sampler)
  {
    if (this._registerMap.samplerCount === 0) return false;
    const index = RegisterAt(this._registerMap.samplers, stage, registerIndex);
    if (index >= this._registerMap.samplerCount) return false;
    const current = this._samplers[index];
    if (current.type === 1 && current.sampler.Equals(sampler)) return false;
    current.sampler = new Tr2SamplerStateAL({ copy: sampler });
    current.type = 1;
    return true;
  }

  /**
   * Marks the mapped shader resource as a descriptor-heap view.
   *
   * Carbon's own checks return false: no mapped resources of the kind, or a
   * register that maps to no resource. The stage/register lookup itself is
   * unchecked in Carbon, so a stage or register outside the map throws a
   * RangeError (ruling 11).
   */
  @meta.implemented
  SetSrvHeapView(stage, registerIndex)
  {
    if (this._registerMap.srvCount === 0) return false;
    const index = RegisterAt(this._registerMap.srvs, stage, registerIndex);
    if (index >= this._registerMap.srvCount) return false;
    if (this._srv[index].type === 3) return false;
    this._srv[index].type = 3;
    return true;
  }

  /**
   * Marks the mapped unordered-access resource as a descriptor-heap view.
   *
   * Carbon's own checks return false: no mapped resources of the kind, or a
   * register that maps to no resource. The stage/register lookup itself is
   * unchecked in Carbon, so a stage or register outside the map throws a
   * RangeError (ruling 11).
   */
  @meta.implemented
  SetUavHeapView(stage, registerIndex)
  {
    if (this._registerMap.uavCount === 0) return false;
    const index = RegisterAt(this._registerMap.uavs, stage, registerIndex);
    if (index >= this._registerMap.uavCount) return false;
    if (this._uav[index].type === 3) return false;
    this._uav[index].type = 3;
    return true;
  }

  /**
   * Marks the mapped sampler as a descriptor-heap view.
   *
   * Carbon's own checks return false: no mapped resources of the kind, or a
   * register that maps to no resource. The stage/register lookup itself is
   * unchecked in Carbon, so a stage or register outside the map throws a
   * RangeError (ruling 11).
   */
  @meta.implemented
  SetSamplerHeapView(stage, registerIndex)
  {
    if (this._registerMap.samplerCount === 0) return false;
    const index = RegisterAt(this._registerMap.samplers, stage, registerIndex);
    if (index >= this._registerMap.samplerCount) return false;
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
   * samplers (Tr2ResourceSetAL.cpp:439-455). Carbon loops the map's counts over
   * the arrays; a moved-from description keeps its counts with null storage,
   * so this throws there as Carbon dereferences null (ruling 11).
   *
   * Adapted: the handles are destroyed explicitly; JavaScript has no
   * destructors.
   */
  @meta.adapted
  ClearResources()
  {
    for (const [ records, count ] of [ [ this._srv, this._registerMap.srvCount ], [ this._uav, this._registerMap.uavCount ] ])
    {
      for (let i = 0; i < count; i++)
      {
        const record = records[i];
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
   * Carbon loops the map's counts over the arrays (Tr2ResourceSetAL.cpp:457-480);
   * moved-from storage is null with unchanged counts, so this throws there as
   * Carbon dereferences null (ruling 11).
   *
   * Adapted: JavaScript has no implementation pointer bytes; stable backend identities use
   * process-local 32-bit IDs. Distinct invalid backend identities are retained. Traversal,
   * zero seed, signed-byte FNV and donor omissions are preserved.
   */
  @meta.adapted
  ComputeHash()
  {
    let hash = 0;
    const map = this._registerMap;
    for (const [ records, count, sampler ] of [ [ this._srv, map.srvCount, false ], [ this._uav, map.uavCount, false ], [ this._samplers, map.samplerCount, true ] ])
    {
      for (let i = 0; i < count; i++)
      {
        const record = records[i];
        if (record.type === 0) continue;
        const heap = record.type === (sampler ? 2 : 3);
        const object = sampler ? record.sampler.TrinityALImpl_GetObject()
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

/**
 * Reads `map[stage][registerIndex]`, a fixed C array lookup Carbon does not
 * check (Tr2ResourceSetAL.h:38-40). Outside the array it throws a RangeError
 * instead of reading undefined (ruling 11).
 * @param {Uint8Array[]} table The srvs, uavs or samplers table.
 * @param {number} stage A `ShaderType`.
 * @param {number} registerIndex The register.
 * @returns {number} The dense resource index; 255 when unmapped.
 * @throws {RangeError} When stage or registerIndex is outside the table.
 */
function RegisterAt(table, stage, registerIndex)
{
  const row = table[stage];
  const index = row === undefined ? undefined : row[registerIndex];
  if (index === undefined) throw new RangeError(`Tr2ResourceSetDescriptionAL: stage ${stage} register ${registerIndex} is outside the register map.`);
  return index;
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
CjsSchema.meta.carbon("Tr2ResourceSetDescriptionAL")(Tr2ResourceSetDescriptionAL);
