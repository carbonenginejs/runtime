// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\Behaviors\ProcessLifetime.h
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({
  className: "ProcessLifetimeData",
  family: "eve"
})
export class ProcessLifetimeData extends CjsModel
{
  @type.boolean
  hasUsedEntryTunnel = false;

  @type.boolean
  hasUsedExitTunnel = false;

  @type.int32
  assignedLifeTimeTunnel = 0;

  @type.int32
  tunnelPoint = 0;

  @type.boolean
  hasSpawned = false;
}
