// Source: trinity/trinity/Include/ITr2InstanceData.h
import { CjsModel } from "#model";
import { type } from "#schema";

/** One realized instance-buffer slice returned by an ITr2InstanceData provider. */
@type.define({ className: "ITr2InstanceDataInstanceData", family: "trinityCore" })
export class ITr2InstanceDataInstanceData extends CjsModel
{
  @type.rawStruct("Tr2BufferAL")
  buffer = null;

  @type.uint32
  offset = 0;

  @type.uint32
  stride = 0;

  @type.uint32
  count = 0;
}
