// The scene's per-frame constants, for the two registers Carbon reserves.
//
// Short because everything it needs already exists. EveSpaceScene owns the two
// records (`m_perFrameVS`/`m_perFramePS`), EveSpaceSceneRenderDriver already
// fills them each frame in Carbon's order - PS then VS - and RawData extends
// CjsConstantPayload, so the packed bytes are one call away. What was missing
// was only the join: nothing carried them from the scene to a binding.
//
// b1 and b2 are not optional decoration. Every v5 shader binds both, so a hull
// cannot be drawn without them, which is why the resolver refuses rather than
// leaving them empty.
//
// The records are PERSISTENT and scene-owned, not leased per draw
// (`RawData.create`), so this hands back a live view rather than a copy: two
// batches in one frame read the same bytes, which is the point of a per-frame
// buffer.
import { PER_FRAME_PS, PER_FRAME_VS } from "./constantSlots.js";


function fail(message)
{
  const error = new Error(`CjsWebgpuPerFrameSource: ${message}`);
  error.code = "CJS_WEBGPU_PER_FRAME_SOURCE_INVALID";
  throw error;
}


/** Supplies the per-frame constant registers from one scene. */
export class CjsWebgpuPerFrameSource
{
  #scene;

  /**
   * @param {object} scene Scene owning the per-frame records.
   */
  constructor(scene)
  {
    if (!scene) fail("a scene is required; nothing else owns per-frame data");

    this.#scene = scene;
  }

  /**
   * The packed bytes for one per-frame register.
   *
   * @param {number} slot Constant-buffer register, 1 or 2.
   * @returns {ArrayBufferView} The scene's packed record.
   */
  Resolve(slot)
  {
    // A scene HAS both accessors; only the slot number is in question.
    const record = slot === PER_FRAME_VS
      ? this.#scene.GetPerFrameVSData()
      : (slot === PER_FRAME_PS ? this.#scene.GetPerFramePSData() : null);

    if (!record)
    {
      fail(`b${slot} is not a per-frame register, or the scene holds no record for it`);
    }

    const data = record.GetData();

    // A record that packs to nothing would bind an empty buffer and draw a
    // black frame, which reads as a lighting bug rather than a missing upload.
    if (!ArrayBuffer.isView(data)) fail(`the scene's b${slot} record did not pack to a typed array`);

    return data;
  }

  /**
   * A resolver hook bound to this source.
   *
   * @returns {Function} `(slot) => ArrayBufferView`
   */
  ResolvePerFrame()
  {
    return (slot) => this.Resolve(slot);
  }
}
