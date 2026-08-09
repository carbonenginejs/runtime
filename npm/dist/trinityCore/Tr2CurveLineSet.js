import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_lines, _init_extra_lines, _init_emptyLineID, _init_extra_emptyLineID, _init_currentSubmittedLineCount, _init_extra_currentSubmittedLineCount, _init_additive, _init_extra_additive, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_lineWidthFactor, _init_extra_lineWidthFactor, _init_depthOffset, _init_extra_depthOffset, _init_lineEffect, _init_extra_lineEffect, _init_pickEffect, _init_extra_pickEffect;
function sphericalToCartesian(value, center) {
  const phi = value[0];
  const theta = value[1];
  const radius = value[2];
  return vec3.fromValues(radius * Math.sin(phi) * Math.sin(theta) + center[0], radius * Math.cos(theta) + center[1], radius * Math.cos(phi) * Math.sin(theta) + center[2]);
}

/** A line set that draws curved and sphere-projected lines by tessellating them into straight segments. */
let _Tr2CurveLineSet;
new class extends _identity {
  static [class Tr2CurveLineSet extends CjsModel {
    static {
      ({
        e: [_init_lines, _init_extra_lines, _init_emptyLineID, _init_extra_emptyLineID, _init_currentSubmittedLineCount, _init_extra_currentSubmittedLineCount, _init_additive, _init_extra_additive, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_lineWidthFactor, _init_extra_lineWidthFactor, _init_depthOffset, _init_extra_depthOffset, _init_lineEffect, _init_extra_lineEffect, _init_pickEffect, _init_extra_pickEffect, _initProto],
        c: [_Tr2CurveLineSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CurveLineSet",
        family: "trinityCore"
      })], [[type.list("LineData"), 0, "lines"], [type.array("uint32"), 0, "emptyLineID"], [[type, type.uint32], 16, "currentSubmittedLineCount"], [[io, io.persist, type, type.boolean], 16, "additive"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.float32], 16, "lineWidthFactor"], [[io, io.persist, type, type.float32], 16, "depthOffset"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Material")], 16, "lineEffect"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Material")], 16, "pickEffect"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddCurvedLineCrt"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddCurvedLineSph"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddSpheredLineCrt"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddSpheredLineSph"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddStraightLine"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineIntermediateSph"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineIntermediateCrt"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLinePositionSph"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLinePositionCrt"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineAnimation"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineMultiColor"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineSegmentation"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineColor"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineWidth"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearLines"], [[carbon, carbon.method, impl, impl.adapted], 18, "RemoveLine"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Retains Carbon LineData and submitted segment counts; renderer runtimes realize the vertex buffer.")], 18, "SubmitChanges"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_pickEffect(this);
    }
    /** CPU-side Carbon LineData records; live vertex buffers belong to a renderer. */
    lines = (_initProto(this), _init_lines(this, []));

    /** Reusable invalid line slots, matching Carbon's stable ID behavior. */
    emptyLineID = (_init_extra_lines(this), _init_emptyLineID(this, []));

    /** Number of straight segments represented by the last submission. */
    currentSubmittedLineCount = (_init_extra_emptyLineID(this), _init_currentSubmittedLineCount(this, 0));

    /** m_additive (bool) [READWRITE, PERSIST] */
    additive = (_init_extra_currentSubmittedLineCount(this), _init_additive(this, false));

    /** m_translation (Vector3) [READWRITE, PERSIST] */
    translation = (_init_extra_additive(this), _init_translation(this, vec3.create()));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_translation(this), _init_rotation(this, quat.create()));

    /** m_scaling (Vector3) [READWRITE, PERSIST] */
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_scaling(this), _init_display(this, true));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_display(this), _init_name(this, ""));

    /** m_lineWidthFactor (float) [READWRITE, NOTIFY, PERSIST] */
    lineWidthFactor = (_init_extra_name(this), _init_lineWidthFactor(this, 1));

    /** m_depthOffset (float) [READWRITE, PERSIST] */
    depthOffset = (_init_extra_lineWidthFactor(this), _init_depthOffset(this, 0));

    /** m_lineEffect (Tr2MaterialPtr) [READWRITE, NOTIFY, PERSIST] */
    lineEffect = (_init_extra_depthOffset(this), _init_lineEffect(this, null));

    /** m_pickEffect (Tr2MaterialPtr) [READWRITE, NOTIFY, PERSIST] */
    pickEffect = (_init_extra_lineEffect(this), _init_pickEffect(this, null));

    /** Carbon method AddCurvedLineCrt (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    AddCurvedLineCrt(position1, color1, position2, color2, middle, width, segments = 20) {
      return this.#addLineData(this.#createLine(_Tr2CurveLineSet.LineType.LINETYPE_CURVED, position1, color1, position2, color2, middle, width, segments > 0 ? Math.trunc(segments) : 1));
    }

    /** Carbon method AddCurvedLineSph (MAP_METHOD_AND_WRAP). */
    AddCurvedLineSph(position1, color1, position2, color2, center, middle, width) {
      return this.AddCurvedLineCrt(sphericalToCartesian(position1, center), color1, sphericalToCartesian(position2, center), color2, sphericalToCartesian(middle, center), width);
    }

    /** Carbon method AddSpheredLineCrt (MAP_METHOD_AND_WRAP). */
    AddSpheredLineCrt(position1, color1, position2, color2, center, width) {
      return this.#addLineData(this.#createLine(_Tr2CurveLineSet.LineType.LINETYPE_SPHERED, position1, color1, position2, color2, center, width, 20));
    }

    /** Carbon method AddSpheredLineSph (MAP_METHOD_AND_WRAP). */
    AddSpheredLineSph(position1, color1, position2, color2, center, width) {
      return this.AddSpheredLineCrt(sphericalToCartesian(position1, center), color1, sphericalToCartesian(position2, center), color2, center, width);
    }

    /** Carbon method AddStraightLine (MAP_METHOD_AND_WRAP). */
    AddStraightLine(position1, color1, position2, color2, width) {
      return this.#addLineData(this.#createLine(_Tr2CurveLineSet.LineType.LINETYPE_STRAIGHT, position1, color1, position2, color2, vec3.create(), width, 1));
    }

    /** Carbon method ChangeLineIntermediateSph (MAP_METHOD_AND_WRAP). */
    ChangeLineIntermediateSph(id, intermediatePosition, center) {
      this.ChangeLineIntermediateCrt(id, sphericalToCartesian(intermediatePosition, center));
    }

    /** Carbon method ChangeLineIntermediateCrt (MAP_METHOD_AND_WRAP). */
    ChangeLineIntermediateCrt(id, intermediatePosition) {
      if (this.#isValidLineID(id)) {
        vec3.copy(this.lines[id].intermediatePosition, intermediatePosition);
      }
    }

    /** Carbon method ChangeLinePositionSph (MAP_METHOD_AND_WRAP). */
    ChangeLinePositionSph(id, position1, position2, center) {
      this.ChangeLinePositionCrt(id, sphericalToCartesian(position1, center), sphericalToCartesian(position2, center));
    }

    /** Carbon method ChangeLinePositionCrt (MAP_METHOD_AND_WRAP). */
    ChangeLinePositionCrt(id, position1, position2) {
      if (this.#isValidLineID(id)) {
        vec3.copy(this.lines[id].position1, position1);
        vec3.copy(this.lines[id].position2, position2);
      }
    }

    /** Carbon method ChangeLineAnimation (MAP_METHOD_AND_WRAP). */
    ChangeLineAnimation(id, color, speed, scale) {
      if (this.#isValidLineID(id)) {
        vec4.copy(this.lines[id].overlayColor, color);
        this.lines[id].animationSpeed = speed;
        this.lines[id].animationScale = scale;
      }
    }

    /** Carbon method ChangeLineMultiColor (MAP_METHOD_AND_WRAP). */
    ChangeLineMultiColor(id, color, border) {
      if (this.#isValidLineID(id)) {
        vec4.copy(this.lines[id].multiColor, color);
        this.lines[id].multiColorBorder = border;
      }
    }

    /** Carbon method ChangeLineSegmentation (MAP_METHOD_AND_WRAP). */
    ChangeLineSegmentation(id, numOfSegments) {
      if (this.#isValidLineID(id) && this.lines[id].type !== _Tr2CurveLineSet.LineType.LINETYPE_STRAIGHT) {
        this.lines[id].numOfSegments = Math.max(0, Math.trunc(numOfSegments));
      }
    }

    /** Carbon method ChangeLineColor (MAP_METHOD_AND_WRAP). */
    ChangeLineColor(id, color1, color2) {
      if (this.#isValidLineID(id)) {
        vec4.copy(this.lines[id].color1, color1);
        vec4.copy(this.lines[id].color2, color2);
      }
    }

    /** Carbon method ChangeLineWidth (MAP_METHOD_AND_WRAP). */
    ChangeLineWidth(id, width) {
      if (this.#isValidLineID(id)) {
        this.lines[id].width = width;
      }
    }

    /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
    ClearLines() {
      this.lines.length = 0;
      this.emptyLineID.length = 0;
    }

    /** Carbon method RemoveLine (MAP_METHOD_AND_WRAP). */
    RemoveLine(id) {
      if (this.#isValidLineID(id)) {
        this.lines[id].type = _Tr2CurveLineSet.LineType.LINETYPE_INVALID;
        this.emptyLineID.push(id);
      }
    }

    /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
    SubmitChanges() {
      this.currentSubmittedLineCount = this.lines.reduce((count, line) => line.type === _Tr2CurveLineSet.LineType.LINETYPE_INVALID ? count : count + line.numOfSegments, 0);
      return true;
    }

    /**
     * Appends one tessellated segment's vertices to the line buffer.
     */
    #addLineData(line) {
      if (this.emptyLineID.length === 0) {
        this.lines.push(line);
        return this.lines.length - 1;
      }
      const id = this.emptyLineID.pop();
      this.lines[id] = line;
      return id;
    }

    /**
     * Builds a line record from its endpoints, colours and width.
     */
    #createLine(type, position1, color1, position2, color2, intermediatePosition, width, numOfSegments) {
      return {
        type,
        position1: vec3.clone(position1),
        color1: vec4.clone(color1),
        position2: vec3.clone(position2),
        color2: vec4.clone(color2),
        intermediatePosition: vec3.clone(intermediatePosition),
        width,
        multiColor: vec4.create(),
        multiColorBorder: -1,
        overlayColor: vec4.create(),
        animationSpeed: 0,
        animationScale: 1,
        numOfSegments
      };
    }

    /**
     * Whether a line identifier still refers to a live line.
     */
    #isValidLineID(id) {
      return Number.isInteger(id) && id >= 0 && id < this.lines.length && this.lines[id].type !== _Tr2CurveLineSet.LineType.LINETYPE_INVALID;
    }
  }];
  LineType = Object.freeze({
    LINETYPE_INVALID: 0,
    LINETYPE_STRAIGHT: 1,
    LINETYPE_SPHERED: 2,
    LINETYPE_CURVED: 3,
    LINETYPE_PARTICLE: 4
  });
  constructor() {
    super(_Tr2CurveLineSet), _initClass();
  }
}();

export { _Tr2CurveLineSet as Tr2CurveLineSet };
//# sourceMappingURL=Tr2CurveLineSet.js.map
