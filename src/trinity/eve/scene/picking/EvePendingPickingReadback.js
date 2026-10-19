// Source: trinity/trinity/Eve/EvePicking.h
// Source: trinity/trinity/Eve/EveSpaceScene.cpp (PerformPicking)
import { meta, blue } from "#schema";
import { Tr2ReadbackAL } from "#trinityal";
import { PixelFormat } from "#consts/render-context";
import { Tr2PickBuffer } from "../../../core/scene/Tr2PickBuffer.js";

// No identity registry: a sequence only distinguishes independently retained
// requests. Refuse exhaustion instead of reusing a sequence still in flight.
let nextSequence = 1;

/** A request owns its retained objects and its independently copied GPU result. */
@blue.define("EvePendingPickingReadback")
export class EvePendingPickingReadback
{
  pickedX = 0;
  pickedY = 0;
  blueObjects = [];
  readback = new Tr2ReadbackAL();
  sequence = 0;

  /** Pre-92483097 request-owned buffers and retained collision/traceback records. */
  mainPickBuffer = null;
  debugPickBuffer = null;
  debugReadback = new Tr2ReadbackAL();
  collisionSet = [];
  instancedTraceback = [];
  debugLineObjects = [];
  debugTriangleObjects = [];

  /** Native coordinates; framework selects legacy buffers or a JS sequence replacing a process pointer. */
  constructor(pickedX = 0, pickedY = 0, framework = "pointer")
  {
    this.framework = framework;
    if (framework === "objectId")
    {
      this.mainPickBuffer = new Tr2PickBuffer(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
      this.debugPickBuffer = new Tr2PickBuffer(PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT);
    }
    else
    {
      if (nextSequence > 0xffffffff) throw new RangeError("Picking request sequences exhausted.");
      this.sequence = nextSequence++;
    }
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

  /** Pre-92483097 EvePicking.cpp: snapshot now; browser synchronization is awaited by the scene. */
  @meta.adapted
  MapMain(_synchronize, context)
  {
    this.readback.Destruct();
    this.readback = this.mainPickBuffer.CreateReadback(context);
  }

  /** Pre-92483097 EvePicking.cpp: independent float debug-result snapshot. */
  @meta.adapted
  MapDebug(_synchronize, context)
  {
    this.debugReadback.Destruct();
    this.debugReadback = this.debugPickBuffer.CreateReadback(context);
  }

  /**
   * Pre-92483097 EveSpaceScene.cpp:3508-3521, 3710-3766. Debug hits take
   * precedence; main BGRA bytes encode two uint16 values with minus-one
   * offsets. Async instance hits retain Carbon's zero instance index and owner
   * index in the high word. A supplied manager owns immediate instance lookup.
   * Adapted: return the shared JS result tuple; buffers are browser snapshots.
   */
  @meta.adapted
  DecodeResult__ObjectId(main, debug, immediate, instancedMeshManager)
  {
    let object = null, area = 0;
    if (debug && debug.byteLength >= 16)
    {
      const pixels = new DataView(debug.buffer, debug.byteOffset, 16);
      const index = ((Math.trunc(pixels.getFloat32(0, true) + 0.5) >>> 0) - 1) >>> 0;
      const objects = pixels.getFloat32(4, true) !== 0 ? this.debugLineObjects : this.debugTriangleObjects;
      if (index < objects.length) ({ object, area } = objects[index]);
    }
    if (object === null && main && main.byteLength >= 4)
    {
      const bytes = new DataView(main.buffer, main.byteOffset, 4);
      const objectId = (((bytes.getUint8(2) << 8) | bytes.getUint8(1)) - 1) >>> 0;
      const areaId = (((bytes.getUint8(0) << 8) | bytes.getUint8(3)) - 1) >>> 0;
      if (objectId < this.collisionSet.length)
      {
        object = this.collisionSet[objectId][0].GetID(areaId);
        area = areaId;
      }
      else if (immediate)
      {
        if (instancedMeshManager) [object, area] = instancedMeshManager.GetPickedObject(objectId, areaId);
      }
      else
      {
        const index = (objectId - this.collisionSet.length) >>> 0;
        if (index < this.instancedTraceback.length)
        {
          const [owner, ownerIndex] = this.instancedTraceback[index];
          object = owner;
          area = (ownerIndex << 16) >>> 0;
        }
      }
    }
    return [object, area, 0];
  }

  /** Pre-92483097 Unmap: snapshot release replaces the native borrowed-map lifetime. */
  @meta.adapted
  Unmap(_context)
  {
    this.readback.Destruct();
    this.debugReadback.Destruct();
  }

  /**
   * Explicit unique_ptr/shared_ptr destruction, including retained root objects.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  @meta.adapted
  Destruct()
  {
    this.Unmap();
    if (this.mainPickBuffer) this.mainPickBuffer.Destruct();
    if (this.debugPickBuffer) this.debugPickBuffer.Destruct();
    this.blueObjects.length = 0;
    this.collisionSet.length = this.instancedTraceback.length = 0;
    this.debugLineObjects.length = this.debugTriangleObjects.length = 0;
  }
}
