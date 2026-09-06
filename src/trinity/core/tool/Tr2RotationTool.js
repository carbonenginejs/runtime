// Source: trinity/trinity/Tr2RotationTool.h
// Source: trinity/trinity/Tr2RotationTool.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { Tr2ManipulationTool } from "./Tr2ManipulationTool.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

const AXIS_COLORS = Object.freeze({
  x: vec4.fromValues(1, 0.01, 0.01, 1),
  y: vec4.fromValues(0.01, 1, 0.01, 1),
  z: vec4.fromValues(0.01, 0.01, 1, 1),
  w: vec4.fromValues(0, 1, 1, 1),
  ww: vec4.fromValues(0.5, 0.5, 0.5, 1)
});

/** Extends the manipulation tool with quaternion rotation state and angular precision. */
@type.define({ className: "Tr2RotationTool", family: "trinityCore", purpose: "Extends the manipulation tool with quaternion rotation state and angular precision." })
export class Tr2RotationTool extends Tr2ManipulationTool
{

  /** m_precision (float) [READWRITE] */
  @io.readwrite
  @type.float32
  precision = 1;

  /** m_rotation (Quaternion) [READ] */
  @io.read
  @type.quat
  rotation = quat.create();

  /** m_wwLine (Tr2LineSetPtr, Tr2RotationTool.h:33): the screen-space ring
   *  primitive whose scale is the arcball radius. Carbon builds it in
   *  GenLineSets, which is not ported; a host supplies it (or any
   *  { scale } duck) before Hemisphere is useful. */
  @io.readwrite
  @type.objectRef("Tr2LineSet")
  wwLine = null;

