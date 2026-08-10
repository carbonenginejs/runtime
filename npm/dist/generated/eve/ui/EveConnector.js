import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_type, _init_extra_type, _init_color, _init_extra_color, _init_lineWidth, _init_extra_lineWidth, _init_animationColor, _init_extra_animationColor, _init_animationScale, _init_extra_animationScale, _init_animationSpeed, _init_extra_animationSpeed, _init_isAnimated, _init_extra_isAnimated, _init_autoScaleAnimation, _init_extra_autoScaleAnimation, _init_destPosition, _init_extra_destPosition, _init_sourcePosition, _init_extra_sourcePosition, _init_destObject, _init_extra_destObject, _init_sourceObject, _init_extra_sourceObject, _init_planeNormal, _init_extra_planeNormal, _init_length, _init_extra_length;

/** EveConnector (eve/ui) - generated from schema shapeHash c8413c89.... */
let _EveConnector;
new class extends _identity {
  static [class EveConnector extends CjsModel {
    static {
      ({
        e: [_init_type, _init_extra_type, _init_color, _init_extra_color, _init_lineWidth, _init_extra_lineWidth, _init_animationColor, _init_extra_animationColor, _init_animationScale, _init_extra_animationScale, _init_animationSpeed, _init_extra_animationSpeed, _init_isAnimated, _init_extra_isAnimated, _init_autoScaleAnimation, _init_extra_autoScaleAnimation, _init_destPosition, _init_extra_destPosition, _init_sourcePosition, _init_extra_sourcePosition, _init_destObject, _init_extra_destObject, _init_sourceObject, _init_extra_sourceObject, _init_planeNormal, _init_extra_planeNormal, _init_length, _init_extra_length],
        c: [_EveConnector, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveConnector",
        family: "eve/ui"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("ConnectorType")], 16, "type"], [[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.float32], 16, "lineWidth"], [[io, io.persist, type, type.color], 16, "animationColor"], [[io, io.persist, type, type.float32], 16, "animationScale"], [[io, io.persist, type, type.float32], 16, "animationSpeed"], [[io, io.persist, type, type.boolean], 16, "isAnimated"], [[io, io.persist, type, type.boolean], 16, "autoScaleAnimation"], [[io, io.persist, type, type.vec3], 16, "destPosition"], [[io, io.persist, type, type.vec3], 16, "sourcePosition"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "destObject"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "sourceObject"], [[io, io.persist, type, type.vec3], 16, "planeNormal"], [[io, io.persist, type, type.float32], 16, "length"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_length(this);
    }
    /** m_type (ConnectorType - enum ConnectorType) [READWRITE, PERSIST, ENUM] */
    type = _init_type(this, 0);

    /** m_color (Color) [READWRITE, PERSIST] */
    color = (_init_extra_type(this), _init_color(this, vec4.fromValues(0.5, 0.5, 0.5, 1)));

    /** m_width (float) [READWRITE, PERSIST] */
    lineWidth = (_init_extra_color(this), _init_lineWidth(this, 1));

    /** m_animationColor (Color) [READWRITE, PERSIST] */
    animationColor = (_init_extra_lineWidth(this), _init_animationColor(this, vec4.fromValues(1, 0, 0, 1)));

    /** m_animationScale (float) [READWRITE, PERSIST] */
    animationScale = (_init_extra_animationColor(this), _init_animationScale(this, 1));

    /** m_animationSpeed (float) [READWRITE, PERSIST] */
    animationSpeed = (_init_extra_animationScale(this), _init_animationSpeed(this, 0));

    /** m_isAnimated (bool) [READWRITE, PERSIST] */
    isAnimated = (_init_extra_animationSpeed(this), _init_isAnimated(this, false));

    /** m_autoScaleAnimation (bool) [READWRITE, PERSIST] */
    autoScaleAnimation = (_init_extra_isAnimated(this), _init_autoScaleAnimation(this, false));

    /** m_destPosition (Vector3) [READWRITE, PERSIST] */
    destPosition = (_init_extra_autoScaleAnimation(this), _init_destPosition(this, vec3.create()));

    /** m_sourcePosition (Vector3) [READWRITE, PERSIST] */
    sourcePosition = (_init_extra_destPosition(this), _init_sourcePosition(this, vec3.create()));

    /** m_destObject (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
    destObject = (_init_extra_sourcePosition(this), _init_destObject(this, null));

    /** m_sourceObject (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
    sourceObject = (_init_extra_destObject(this), _init_sourceObject(this, null));

    /** m_normal (Vector3) [READWRITE, PERSIST] */
    planeNormal = (_init_extra_sourceObject(this), _init_planeNormal(this, vec3.fromValues(0, 1, 0)));

    /** m_length (float) [READWRITE, PERSIST] */
    length = (_init_extra_planeNormal(this), _init_length(this, 0));
  }];
  ConnectorType = Object.freeze({
    PointToPoint: 0,
    XZ_CircleStraight: 1,
    XZ_Circle: 2,
    StraightAnchor: 3,
    CurvedAnchor: 4,
    Orbit: 5,
    Circle: 6,
    Ellipse: 7
  });
  constructor() {
    super(_EveConnector), _initClass();
  }
}();

export { _EveConnector as EveConnector };
//# sourceMappingURL=EveConnector.js.map
