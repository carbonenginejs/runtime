import { CjsError } from '@carbonenginejs/runtime-utils/errors';
import { CjsResource as _CjsResource } from '../CjsResource.js';

/**
 * Physical audio byte-owner resource whose payload may back one complete file or several logical audio files.
 *
 * CjsResMan owns loading, canonical identity, and payload retention. This
 * class only exposes the loaded payload as bytes without interpreting BNK or
 * media semantics.
 */
class CjsAudioBufferRes extends _CjsResource {
  #audioInfo = Object.freeze({});

  /** Creates an unregistered physical audio resource with optional metadata. */
  constructor(values = null) {
    super();
    this.SetAudioInfo(values);
  }

  /** Replaces immutable physical-source metadata before the resource loads. */
  SetAudioInfo(values = null) {
    if (values === null || values === undefined) {
      this.#audioInfo = Object.freeze({});
      return this;
    }
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new TypeError("CjsAudioBufferRes info must be an object");
    }
    this.#audioInfo = Object.freeze({
      ...values
    });
    return this;
  }

  /** Returns immutable physical-source metadata supplied by an audio library. */
  GetAudioInfo() {
    return this.#audioInfo;
  }

  /**
   * Returns a view of the manager-owned payload while the caller holds a lock.
   *
   * The returned view may retain a complete bank buffer. Public media reads
   * should use CjsAudioRes.GetBytes(), which copies only the requested window.
   */
  async GetByteView(options = {}) {
    await super.GetObject(options);
    this.KeepPayloadAlive();
    return CjsAudioBufferRes.toUint8Array(this.GetPayload(), this.GetPath());
  }

  /** Returns a detached copy of the complete physical source. */
  async GetBytes(options = {}) {
    this.Lock();
    try {
      const view = await this.GetByteView(options);
      return view.slice().buffer;
    } finally {
      this.Unlock();
    }
  }

  /** Extracts bytes from raw reader payloads used by registered audio formats. */
  static toUint8Array(value, path = "") {
    if (value instanceof Uint8Array) {
      return value;
    }
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (value && typeof value === "object" && "bytes" in value) {
      return this.toUint8Array(value.bytes, path);
    }
    throw new CjsError("CJS_AUDIO_BYTES_UNAVAILABLE", `Audio resource did not produce bytes: ${path}`, {
      details: {
        path: String(path ?? "")
      }
    });
  }
}

export { CjsAudioBufferRes };
//# sourceMappingURL=CjsAudioBufferRes.js.map
