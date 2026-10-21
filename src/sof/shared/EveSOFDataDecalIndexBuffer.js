import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:101-111
import { meta, type, blue } from "#schema";
import { ICustomPersist } from "#blue";

/**
 * Stores an unsigned decal index buffer with helpers for appending indices and exposing its contents.
 * `indexBuffer` is Carbon's custom binary block: readers move its bytes, and
 * this class decodes them through its ICustomPersist methods.
 * Empty native constructor/destructor require no additional lifecycle.
 */
@be.define("EveSOFDataDecalIndexBuffer")
@be.mapInterface(ICustomPersist)
export class EveSOFDataDecalIndexBuffer extends ICustomPersist
{

  /** m_indexBuffer (std::vector<uint32_t>), persisted as the custom binary block "indexBuffer" [PERSISTONLY] */
  @blue.persistOnly
  @type.binary
  @type.uint32Array
  indexBuffer = new Uint32Array(0);

  /**
   * Appends one unsigned index.
   *
   * @param {number} index Unsigned 32-bit index.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  GetIndices()
  {
    return Array.from(this.indexBuffer, value => Number(value) >>> 0);
  }

  // ICustomPersist interface (EveSOFData.h:1314-1318, cpp:958-978):
  // allocate storage, fill it, then retain the used prefix.

  /**
   * Sizes the index storage for the requested bytes and returns it for the reader to fill.
   *
   * Adapted: Carbon resizes its vector in place and returns a byte pointer
   * (EveSOFData.cpp:980-984). A typed array cannot resize, so the existing
   * storage is reused when it already has the requested length, and replaced
   * only when it is null or a different length. An empty typed array also
   * avoids the donor's unguarded element-zero access when the vector is empty.
   *
   * @param {string} _memberName Ignored, as in Carbon.
   * @param {number} byteSize Nonnegative byte count; incomplete uint32 bytes are discarded.
   * @returns {Uint32Array} The backing storage, reused or new.
   */
  @blue.method
  @meta.adapted
  AllocateReadBuffer(_memberName, byteSize)
  {
    const length = Math.floor(byteSize / 4);
    if (this.indexBuffer === null || this.indexBuffer.length !== length) this.indexBuffer = new Uint32Array(length);
    return this.indexBuffer;
  }

  /**
   * Returns the retained index storage and its byte size.
   *
   * Adapted: Carbon writes a raw pointer and size to output parameters; JavaScript
   * returns a record. An empty typed array avoids the donor's unguarded
   * element-zero access on an empty vector (EveSOFData.cpp:958-962). The
   * returned buffer shares the current storage.
   *
   * @param {string} [_propertyName] Ignored, as in Carbon.
   * @returns {{buffer: Uint32Array, byteSize: number}} Storage and byte count.
   */
  @blue.method
  @meta.adapted
  GetWriteBufferAndSize(_propertyName)
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
  @blue.method
  @meta.noop
  ReleaseWriteBuffer()
  {
  }

  /**
   * Trims the index storage to the requested byte size.
   *
   * Adapted: Carbon ignores the supplied pointer and resizes its vector, expecting
   * the result to fit in the previously allocated buffer (EveSOFData.cpp:973-978).
   * The storage is kept as it is when it already has that length, which is the
   * normal case after AllocateReadBuffer. Otherwise the retained prefix is copied
   * into a shorter array: a typed array cannot shrink or grow as vector.resize can.
   *
   * @param {string} _propertyName Ignored, as in Carbon.
   * @param {*} _buffer Ignored, as in Carbon.
   * @param {number} byteSize Nonnegative byte count; incomplete uint32 bytes are discarded.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  SetBufferAndSize(_propertyName, _buffer, byteSize)
  {
    const length = Math.floor(byteSize / 4);
    const source = this.indexBuffer;
    if (source.length !== length) this.indexBuffer = source.slice(0, Math.min(length, source.length));
  }

}

