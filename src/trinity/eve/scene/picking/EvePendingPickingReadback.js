// Source: trinity/trinity/Eve/EvePicking.h
// Source: trinity/trinity/Eve/EveSpaceScene.cpp (PerformPicking)
import { meta } from "#schema";
import { Tr2ReadbackAL } from "#trinityal";

// No identity registry: a sequence only distinguishes independently retained
// requests. Refuse exhaustion instead of reusing a sequence still in flight.
let nextSequence = 1;

/** A request owns its retained objects and its independently copied GPU result. */
@meta.define({ className: "EvePendingPickingReadback", family: "eve/scene" })
export class EvePendingPickingReadback
{
  pickedX = 0;
  pickedY = 0;
  blueObjects = [];
  readback = new Tr2ReadbackAL();
  sequence = 0;

  /** Native coordinates plus a request sequence replacing a process pointer. */
  constructor(pickedX = 0, pickedY = 0)
  {
    if (nextSequence > 0xffffffff) throw new RangeError("Picking request sequences exhausted.");
    this.sequence = nextSequence++;
    this.pickedX = pickedX >>> 0;
    this.pickedY = pickedY >>> 0;
  }

  /** Replaces native root pointers with a one-based retained index and sequence. */
  @meta.adapted
  RetainObject(object)
  {
    this.blueObjects.push(object);
    return (BigInt(this.sequence) << 32n) | BigInt(this.blueObjects.length);
  }

  /** Validates both identity words against this request before returning a root. */
  @meta.adapted
  DecodeResult(data)
  {
    if (!data || data.byteLength < 16) return [null, 0, 0];
    const words = new DataView(data.buffer, data.byteOffset, 16);
    const index = words.getUint32(0, true);
    const sequence = words.getUint32(4, true);
    const object = sequence === this.sequence && index > 0 && index <= this.blueObjects.length
      ? this.blueObjects[index - 1] : null;
    return [object, words.getUint32(8, true), words.getUint32(12, true)];
  }

  /** Explicit unique_ptr/shared_ptr destruction, including retained root objects. */
  @meta.adapted
  Destroy()
  {
    this.readback.Destroy();
    this.blueObjects.length = 0;
  }
}
