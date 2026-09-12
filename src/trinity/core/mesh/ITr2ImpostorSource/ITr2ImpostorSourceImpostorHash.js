// Source: trinity/trinity/Tr2ImpostorManager.h
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { CjsSchema, impl, type } from "#schema";


const ITR2_IMPOSTOR_SOURCE = Symbol.for("carbonenginejs.contract.ITr2ImpostorSource");


/** Camera directions used to decide when an impostor must be recaptured. */
@type.define({ className: "ITr2ImpostorSourceImpostorHash", family: "trinityCore" })
export class ITr2ImpostorSourceImpostorHash extends CjsModel
{
  @type.vec3
  viewDir = vec3.create();

  @type.vec3
  upDir = vec3.create();
}
