// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataDecalIndexBuffer (eve) - generated from schema shapeHash 0c215c06.... */
@type.define({ className: "EveSOFDataDecalIndexBuffer", family: "eve" })
export class EveSOFDataDecalIndexBuffer extends CjsModel
{

  /** indexBuffer (typedArray) [PERSISTONLY] */
  @io.persistOnly
  @type.typedArray("Uint32Array")
  indexBuffer = new Uint32Array(0);

  /** Carbon method AddIndex (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddIndex(index)
  {
    const source = this.indexBuffer;
    const next = new Uint32Array(source.length + 1);
    next.set(source);
    next[source.length] = Number(index) >>> 0;
    this.indexBuffer = next;
    // Carbon: void AddIndex(uint32_t) (EveSOFData.h:1276) - no return value.
  }

  /** Carbon method GetIndices (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetIndices()
  {
    return Array.from(this.indexBuffer ?? [], value => Number(value) >>> 0);
  }

  // The ICustomPersist contract (EveSOFData.h:1300, cpp:958-978): the loader
  // sizes the buffer, blits into it, then truncates to what it actually used.

  /**
   * Carbon AllocateReadBuffer (cpp:975): size the store to byteSize/4
   * elements and return the storage the loader blits into.
   *
   * @param {number} byteSize
   * @returns {Uint32Array} The backing store.
   */
  @carbon.method
  @impl.implemented
  AllocateReadBuffer(byteSize)
  {
    this.indexBuffer = new Uint32Array(Math.floor(byteSize / 4));
    return this.indexBuffer;
  }

  /**
   * Carbon GetWriteBufferAndSize (cpp:958): the raw storage and its byte
   * size. The donor indexes element [0] without guarding an empty vector;
   * a typed array has no such hazard, so the empty case returns the empty
   * store rather than reproducing undefined behaviour.
   *
   * @returns {{buffer: Uint32Array, byteSize: number}}
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon out-params a raw byte pointer and size; JS returns them as a record, and a typed array cannot reproduce the donor's unguarded [0] on empty.")
  GetWriteBufferAndSize()
  {
    const buffer = this.indexBuffer ?? new Uint32Array(0);
    return { buffer, byteSize: buffer.length * 4 };
  }

  /**
   * Carbon ReleaseWriteBuffer (cpp:964): EMPTY body - the vector owns its
   * memory, so the contract's release step frees nothing. An empty
   * implementation is not absence; the persist flow calls it.
   */
  @carbon.method
  @impl.implemented
  ReleaseWriteBuffer()
  {
  }

  /**
   * Carbon SetBufferAndSize (cpp:968): TRUNCATE ONLY. The donor's own
   * comment says the set buffer is always within the previously allocated
   * read buffer, so the incoming pointer is deliberately ignored and the
   * store just shrinks to byteSize/4 elements - preserved exactly.
   *
   * @param {*} _buffer Ignored, as in Carbon.
   * @param {number} byteSize
   */
  @carbon.method
  @impl.implemented
  SetBufferAndSize(_buffer, byteSize)
  {
    const elements = Math.floor(byteSize / 4);
    const source = this.indexBuffer ?? new Uint32Array(0);
    this.indexBuffer = source.subarray(0, Math.min(elements, source.length)).slice();
  }

}
