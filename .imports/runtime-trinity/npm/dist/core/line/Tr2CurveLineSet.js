import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { TR2_PICK_TYPE_DEFAULT, Tr2PickType } from '../view/Tr2PickType.js';

let _initProto, _initClass, _init_lines, _init_extra_lines, _init_emptyLineID, _init_extra_emptyLineID, _init_currentSubmittedLineCount, _init_extra_currentSubmittedLineCount, _init_additive, _init_extra_additive, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_lineWidthFactor, _init_extra_lineWidthFactor, _init_depthOffset, _init_extra_depthOffset, _init_lineEffect, _init_extra_lineEffect, _init_pickEffect, _init_extra_pickEffect;
const ARC_AXIS = vec3.create();
const ARC_CURRENT = vec3.create();
const ARC_NEXT = vec3.create();
const CURVE_CURRENT = vec3.create();
const CURVE_NEXT = vec3.create();
function includePoint(sphere, point) {
  const dx = point[0] - sphere[0];
  const dy = point[1] - sphere[1];
  const dz = point[2] - sphere[2];
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  if (distanceSquared <= sphere[3] * sphere[3] + 1e-4) {
    return;
  }
  const distance = Math.sqrt(distanceSquared);
  const factor = 0.5 * (1 - sphere[3] / distance);
  sphere[0] += factor * dx;
  sphere[1] += factor * dy;
  sphere[2] += factor * dz;
  sphere[3] = 0.5 * (sphere[3] + distance);
}
function hermite(out, start, tangentStart, end, tangentEnd, time) {
  const t2 = time * time;
  const t3 = t2 * time;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + time;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  out[0] = h00 * start[0] + h10 * tangentStart[0] + h01 * end[0] + h11 * tangentEnd[0];
  out[1] = h00 * start[1] + h10 * tangentStart[1] + h01 * end[1] + h11 * tangentEnd[1];
  out[2] = h00 * start[2] + h10 * tangentStart[2] + h01 * end[2] + h11 * tangentEnd[2];
  return out;
}
function rotateAroundAxis(out, value, axis, angle) {
  const axisLength = Math.hypot(axis[0], axis[1], axis[2]);
  const x = axis[0] / axisLength;
  const y = axis[1] / axisLength;
  const z = axis[2] / axisLength;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const dot = x * value[0] + y * value[1] + z * value[2];
  out[0] = value[0] * cosine + (y * value[2] - z * value[1]) * sine + x * dot * (1 - cosine);
  out[1] = value[1] * cosine + (z * value[0] - x * value[2]) * sine + y * dot * (1 - cosine);
  out[2] = value[2] * cosine + (x * value[1] - y * value[0]) * sine + z * dot * (1 - cosine);
  return out;
}
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
      })], [[type.list("LineData"), 0, "lines"], [type.array("uint32"), 0, "emptyLineID"], [[type, type.uint32], 16, "currentSubmittedLineCount"], [[io, io.persist, type, type.boolean], 16, "additive"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.float32], 16, "lineWidthFactor"], [[io, io.persist, type, type.float32], 16, "depthOffset"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Material")], 16, "lineEffect"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Material")], 16, "pickEffect"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddCurvedLineCrt"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddCurvedLineSph"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddSpheredLineCrt"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddSpheredLineSph"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddStraightLine"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineIntermediateSph"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineIntermediateCrt"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLinePositionSph"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLinePositionCrt"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineAnimation"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineMultiColor"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineSegmentation"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineColor"], [[carbon, carbon.method, impl, impl.adapted], 18, "ChangeLineWidth"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearLines"], [[carbon, carbon.method, impl, impl.adapted], 18, "RemoveLine"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Rebuilds Carbon's segment counts and logical bounds from CPU LineData; renderer runtimes realize the vertex stream.")], 18, "SubmitChanges"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.adapted, void 0, impl.reason("Carbon reads the renderer-global view position; the collector supplies its active render context explicitly.")], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetID"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPickingBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetAdditiveFlag"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDynamicFlag"]], 0, void 0, CjsModel));
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

    /** Logical local-to-world transform used by renderable consumers. */
    worldTransform = (_init_extra_currentSubmittedLineCount(this), mat4.create());

    /** Carbon's incrementally grown local-space line bound. */
    boundingSphere = vec4.create();

    /** Whether the last submission changed the local bounds. */
    boundsDirty = false;

    /** CPU update policy; engines decide how to realize the line stream. */
    dynamic = false;

    /** m_additive (bool) [READWRITE, PERSIST] */
    additive = _init_additive(this, false);

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
      this.currentSubmittedLineCount = 0;
      vec4.set(this.boundingSphere, 0, 0, 0, 0);
      this.boundsDirty = true;
      for (const line of this.lines) {
        if (line.type === _Tr2CurveLineSet.LineType.LINETYPE_INVALID) {
          continue;
        }
        const segments = Math.max(0, Math.trunc(line.numOfSegments));
        if (line.type === _Tr2CurveLineSet.LineType.LINETYPE_STRAIGHT || line.type === _Tr2CurveLineSet.LineType.LINETYPE_PARTICLE) {
          includePoint(this.boundingSphere, line.position1);
          includePoint(this.boundingSphere, line.position2);
        } else if (line.type === _Tr2CurveLineSet.LineType.LINETYPE_CURVED && segments > 0) {
          const tangentStart = ARC_CURRENT;
          const tangentEnd = ARC_NEXT;
          vec3.subtract(tangentStart, line.intermediatePosition, line.position1);
          vec3.subtract(tangentEnd, line.position2, line.intermediatePosition);
          vec3.copy(CURVE_CURRENT, line.position1);
          for (let segment = 0; segment < segments; segment++) {
            hermite(CURVE_NEXT, line.position1, tangentStart, line.position2, tangentEnd, (segment + 1) / segments);
            includePoint(this.boundingSphere, CURVE_CURRENT);
            includePoint(this.boundingSphere, CURVE_NEXT);
            vec3.copy(CURVE_CURRENT, CURVE_NEXT);
          }
        } else if (line.type === _Tr2CurveLineSet.LineType.LINETYPE_SPHERED && segments > 0) {
          vec3.subtract(ARC_CURRENT, line.position1, line.intermediatePosition);
          vec3.subtract(ARC_NEXT, line.position2, line.intermediatePosition);
          vec3.cross(ARC_AXIS, ARC_CURRENT, ARC_NEXT);
          const denominator = vec3.length(ARC_CURRENT) * vec3.length(ARC_NEXT);
          const angle = Math.acos(vec3.dot(ARC_CURRENT, ARC_NEXT) / denominator) / segments;
          for (let segment = 0; segment < segments; segment++) {
            rotateAroundAxis(ARC_NEXT, ARC_CURRENT, ARC_AXIS, angle);
            CURVE_CURRENT[0] = ARC_CURRENT[0] + line.intermediatePosition[0];
            CURVE_CURRENT[1] = ARC_CURRENT[1] + line.intermediatePosition[1];
            CURVE_CURRENT[2] = ARC_CURRENT[2] + line.intermediatePosition[2];
            CURVE_NEXT[0] = ARC_NEXT[0] + line.intermediatePosition[0];
            CURVE_NEXT[1] = ARC_NEXT[1] + line.intermediatePosition[1];
            CURVE_NEXT[2] = ARC_NEXT[2] + line.intermediatePosition[2];
            includePoint(this.boundingSphere, CURVE_CURRENT);
            includePoint(this.boundingSphere, CURVE_NEXT);
            vec3.copy(ARC_CURRENT, ARC_NEXT);
          }
        }
        this.currentSubmittedLineCount += segments;
      }
      return true;
    }

    /** Carbon's line sets participate in transparent sorting. */
    HasTransparentBatches() {
      return true;
    }

    /** Physical vertex-stream realization remains an engine obligation. */
    GetBatches(_accumulator, _batchType, _perObjectData, _reason) {
      throw new Error("Tr2CurveLineSet.GetBatches requires an engine line-stream realization.");
    }

    /** Distance from the transformed local bound to the active view. */
    GetSortValue(context) {
      const viewPosition = context.GetViewPosition();
      CURVE_CURRENT[0] = this.boundingSphere[0];
      CURVE_CURRENT[1] = this.boundingSphere[1];
      CURVE_CURRENT[2] = this.boundingSphere[2];
      vec3.transformMat4(CURVE_CURRENT, CURVE_CURRENT, this.worldTransform);
      const dx = viewPosition[0] - CURVE_CURRENT[0];
      const dy = viewPosition[1] - CURVE_CURRENT[1];
      const dz = viewPosition[2] - CURVE_CURRENT[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz) + this.depthOffset;
    }

    /** Carbon's base intentionally supplies no scene-specific constants. */
    GetPerObjectData(_accumulator) {
      return null;
    }

    /** Carbon ITr2Pickable identity for every line primitive. */
    GetID(_areaId) {
      return this;
    }

    /** Dispatches the selected pick categories through the same batch contract. */
    GetPickingBatches(batches, pickTypes = TR2_PICK_TYPE_DEFAULT, perObjectData = null) {
      if (pickTypes & Tr2PickType.PICK_TYPE_PICKING) {
        this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
      }
      if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE) {
        this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
      }
      if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT) {
        this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_TRANSPARENT, perObjectData);
        this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_ADDITIVE, perObjectData);
      }
    }

    /** Sets Carbon's additive-pass selector. */
    SetAdditiveFlag(value) {
      this.additive = !!value;
    }

    /** Sets Carbon's dynamic CPU-update policy. */
    SetDynamicFlag(value) {
      this.dynamic = !!value;
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
