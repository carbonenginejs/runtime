// Source: trinity/trinity/Tr2DebugRenderer.h:105-117
// Source: trinity/trinity/Tr2DebugRenderer.cpp:114-137
import { vec3 } from "#math/vec3";
import { type, meta } from "#schema";

/**
 * Carbon Tr2DebugRenderer::Vertex: one vertex of a debug line or triangle,
 * 40 bytes in Carbon's layout - position, normal, then (object, line) as
 * TEXCOORD0 and the two packed colours as COLOR1/COLOR2.
 *
 * The JavaScript constructor is Carbon's empty default constructor, which
 * leaves every member unset; the two value constructors are the `create__`
 * factories.
 */
@meta.define({ className: "Tr2DebugRendererVertex", carbon: "Tr2DebugRenderer::Vertex" })
export class Tr2DebugRendererVertex
{

  /** m_position. Carbon leaves it unset. */
  @type.vec3
  position = vec3.create();

  /** m_normal. Carbon leaves it unset. */
  @type.vec3
  normal = vec3.create();

  /** m_object: the owner's index plus one. Carbon leaves it unset. */
  @type.float32
  object = 0;

  /** m_line: 1 for a line vertex, 0 for a triangle vertex. Carbon leaves it unset. */
  @type.float32
  line = 0;

  /** m_color: packed front colour. Carbon leaves it unset. */
  @type.uint32
  color = 0;

  /** m_zFailColor: packed colour behind other geometry. Carbon leaves it unset. */
  @type.uint32
  zFailColor = 0;

  /**
   * Carbon's line-vertex constructor (cpp:118-126): no normal, m_line 1.
   * @param {vec3} position
   * @param {Tr2DebugColor} color
   * @param {boolean} selected Picks the selected colour pair.
   * @param {number} objectIndex Index into the renderer's owner offsets.
   * @returns {Tr2DebugRendererVertex}
   */
  static create__Position(position, color, selected, objectIndex)
  {
    const vertex = new Tr2DebugRendererVertex();
    vec3.copy(vertex.position, position);
    vec3.set(vertex.normal, 0, 0, 0);
    vertex.color = selected ? color.colorSelected : color.color;
    vertex.zFailColor = selected ? color.zFailColorSelected : color.zFailColor;
    vertex.line = 1;
    vertex.object = objectIndex + 1;
    return vertex;
  }

  /**
   * Carbon's triangle-vertex constructor (cpp:128-137): normalized normal,
   * m_line 0.
   * @param {vec3} position
   * @param {vec3} normal
   * @param {Tr2DebugColor} color
   * @param {boolean} selected Picks the selected colour pair.
   * @param {number} objectIndex Index into the renderer's owner offsets.
   * @returns {Tr2DebugRendererVertex}
   */
  static create__PositionNormal(position, normal, color, selected, objectIndex)
  {
    const vertex = new Tr2DebugRendererVertex();
    vec3.copy(vertex.position, position);
    vec3.normalize(vertex.normal, normal);
    vertex.color = selected ? color.colorSelected : color.color;
    vertex.zFailColor = selected ? color.zFailColorSelected : color.zFailColor;
    vertex.line = 0;
    vertex.object = objectIndex + 1;
    return vertex;
  }
}
