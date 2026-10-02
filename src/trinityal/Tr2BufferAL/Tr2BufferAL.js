// Source: trinity/trinityal/include/Tr2BufferAL.h
// Source: trinity/trinityal/src/Tr2BufferAL.cpp
import { CjsSchema, meta } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2BufferDescriptionAL } from "./Tr2BufferDescriptionAL.js";

const emptyDescription = new Tr2BufferDescriptionAL();

/** An explicitly owned buffer value sharing one backend implementation. */
export class Tr2BufferAL
{
  /** Native shared_ptr control block; null represents the uncreated value. */
  _buffer = null;

  /** Explicit copy construction replaces C++ implicit value copies. Plain JS assignment aliases. */
  constructor({ copy = null } = {})
  {
    this._buffer = copy ? copy._buffer : null;
    if (this._buffer) this._buffer.owners += 1;
  }

  /** Creates a fresh implementation, preserving existing copies. Context allocation replaces compile-time backend selection. */
  @meta.blue.method
  @meta.adapted
  Create(description, initialData, renderContext)
  {
    description = Object.assign(new Tr2BufferDescriptionAL(), description);
    this.Destroy();
    const { result, implementation } = RenderContextALOf(renderContext).CreateBuffer(description, initialData, true);
    if (!Failed(result)) this._buffer = { implementation, owners: 1 };
    return result;
  }

  /** Reports whether this value references valid backend storage. */
  @meta.blue.method
  @meta.implemented
  IsValid()
  {
    return this._buffer !== null && this._buffer.implementation.IsValid();
  }

  /** Returns the backend memory class, or managed for an uncreated value. */
  @meta.blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._buffer ? this._buffer.implementation.GetMemoryClass() : Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /** Returns the native description, including its empty-value defaults. */
  @meta.blue.method
  @meta.implemented
  GetDesc()
  {
    return this._buffer ? this._buffer.implementation.GetDesc() : emptyDescription;
  }

  /** Returns the description size in bytes. */
  @meta.blue.method
  @meta.implemented
  GetSize()
  {
    return this.GetDesc().count * this.GetDesc().stride;
  }

  /** Compares shared implementation identity; JavaScript has no overloadable equality operator. */
  @meta.blue.method
  @meta.adapted
  Equals(other)
  {
    return this._buffer === other._buffer;
  }

  /** Forwards MapForReading to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  MapForReading(renderContext, offset = 0, size = 0)
  {
    return this._buffer ? this._buffer.implementation.MapForReading(renderContext, offset, size) : { result: ALResult.E_INVALIDCALL, data: null };
  }

  /** Forwards UnmapForReading to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  UnmapForReading(renderContext)
  {
    return this._buffer ? this._buffer.implementation.UnmapForReading(renderContext) : undefined;
  }

  /** Forwards MapForWriting to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  MapForWriting(renderContext)
  {
    return this._buffer ? this._buffer.implementation.MapForWriting(renderContext) : { result: ALResult.E_INVALIDCALL, data: null };
  }

  /** Forwards UnmapForWriting to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  UnmapForWriting(renderContext)
  {
    return this._buffer ? this._buffer.implementation.UnmapForWriting(renderContext) : undefined;
  }

  /** Forwards UpdateBuffer to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  UpdateBuffer(offset, size, data, renderContext)
  {
    return this._buffer ? this._buffer.implementation.UpdateBuffer(offset, size, data, renderContext) : ALResult.E_INVALIDCALL;
  }

  /** Forwards GetSrvIndexInHeap to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  GetSrvIndexInHeap()
  {
    return this._buffer ? this._buffer.implementation.GetSrvIndexInHeap() : 0xffffffff;
  }

  /** Forwards GetUavIndexInHeap to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  GetUavIndexInHeap()
  {
    return this._buffer ? this._buffer.implementation.GetUavIndexInHeap() : 0xffffffff;
  }

  /** Names valid storage; invalid values and absent names retain Carbon’s errors. */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this._buffer.implementation.SetName(name);
  }

  /** Returns the borrowed backend implementation for backend-only operations. */
  @meta.blue.method
  @meta.implemented
  TrinityALImpl_GetObject()
  {
    return this._buffer ? this._buffer.implementation : null;
  }

  /** Releases this value explicitly because JavaScript has no deterministic scope destructor. Copies remain valid until their own final release. */
  @meta.ours
  Destroy()
  {
    const owned = this._buffer;
    this._buffer = null;
    if (owned && --owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.define(Tr2BufferAL, { className: "Tr2BufferAL", carbon: "Tr2BufferAL" });
