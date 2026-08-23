// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dLineTraceVertex.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Tr2Sprite2dLineTraceVertex (sprite2d) - generated from schema shapeHash 9d769463.... */
@type.define({ className: "Tr2Sprite2dLineTraceVertex", family: "sprite2d" })
export class Tr2Sprite2dLineTraceVertex extends CjsModel
{

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_position (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  position = vec2.create();

}
