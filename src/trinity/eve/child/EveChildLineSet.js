// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { color } from "#math/color";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";

/** A child that renders a set of curved and sphere-projected line paths, as object geometry, as dedicated line rendering, or both. */
@type.define({ className: "EveChildLineSet", family: "eve/child" })
@carbon.inherit(ITr2Renderable)
export class EveChildLineSet extends EveChildTransform
{

  /** m_type (lineSetType - enum lineSetType) [READWRITE, PERSIST, ENUM, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("lineSetType")
  renderType = 1;

  /** m_lineSet (EveCurveLineSetPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("EveCurveLineSet")
  lineSet = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  display = true;

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  minScreenSize = -1;

  /** m_brightness (float) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  brightness = 1;

  /** m_baseColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.color
  baseColor = vec4.fromValues(1, 1, 1, 1);

  /** m_animColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.color
  animColor = color.createLinear();

  /** m_additiveBatch (bool) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  additiveBatches = false;

  /** m_scrollSpeed (float) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  scrollSpeed = 0;

  /** m_lines (PIEveLineSetPathVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("IEveLineSetPath")
  lines = [];

  /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  alwaysOn = false;

  /** m_currentScreenSize (float) [READ] */
  @edit.read
  @type.float32
  currentScreenSize = 1;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.model("Tr2Mesh")
  mesh = null;

  /** Carbon method GetVertexElementAddedThroughCode (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Returns Carbon's numeric Tr2VertexDefinition usage/index pairs without owning a renderer declaration.")
  GetVertexElementAddedThroughCode()
  {
    return [[5, 8], [5, 9], [5, 10]];
  }

  static lineSetType = Object.freeze({
    OBJECT_RENDER: 0,
    LINE_RENDER: 1,
    BOTH: 2,
  });

}