  /**
   * Carbon GetDesiredPlaneNormal (Tr2RotationTool.cpp:131-165), the rotation
   * tool's override: the best drag plane for the selected gizmo axis. The
   * view direction is the view matrix's third column (_13/_23/_33 -> gl
   * [2],[6],[10]); the screen-space handles ("w"/"ww") use it directly, an
   * axis handle uses that axis flipped toward the camera when
   * Dot(view, axis) > 0. Always normalised.
   *
   * @param {Float32Array} _ray Unused by this override, as in Carbon.
   * @param {Float32Array} viewMatrix
   * @param {Float32Array} [out] Caller-owned; allocated when omitted.
   * @returns {Float32Array} The plane normal.
   */
  @carbon.method
  @impl.implemented
  GetDesiredPlaneNormal(_ray, viewMatrix, out = vec3.create())
  {
    vec3.set(Tr2RotationTool.#view, viewMatrix[2], viewMatrix[6], viewMatrix[10]);

    if (this.selectedAxis === "w" || this.selectedAxis === "ww")
    {
      return vec3.normalize(out, vec3.copy(out, Tr2RotationTool.#view));
    }

    const [ xAxis, yAxis, zAxis ] = this.GetBaseVectors(
      Tr2RotationTool.#xAxis, Tr2RotationTool.#yAxis, Tr2RotationTool.#zAxis);
    const axis = this.selectedAxis === "x" ? xAxis : this.selectedAxis === "y" ? yAxis : zAxis;

    vec3.copy(out, axis);
    if (vec3.dot(Tr2RotationTool.#view, out) > 0)
    {
      vec3.negate(out, out);
    }
    return vec3.normalize(out, out);
  }

  /**
   * Carbon GetUnTransformedBaseVectors (Tr2RotationTool.cpp:211-216): the
   * identity axes, the untransformed counterpart to GetBaseVectors.
   */
  @carbon.method
  @impl.implemented
  GetUnTransformedBaseVectors(outX = vec3.create(), outY = vec3.create(), outZ = vec3.create())
  {
    vec3.set(outX, 1, 0, 0);
    vec3.set(outY, 0, 1, 0);
    vec3.set(outZ, 0, 0, 1);
    return [ outX, outY, outZ ];
  }

  /**
   * Carbon Hemisphere (Tr2RotationTool.cpp:396-439): maps a mouse position
   * onto the arcball. Projects the gizmo centre and a point one ring-radius
   * along the camera-right axis to derive the ring's pixel radius (plus 16px
   * for the cursor), normalises the mouse offset by it (y screen-inverted),
   * and lifts z as `1 - d` for d <= 1 - a CONE, not a hemisphere, despite
   * the name; transcribed as Carbon computes it. Returns the normalised
   * vector, in view space.
   *
   * Compositions follow the row-vector rule: Carbon's `view * projection`
   * is `mat4.multiply(out, projection, view)` here, and `v * M` is
   * `transformMat4(v, M)` over the shared byte layout.
   *
   * @param {number} mouseX
   * @param {number} mouseY
   * @param {{x:number,y:number,width:number,height:number}} viewport Tr2Viewport's m_x/m_y/m_width/m_height.
   * @param {Float32Array} viewMatrix
   * @param {Float32Array} projectionMatrix
   * @param {Float32Array} [out] Caller-owned; allocated when omitted.
   * @returns {Float32Array} The arcball vector.
   */
  @carbon.method
  @impl.implemented
  Hemisphere(mouseX, mouseY, viewport, viewMatrix, projectionMatrix, out = vec3.create())
  {
    const viewProj = mat4.multiply(Tr2RotationTool.#viewProj, projectionMatrix, viewMatrix);

    const project = (point, screen) =>
    {
      const projected = vec4.transformMat4(
        Tr2RotationTool.#projected,
        vec4.set(Tr2RotationTool.#projected, point[0], point[1], point[2], 1),
        viewProj);
      screen[0] = viewport.x + viewport.width * (0.5 + 0.5 * projected[0] / projected[3]);
      screen[1] = viewport.y + viewport.height * (0.5 - 0.5 * projected[1] / projected[3]);
      return screen;
    };

    // The ring radius comes from the ww line primitive's scale (cpp:412).
    const radius = this.wwLine.scale;
    const world = this.worldTransform;
    const center = vec3.set(Tr2RotationTool.#center, world[12], world[13], world[14]);
    // viewMatrix._11/_21/_31 is the view matrix's first column: camera right.
    const side = vec3.set(Tr2RotationTool.#side,
      center[0] - viewMatrix[0] * radius,
      center[1] - viewMatrix[4] * radius,
      center[2] - viewMatrix[8] * radius);

    const screenCenter = project(center, Tr2RotationTool.#screenCenter);
    const screenSide = project(side, Tr2RotationTool.#screenSide);
    const dx = screenCenter[0] - screenSide[0];
    const dy = screenCenter[1] - screenSide[1];
    // "add the width of the cursor" (cpp:424).
    const radiusPixels = Math.sqrt(dx * dx + dy * dy) + 16;

    const px = (mouseX - screenCenter[0]) / radiusPixels;
    const py = (screenCenter[1] - mouseY) / radiusPixels;
    const d = Math.sqrt(px * px + py * py);
    const z = d <= 1 ? 1 - d : 0;

    return vec3.normalize(out, vec3.set(out, px, py, z));
  }

  /** Returns all authored rotation primitives in their stored order. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript returns a fresh array instead of Carbon's reused private visible-object vector.")
  GetPrimitivesToRender()
  {
    return Array.from(this.primitives);
  }

  /** Restores Carbon's authored axis and ring colours. */
  @carbon.method
  @impl.implemented
  ResetPrimitiveColors()
  {
    for (const primitive of this.primitives)
    {
      const color = AXIS_COLORS[primitive.name];
      if (color)
      {
        primitive.SetCurrentColor(color);
      }
    }
  }

  static #view = vec3.create();
  static #xAxis = vec3.create();
  static #yAxis = vec3.create();
  static #zAxis = vec3.create();
  static #viewProj = mat4.create();
  static #projected = vec4.create();
  static #center = vec3.create();
  static #side = vec3.create();
  static #screenCenter = new Float32Array(2);
  static #screenSide = new Float32Array(2);

}
