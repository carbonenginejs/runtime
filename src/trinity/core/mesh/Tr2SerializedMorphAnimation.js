// Source: trinity/trinity/Tr2Mesh.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/Tr2SerializedMorphAnimation.json.).
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2SerializedMorphAnimation (trinityCore) - generated from schema shapeHash 58cefc7b.... */
@type.define({ className: "Tr2SerializedMorphAnimation", family: "trinityCore" })
export class Tr2SerializedMorphAnimation extends CjsModel
{

  /** m_name (std::string) [PERSISTONLY] */
  @io.persistOnly
  @type.string
  name = "";

  /** m_weight (float) [PERSISTONLY] */
  @io.persistOnly
  @type.float32
  weight = 0;

}
