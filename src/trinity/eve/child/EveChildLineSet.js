// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { EveChildTransform } from "./EveChildTransform.js";
import { color } from "#math/color";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { blue, EnumRegistrationType } from "#blue";

/** A child that renders a set of curved and sphere-projected line paths, as object geometry, as dedicated line rendering, or both. */
@meta.define({ className: "EveChildLineSet", family: "eve/child" })
@meta.blue.inherit(ITr2Renderable)
export class EveChildLineSet extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildLineSet_Blue.cpp:31 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildLineSet_Blue.cpp:32 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_type (lineSetType - enum lineSetType) [READWRITE, PERSIST, ENUM, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EveChildLineSet.lineSetType")
  renderType = 1;

  /** m_lineSet (EveCurveLineSetPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("EveCurveLineSet")
  lineSet = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minScreenSize = -1;

  /** m_brightness (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  brightness = 1;

  /** m_baseColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  baseColor = vec4.fromValues(1, 1, 1, 1);

  /** m_animColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  animColor = color.createLinear();

  /** m_additiveBatch (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  additiveBatches = false;

  /** m_scrollSpeed (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  scrollSpeed = 0;

  /** m_lines (PIEveLineSetPathVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveLineSetPath")
  lines = [];

  /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  alwaysOn = false;

  /** m_currentScreenSize (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  currentScreenSize = 1;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Mesh")
  mesh = null;

  /** Carbon method GetVertexElementAddedThroughCode (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Returns Carbon's numeric Tr2VertexDefinition usage/index pairs without owning a renderer declaration.")
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

// Registered as Carbon registers it (trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet_Blue.cpp:13).
blue.enums.RegisterEnum("trinity.EveChildLineSet.lineSetType", EveChildLineSet.lineSetType, {
  source: "trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet.h", family: "eve/child", line: 92,
  exposedName: "LineSetTypes", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet_Blue.cpp:7",
  chooser: [
    { name: "ObjectRender", value: EveChildLineSet.lineSetType.OBJECT_RENDER, description: "sprites or other objects are rendered at each segment" },
    { name: "LineRender", value: EveChildLineSet.lineSetType.LINE_RENDER, description: "To render a 3dLine shader between the points" },
    { name: "Both", value: EveChildLineSet.lineSetType.BOTH, description: "Both of the above" }
  ]
});
