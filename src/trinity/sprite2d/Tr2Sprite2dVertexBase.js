// Source: trinity/trinity/Sprite2d/ITr2Sprite2dRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dVertexBase.json.).
import { meta } from "#schema";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/**
 * Plain native Sprite2D vertex storage; no native query interface is declared.
 * Carbon's base aggregate has no explicit initialization. Existing JavaScript
 * defaults match the concrete polygon vertex constructor and also provide
 * deterministic values for D3D vertices. Position RW/PERSIST metadata is the
 * existing authored-vertex adapter, inherited by the concrete polygon class;
 * the native plain base itself has no Blue exposure or persistence flags.
 */
@meta.define({ className: "Tr2Sprite2dVertexBase", family: "sprite2d" })
export class Tr2Sprite2dVertexBase
{

  /**
   * Vertex position in the sprite's local three-component coordinates.
   * Native position (Vector3).
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  position = vec3.create();

  /**
   * RGBA vertex tint; the JavaScript default is opaque white.
   * Native color (Color).
   * @type {Float32Array}
   */
  @meta.type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /**
   * Two UV coordinate pairs, one for each texture input.
   * Native texCoord (Vector2[2]).
   * @type {Float32Array[]}
   */
  @meta.type.array("vec2")
  texCoord = [vec2.create(), vec2.create()];

}
