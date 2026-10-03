// Source: trinity/trinityal/metal/Tr2TextureALMetal.h
// Source: trinity/trinityal/metal/Tr2TextureALMetal.mm
import { CjsSchema, meta } from "#schema";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult } from "../ALResult.js";

/** A texture snapshot whose readiness follows WebGPU staging-buffer completion. */
export class Tr2ReadbackALWebgpu extends Tr2DeviceResourceAL
{
  _buffer = null;
  _data = null;
  _rowPitch = 0;
  _completion = null;
  _context = null;

  /**
   * Mapping starts after the owning context submits the copy. Unlike Metal,
   * WebGPU cannot block; the completion resolves even when mapping fails.
   */
  constructor(buffer, rowPitch, context)
  {
    super();
    this._buffer = buffer;
    this._rowPitch = rowPitch;
    this._context = context;
    this._completion = new Promise(resolve =>
    {
      context.ReleaseLater(() =>
      {
        if (!this._buffer)
        {
          resolve();
          return;
        }
        Promise.resolve().then(() => buffer.mapAsync(1)).then(() =>
        {
          if (this._buffer === buffer) this._data = new Uint8Array(buffer.getMappedRange()); // alloc: view owned by the mapped readback.
        }).catch(() => this.Destroy()).finally(resolve);
      });
    });
  }

  /** True only after this copy's actual map completes, without a frame estimate. */
  IsReady(_renderContext)
  {
    return this.IsValid() && this._data !== null;
  }

  /** A destroyed or failed staging buffer cannot yield a result. */
  IsValid()
  {
    return this._buffer !== null;
  }

  /** Ready maps return directly; pending maps await this request, never an older one. */
  Map(renderContext)
  {
    if (!this.IsValid()) return { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
    if (!this.IsReady(renderContext)) return this._completion.then(() => this.Map(renderContext));
    return { result: ALResult.S_OK, data: this._data, pitch: this._rowPitch };
  }

  /** Cancels pending mapping and releases storage after queued copy commands submit. */
  Destroy()
  {
    const buffer = this._buffer;
    this._buffer = null;
    this._data = null;
    if (buffer) this._context.ReleaseLater(() => buffer.destroy());
    super.Destroy();
  }

  /** Like the native readback, contributes no additional inventory fields. */
  Describe(_description)
  {
  }

  /** Matches native staging storage's managed memory class. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }
}

CjsSchema.define(Tr2ReadbackALWebgpu, {
  className: "Tr2ReadbackALWebgpu", carbon: "Tr2ReadbackAL",
  methods: { IsReady: [meta.adapted], IsValid: [meta.implemented], Map: [meta.adapted],
    Destroy: [meta.adapted], Describe: [meta.implemented], GetMemoryClass: [meta.implemented] }
});
