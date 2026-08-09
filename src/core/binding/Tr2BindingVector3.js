// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2BindingVector3.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/Tr2BindingVector3.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** Tr2BindingVector3 (trinityCore) - generated from schema shapeHash a8ef1406.... */
@type.define({ className: "Tr2BindingVector3", family: "trinityCore" })
export class Tr2BindingVector3 extends CjsModel
{

  /** m_value (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  value = vec3.create();

}
