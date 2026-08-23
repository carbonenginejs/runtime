import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PrimitiveSet as _Tr2PrimitiveSet } from './Tr2PrimitiveSet.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_triangles, _init_extra_triangles, _init_maxCurrentTriangleCount, _init_extra_maxCurrentTriangleCount, _init_currentSubmittedTriangleCount, _init_extra_currentSubmittedTriangleCount;

/** A set of coloured triangles with a running centre of mass, submitted as one buffer. */
let _Tr2SolidSet;
class Tr2SolidSet extends _Tr2PrimitiveSet {
  static {
    ({
      e: [_init_triangles, _init_extra_triangles, _init_maxCurrentTriangleCount, _init_extra_maxCurrentTriangleCount, _init_currentSubmittedTriangleCount, _init_extra_currentSubmittedTriangleCount, _initProto],
      c: [_Tr2SolidSet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SolidSet",
      family: "trinityCore"
    })], [[type.list("TriangleData"), 0, "triangles"], [[type, type.uint32], 16, "maxCurrentTriangleCount"], [[type, type.uint32], 16, "currentSubmittedTriangleCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddTriangle"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearTriangles"], [[carbon, carbon.method, impl, impl.adapted], 18, "SubmitChanges"], [[impl, impl.adapted], 18, "SetCurrentColor"], [[impl, impl.adapted], 18, "Initialize"], [[impl, impl.implemented], 18, "GetCenterOfMass"]], 0, void 0, _Tr2PrimitiveSet));
  }
  constructor(...args) {
    super(...args);
    _init_extra_currentSubmittedTriangleCount(this);
  }
  /** m_triangles (std::vector<TriangleData>) */
  triangles = (_initProto(this), _init_triangles(this, []));

  /** m_maxCurrentTriangleCount (unsigned int) */
  maxCurrentTriangleCount = (_init_extra_triangles(this), _init_maxCurrentTriangleCount(this, 0));

  /** m_currentSubmittedTriangleCount (unsigned int) */
  currentSubmittedTriangleCount = (_init_extra_maxCurrentTriangleCount(this), _init_currentSubmittedTriangleCount(this, 0));

  /** Carbon method AddTriangle (MAP_METHOD_AND_WRAP). */
  AddTriangle(position1, color1, position2, color2, position3, color3) {
    const dir13 = vec3.subtract(vec3.create(), position1, position3);
    const dir21 = vec3.subtract(vec3.create(), position2, position1);
    const normal = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), dir13, dir21));
    this.triangles.push({
      position1: vec3.clone(position1),
      color1: vec4.clone(color1),
      position2: vec3.clone(position2),
      color2: vec4.clone(color2),
      position3: vec3.clone(position3),
      color3: vec4.clone(color3),
      normal
    });
  }

  /** Carbon method ClearTriangles (MAP_METHOD_AND_WRAP). */
  ClearTriangles() {
    this.triangles.length = 0;
  }

  /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
  SubmitChanges() {
    this.maxCurrentTriangleCount = Math.max(this.maxCurrentTriangleCount, this.triangles.length);
    this.currentSubmittedTriangleCount = this.triangles.length;
    return true;
  }

  /**
   * Sets the colour subsequently added triangles take by default.
   */
  SetCurrentColor(color) {
    for (const triangle of this.triangles) {
      vec4.copy(triangle.color1, color);
      vec4.copy(triangle.color2, color);
      vec4.copy(triangle.color3, color);
    }
    this.SubmitChanges();
  }

  /**
   * Resets the triangle list and its accumulated centre of mass.
   */
  Initialize() {
    return this.SubmitChanges();
  }

  /**
   * The average position of every triangle vertex added so far.
   */
  GetCenterOfMass(out = vec3.create()) {
    vec3.set(out, 0, 0, 0);
    if (!this.triangles.length) return out;
    for (const triangle of this.triangles) {
      vec3.add(out, out, triangle.position1);
      vec3.add(out, out, triangle.position2);
      vec3.add(out, out, triangle.position3);
    }
    return vec3.scale(out, out, 1 / (this.triangles.length * 3));
  }
  static {
    _initClass();
  }
}

export { _Tr2SolidSet as Tr2SolidSet };
//# sourceMappingURL=Tr2SolidSet.js.map
