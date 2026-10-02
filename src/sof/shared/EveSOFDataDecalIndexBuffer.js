// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:101-111
import { meta, types } from "#schema";
import { ICustomPersist } from "#blue";

/**
 * Stores an unsigned decal index buffer with helpers for appending indices and exposing its contents.
 * Native ICustomPersist owns custom BINARYBLOCK/PERSISTONLY data. The existing
 * JavaScript Uint32Array declaration is a values-transport adaptation; mapping
 * this interface does not add native custom-binary serializer dispatch.
 * Empty native constructor/destructor require no additional lifecycle.
 */
@meta.define({ className: "EveSOFDataDecalIndexBuffer", family: "eve" })
export class EveSOFDataDecalIndexBuffer extends ICustomPersist
{

  /** Native custom binary block; retained Uint32Array values-transport adaptation. */
  @meta.edit.persistOnly
  @types.typedArray("Uint32Array")
  indexBuffer = new Uint32Array(0);

  /**
   * Appends one unsigned index.
   *
   * @param {number} index Unsigned 32-bit index.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.implemented
  AddIndex(index)
  {
    const source = this.indexBuffer;
    const next = new Uint32Array(source.length + 1);
    next.set(source);
    next[source.length] = Number(index) >>> 0;
    this.indexBuffer = next;
  }

  /**
   * Returns a copy of the unsigned indices.
   *
   * @returns {number[]} Copied indices.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetIndices()
  {
    return Array.from(this.indexBuffer, value => Number(value) >>> 0);
  }

  // ICustomPersist interface (EveSOFData.h:1314-1318, cpp:958-978):
  // allocate storage, fill it, then retain the used prefix.

  /**
   * Replaces the index storage with a zeroed buffer sized for the requested bytes.
   *
   * Adapted: Carbon resizes its vector, preserving existing elements in the
   * retained range, and returns a byte pointer (EveSOFData.cpp:975-978).
   * JavaScript allocates a fresh Uint32Array and returns it directly; the unused
   * native member-name argument is omitted. An empty typed array also avoids
   * the donor's unguarded element-zero access when the resulting vector is empty.
   *
   * @param {number} byteSize Nonnegative byte count; incomplete uint32 bytes are discarded.
   * @returns {Uint32Array} New backing storage.
   */
  @meta.carbon.method
  @meta.impl.adapted
  AllocateReadBuffer(byteSize)
  {
    this.indexBuffer = new Uint32Array(Math.floor(byteSize / 4));
    return this.indexBuffer;
  }

  /**
   * Returns the retained index storage and its byte size.
   *
   * Adapted: Carbon writes a raw pointer and size to output parameters; JavaScript
   * returns a record and omits the unused property-name argument. An empty typed
   * array avoids the donor's unguarded element-zero access on an empty vector
   * (EveSOFData.cpp:958-962). The returned buffer shares the current storage.
   *
   * @returns {{buffer: Uint32Array, byteSize: number}} Storage and byte count.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetWriteBufferAndSize()
  {
    const buffer = this.indexBuffer;
    return { buffer, byteSize: buffer.length * 4 };
  }

  /**
   * Completes a write without releasing the owned index storage.
   * Carbon also has an empty release body (EveSOFData.cpp:964-966).
   *
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.noop
  ReleaseWriteBuffer()
  {
  }

  /**
   * Copies the retained prefix into storage capped at the requested byte size.
   *
   * Adapted: Carbon ignores the supplied pointer and resizes its vector, expecting
   * the result to fit in the previously allocated buffer (EveSOFData.cpp:968-973).
   * JavaScript clamps the result to the existing length and copies it into a new
   * array; it cannot grow the store as vector.resize can. The unused native
   * property-name argument is omitted. Previously returned arrays are not updated.
   *
   * @param {*} _buffer Ignored, as in Carbon.
   * @param {number} byteSize Nonnegative byte count; incomplete uint32 bytes are discarded.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetBufferAndSize(_buffer, byteSize)
  {
    const elements = Math.floor(byteSize / 4);
    const source = this.indexBuffer;
    this.indexBuffer = source.subarray(0, Math.min(elements, source.length)).slice();
  }

}

meta.carbon.interfaceTable({
  interfaces: [ EveSOFDataDecalIndexBuffer, ICustomPersist ],
  chainTo: null
})(EveSOFDataDecalIndexBuffer);
