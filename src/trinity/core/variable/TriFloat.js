// Source: trinity/trinity/TriFloat.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/TriFloat.json.).
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** TriFloat (trinityCore) - generated from schema shapeHash b5384f79.... */
@type.define({ className: "TriFloat", family: "trinityCore" })
export class TriFloat extends CjsModel
{

  /** m_value (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  value = 0;

}
