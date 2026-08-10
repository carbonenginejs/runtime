// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** A child that renders a set of curved and sphere-projected line paths, as object geometry, as dedicated line rendering, or both. */
@type.define({ className: "EveChildLineSet", family: "eve/child" })
export class EveChildLineSet extends EveChildTransform
{

  /** m_type (lineSetType - enum lineSetType) [READWRITE, PERSIST, ENUM, NOTIFY] */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("lineSetType")
  renderType = 1;

  /** m_lineSet (EveCurveLineSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveCurveLineSet")
  lineSet = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minScreenSize = -1;

  /** m_brightness (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  brightness = 1;

  /** m_baseColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.color
  baseColor = vec4.fromValues(1, 1, 1, 1);

  /** m_animColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.color
  animColor = vec4.createLinear();

  /** m_additiveBatch (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  additiveBatches = false;

  /** m_scrollSpeed (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  scrollSpeed = 0;

  /** m_lines (PIEveLineSetPathVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveLineSetPath")
  lines = [];

  /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  alwaysOn = false;

  /** m_currentScreenSize (float) [READ] */
  @io.read
  @type.float32
  currentScreenSize = 1;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
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
