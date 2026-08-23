// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dTriangle.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2Sprite2dTriangle (sprite2d) - generated from schema shapeHash b41a9ed3.... */
@type.define({ className: "Tr2Sprite2dTriangle", family: "sprite2d" })
export class Tr2Sprite2dTriangle extends CjsModel
{

  /** m_index[0] (uint16_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint16
  index0 = 0;

  /** m_index[1] (uint16_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint16
  index1 = 0;

  /** m_index[2] (uint16_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint16
  index2 = 0;

}
