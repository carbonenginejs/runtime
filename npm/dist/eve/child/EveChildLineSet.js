import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_renderType, _init_extra_renderType, _init_lineSet, _init_extra_lineSet, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_minScreenSize, _init_extra_minScreenSize, _init_brightness, _init_extra_brightness, _init_baseColor, _init_extra_baseColor, _init_animColor, _init_extra_animColor, _init_additiveBatches, _init_extra_additiveBatches, _init_scrollSpeed, _init_extra_scrollSpeed, _init_lines, _init_extra_lines, _init_alwaysOn, _init_extra_alwaysOn, _init_currentScreenSize, _init_extra_currentScreenSize, _init_mesh, _init_extra_mesh;

/** A child that renders a set of curved and sphere-projected line paths, as object geometry, as dedicated line rendering, or both. */
let _EveChildLineSet;
new class extends _identity {
  static [class EveChildLineSet extends _EveChildTransform {
    static {
      ({
        e: [_init_renderType, _init_extra_renderType, _init_lineSet, _init_extra_lineSet, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_minScreenSize, _init_extra_minScreenSize, _init_brightness, _init_extra_brightness, _init_baseColor, _init_extra_baseColor, _init_animColor, _init_extra_animColor, _init_additiveBatches, _init_extra_additiveBatches, _init_scrollSpeed, _init_extra_scrollSpeed, _init_lines, _init_extra_lines, _init_alwaysOn, _init_extra_alwaysOn, _init_currentScreenSize, _init_extra_currentScreenSize, _init_mesh, _init_extra_mesh, _initProto],
        c: [_EveChildLineSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildLineSet",
        family: "eve/child"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("lineSetType")], 16, "renderType"], [[io, io.persist, void 0, type.model("EveCurveLineSet")], 16, "lineSet"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.float32], 16, "minScreenSize"], [[io, io.notify, io, io.persist, type, type.float32], 16, "brightness"], [[io, io.notify, io, io.persist, type, type.color], 16, "baseColor"], [[io, io.notify, io, io.persist, type, type.color], 16, "animColor"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "additiveBatches"], [[io, io.notify, io, io.persist, type, type.float32], 16, "scrollSpeed"], [[io, io.persist, void 0, type.list("IEveLineSetPath")], 16, "lines"], [[io, io.persist, type, type.boolean], 16, "alwaysOn"], [[io, io.read, type, type.float32], 16, "currentScreenSize"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Mesh")], 16, "mesh"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Returns Carbon's numeric Tr2VertexDefinition usage/index pairs without owning a renderer declaration.")], 18, "GetVertexElementAddedThroughCode"]], 0, void 0, _EveChildTransform));
    }
    constructor(...args) {
      super(...args);
      _init_extra_mesh(this);
    }
    /** m_type (lineSetType - enum lineSetType) [READWRITE, PERSIST, ENUM, NOTIFY] */
    renderType = (_initProto(this), _init_renderType(this, 1));

    /** m_lineSet (EveCurveLineSetPtr) [READWRITE, PERSIST] */
    lineSet = (_init_extra_renderType(this), _init_lineSet(this, null));

    /** m_name (BlueSharedString) [READWRITE, PERSIST] */
    name = (_init_extra_lineSet(this), _init_name(this, ""));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_name(this), _init_display(this, true));

    /** m_minScreenSize (float) [READWRITE, PERSIST] */
    minScreenSize = (_init_extra_display(this), _init_minScreenSize(this, -1));

    /** m_brightness (float) [READWRITE, PERSIST, NOTIFY] */
    brightness = (_init_extra_minScreenSize(this), _init_brightness(this, 1));

    /** m_baseColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
    baseColor = (_init_extra_brightness(this), _init_baseColor(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_animColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
    animColor = (_init_extra_baseColor(this), _init_animColor(this, vec4.createLinear()));

    /** m_additiveBatch (bool) [READWRITE, PERSIST, NOTIFY] */
    additiveBatches = (_init_extra_animColor(this), _init_additiveBatches(this, false));

    /** m_scrollSpeed (float) [READWRITE, PERSIST, NOTIFY] */
    scrollSpeed = (_init_extra_additiveBatches(this), _init_scrollSpeed(this, 0));

    /** m_lines (PIEveLineSetPathVector) [READ, PERSIST] */
    lines = (_init_extra_scrollSpeed(this), _init_lines(this, []));

    /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
    alwaysOn = (_init_extra_lines(this), _init_alwaysOn(this, false));

    /** m_currentScreenSize (float) [READ] */
    currentScreenSize = (_init_extra_alwaysOn(this), _init_currentScreenSize(this, 1));

    /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST, NOTIFY] */
    mesh = (_init_extra_currentScreenSize(this), _init_mesh(this, null));

    /** Carbon method GetVertexElementAddedThroughCode (MAP_METHOD_AND_WRAP). */
    GetVertexElementAddedThroughCode() {
      return [[5, 8], [5, 9], [5, 10]];
    }
  }];
  lineSetType = Object.freeze({
    OBJECT_RENDER: 0,
    LINE_RENDER: 1,
    BOTH: 2
  });
  constructor() {
    super(_EveChildLineSet), _initClass();
  }
}();

export { _EveChildLineSet as EveChildLineSet };
//# sourceMappingURL=EveChildLineSet.js.map
