import { io, type } from "#schema";
import { CjsModel } from "#model";

/**
 * CarbonEngineJS-original external graph reference.
 *
 * Carbon ships deferred-loading nodes for children (EveChildRef) and
 * controllers (Tr2ControllerReference) but inline-loads everything else
 * because its blocking BeResMan made that free. For slots with no Carbon
 * reference class - currently the model rotation/translation curves - the
 * builder emits this node instead: the authored res path plus the interface
 * the loaded root must implement. A consuming loader resolves the reference
 * by fetching and decoding the target graph, verifying the root against
 * `expects`, and splicing it into the owning slot.
 */
@type.define({ className: "CjsExternalRef", family: "sof" })
export class CjsExternalRef extends CjsModel
{

  @io.persist
  @type.string
  resPath = "";

  /** Carbon interface name the loaded root must implement (load-time gate). */
  @io.persist
  @type.string
  expects = "";

}
