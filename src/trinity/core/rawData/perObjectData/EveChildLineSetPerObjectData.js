// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet.cpp:12-40
import { meta } from "#schema";
import { Tr2PerObjectData } from "./Tr2PerObjectData.js";

/** Borrows the line-set owner's persistent vertex and pixel constant records. */
export class EveChildLineSetPerObjectData extends Tr2PerObjectData
{
  vsData = null;

  psData = null;

  /** Declares the borrowed payloads for the shared JS constant upload boundary. */
  @meta.ours
  GetPayloads()
  {
    return [this.vsData, this.psData];
  }

  /**
   * Uses the family's declared-stage gate in place of Carbon's unconditional
   * VS/PS uploads; see this folder's README and documented adaptation CE-19.
   */
  @meta.blue.method
  @meta.adapted
  SetPerObjectDataToDevice(buffers, constantTypeMask, renderContext)
  {
    return Tr2PerObjectData.setPerObjectDataToDevice(this, buffers, constantTypeMask, renderContext);
  }
}
