// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud.cpp:21-60
import { meta } from "#schema";
import { Tr2PerObjectData } from "./Tr2PerObjectData.js";

/** Legacy cloud constants, uploaded to the non-pixel shader stages. */
export class EveChildCloudPerObjectData extends Tr2PerObjectData
{
  data = null;

  /** Leases the native payload from the current frame's accumulator arena. */
  static alloc(accumulator)
  {
    const record = accumulator.Allocate(EveChildCloudPerObjectData);
    if (!record) return null;
    record.data = accumulator.Alloc("EveChildCloudPerObjectData");
    return record;
  }

  /** Exposes the one vertex-family payload to batch consumers. */
  GetPayloads()
  {
    return [this.data];
  }

  /** Adapted: RawData replaces the native struct and the shared uploader gates stages by the technique mask, as documented in this family's README (CE-19). */
  @meta.blue.method
  @meta.adapted
  SetPerObjectDataToDevice(buffers, constantTypeMask, renderContext)
  {
    return Tr2PerObjectData.setPerObjectDataToDevice(this, buffers, constantTypeMask, renderContext);
  }

  /** Native indirect draw requires the currently unported Tr2IndirectDrawBufferWriter. */
  @meta.blue.method
  @meta.notImplemented
  ApplyConstantBuffers()
  {
    throw new Error("EveChildCloudPerObjectData.ApplyConstantBuffers requires Tr2IndirectDrawBufferWriter.");
  }
}
