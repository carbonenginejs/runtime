// Source: trinity/trinity/Sprite2d/ITr2Sprite2dRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dVertexBase.json.).
import { type } from "#schema";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Tr2Sprite2dVertexBase (sprite2d) - generated from schema shapeHash 3bb60192.... */
@type.define({ className: "Tr2Sprite2dVertexBase", family: "sprite2d" })
export class Tr2Sprite2dVertexBase extends CjsModel
{

  /** position (Vector3) */
  @type.vec3
  position = vec3.create();

  /** color (Color) */
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** texCoord (Vector2) */
  @type.array("vec2")
  texCoord = [vec2.create(), vec2.create()];

}
