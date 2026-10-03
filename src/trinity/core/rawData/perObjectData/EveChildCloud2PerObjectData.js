// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud2.cpp:26-67
// Native anonymous EveChildCloudPerObjectData is qualified with its Cloud2 owner
// to distinguish it from the separate legacy cloud's anonymous class.
import { FillAndSetConstants } from "../../Tr2RenderUtils.js";
import { PER_OBJECT_VS, PER_OBJECT_PS } from "../../Tr2Renderer.js";
import { meta } from "#schema";
import { Tr2PerObjectData } from "./Tr2PerObjectData.js";

/** Cloud2's shared constant block, bound at the native vertex and pixel registers. */
export class EveChildCloud2PerObjectData extends Tr2PerObjectData
{
  data = null;

  /** Leases the native struct from the frame accumulator. */
  static alloc(accumulator)
  {
    const record = accumulator.Allocate(EveChildCloud2PerObjectData);
    if (!record) return null;
    record.data = accumulator.Alloc("EveChildCloud2PerObjectData");
    return record;
  }

  /** Exposes the shared stage payload. */
  GetPayloads()
  {
    return [this.data];
  }

  /** Adapted: RawData replaces the native struct; native stage masks and buffers are retained. */
  @meta.adapted
  SetPerObjectDataToDevice(buffers, mask, context)
  {
    const family = Tr2PerObjectData.VertexFamilyMask;
    const bytes = this.data.GetData();
    let uploaded = 0;
    if (mask & family)
      uploaded += Number(FillAndSetConstants(buffers[0], bytes, bytes.byteLength, family, PER_OBJECT_VS, context));
    if (mask & 2)
      uploaded += Number(FillAndSetConstants(buffers[1], bytes, bytes.byteLength, 2, PER_OBJECT_PS, context));
    return uploaded;
  }

  /** The native indirect writer is still unported; direct draws use the method above. */
  @meta.notImplemented
  ApplyConstantBuffers()
  {
    throw new Error("EveChildCloud2PerObjectData.ApplyConstantBuffers requires Tr2IndirectDrawBufferWriter.");
  }
}
