// Source: trinity/trinity/Tr2SolidSet.h
import { exposure as be } from "#be";
import { IInitialize } from "../../../blue/exposure/IInitialize.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, type } from "#schema";
import { Tr2PrimitiveSet } from "./Tr2PrimitiveSet.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriangleData } from "./TriangleData.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";
import { Tr2DeviceResource } from "../device/Tr2DeviceResource.js";


/** A set of coloured triangles with a running centre of mass, submitted as one buffer. */
@be.define({
  name: "Tr2SolidSet",
  inherit: [ IInitialize, Tr2DeviceResource ],
  // Tr2SolidSet_Blue.cpp:10-25, in Carbon's order.
  interfaces: [ IInitialize, Tr2PrimitiveSet ],
  members: [
    [ be.METHOD, "AddTriangle", be.WRAP ],
    [ be.METHOD, "ClearTriangles", be.WRAP ],
    [ be.METHOD, "SubmitChanges", be.WRAP ]
  ],
  chainTo: Tr2PrimitiveSet
})
export class Tr2SolidSet extends Tr2PrimitiveSet
{

  @type.uint32
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;
  _vertexBuffer = new Tr2BufferAL();
  _destroyed = false;

  /** m_triangles (std::vector<TriangleData>) */
  @type.object.embed.array("TriangleData")
  triangles = [];

  /** m_maxCurrentTriangleCount (unsigned int) */
  @type.uint32
  maxCurrentTriangleCount = 100;

  /** m_currentSubmittedTriangleCount (unsigned int) */
  @type.uint32
  currentSubmittedTriangleCount = 0;

  /**
   * Carbon method AddTriangle (MAP_METHOD_AND_WRAP; Tr2SolidSet.cpp:158-176): a TriangleData holding the three
   * corners and the face normal.
   *
   * @implemented
   */
  AddTriangle(position1, color1, position2, color2, position3, color3)
  {
    const newTriangle = new TriangleData();
    vec3.copy(newTriangle.position1, position1);
    vec4.copy(newTriangle.color1, color1);
    vec3.copy(newTriangle.position2, position2);
    vec4.copy(newTriangle.color2, color2);
    vec3.copy(newTriangle.position3, position3);
    vec4.copy(newTriangle.color3, color3);
    const dir13 = vec3.subtract(vec3.create(), position1, position3);
    const dir21 = vec3.subtract(vec3.create(), position2, position1);
    vec3.normalize(newTriangle.normal, vec3.cross(newTriangle.normal, dir13, dir21));
    this.triangles.push(newTriangle);
  }

  /**
   * Carbon method ClearTriangles (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  ClearTriangles()
  {
    this.triangles.length = 0;
  }

  /**
   * Native SubmitChanges; JS array length replaces inaccessible vector capacity.
   *
   * Prepares now, as Carbon does, rather than on first use: preparing is what
   * uploads the submitted triangles, records currentSubmittedTriangleCount and
   * rebuilds boundingSphere from their corners, and the next draw's culling
   * and vertex count read those. IsGood then lists and stamps the set as in use, since
   * submitted triangles are about to be drawn; one submitted and never drawn is
   * still released by the sweep (docs internal/decisions/device-resource-registration.md, Revised lifecycle § 2).
   *
   * @adapted
   */
  SubmitChanges()
  {
    if (this.triangles.length > this.maxCurrentTriangleCount)
    {
      this.maxCurrentTriangleCount = this.triangles.length;
      this.ReleaseResources();
    }
    this.PrepareResources();
    this.IsGood();
    return true;
  }

  /**
   * Recolors all existing vertices and submits them, as Carbon does.
   *
   * @adapted
   */
  SetCurrentColor(color)
  {
    for (const triangle of this.triangles)
    {
      vec4.copy(triangle.color1, color);
      vec4.copy(triangle.color2, color);
      vec4.copy(triangle.color3, color);
    }
    this.SubmitChanges();
  }

  /**
   * Prepares existing geometry after reader population; JS arrays need no reserve.
   *
   * Carbon prepares here (Tr2SolidSet::Initialize); here nothing prepares during a build: the
   * first use (IsGood) does, so a build that fails or is never drawn holds no
   * device objects (docs internal/decisions/device-resource-registration.md, Revised lifecycle § 2).
   *
   * @adapted
   */

  Initialize()
  {
    return true;
  }

  /**
   * The native average of triangle vertices transformed into world space.
   *
   * @implemented
   */
  GetCenterOfMass(out)
  {
    vec3.set(out, 0, 0, 0);
    if (!this.triangles.length) return out;
    for (const triangle of this.triangles)
    {
      vec3.add(out, out, triangle.position1);
      vec3.add(out, out, triangle.position2);
      vec3.add(out, out, triangle.position3);
    }
    vec3.scale(out, out, 1 / (this.triangles.length * 3));
    return vec3.transformMat4(out, out, this.worldTransform);
  }

  /**
   * Explicit AL destruction replaces Carbon's empty reference-counted handles.
   *
   * @adapted
   */

  ReleaseResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
  }

  /**
   * Packs Carbon's native vertex records into mapped AL storage instead of memcpy.
   *
   * @adapted
   */

  _OnPrepareResources()
  {
    if (this._destroyed) return false;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      const declaration = new Tr2VertexDefinition();
      declaration.Add("FLOAT32_3", "POSITION");
      declaration.Add("FLOAT32_3", "NORMAL");
      declaration.Add("FLOAT32_4", "TEXCOORD");
      this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(declaration);
      if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;
    }
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (this.triangles.length)
    {
      if (!this._vertexBuffer.IsValid() || this.currentSubmittedTriangleCount < this.triangles.length)
      {
        if (Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.create__Stride(40, this.triangles.length * 3,
          Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN), null, context))) return false;
        this.currentSubmittedTriangleCount = this.triangles.length;
      }
      // Carbon quirk (Tr2SolidSet.cpp:64-77): shrinking retains the previous submitted count.
      const mapped = this._vertexBuffer.MapForWriting(context);
      if (Failed(mapped.result)) return false;
      const data = new Float32Array(mapped.data.buffer, mapped.data.byteOffset, this.triangles.length * 30); // alloc: view of mapped AL storage.
      let offset = 0;
      for (const item of this.triangles)
      {
        for (let vertex = 1; vertex <= 3; vertex++)
        {
          data.set(item["position" + vertex], offset);
          data.set(item.normal, offset + 3);
          data.set(item["color" + vertex], offset + 6);
          offset += 10;
        }
      }
      // Carbon ComputeBoundingSphere: mean of vertices, then maximum distance.
      const bound = this.boundingSphere;
      bound.fill(0);
      for (let offset = 0; offset < data.length; offset += 10)
        for (let axis = 0; axis < 3; axis++) bound[axis] += data[offset + axis];
      for (let axis = 0; axis < 3; axis++) bound[axis] /= this.triangles.length * 3;
      for (let offset = 0; offset < data.length; offset += 10)
        bound[3] = Math.max(bound[3], Math.hypot(data[offset] - bound[0], data[offset + 1] - bound[1], data[offset + 2] - bound[2]));
      this._vertexBuffer.UnmapForWriting(context);
    }
    return true;
  }

  /**
   * Native Tr2SolidSet draw dispatch, including the visible-buffer gate for picking.
   *
   * @implemented
   */

  GetBatchesImpl(accumulator, perObjectData, effect, _reason)
  {
    // Registers with trinity on first use and renews it (Tr2DeviceResource.IsGood). Before the buffer checks: preparing builds them.
    if (!this.IsGood() || !this._vertexBuffer.IsValid()) return;
    const declaration = this._vertexDeclHandle;
    if (declaration === Tr2EffectStateManager.Unknown) return;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(declaration);
    batch.SetStreamSource(0, this._vertexBuffer, 40);
    batch.SetDrawInstanced(this.currentSubmittedTriangleCount * 3, 1, 0, 0);
    accumulator.Commit(batch);
  }

  /**
   * Owner teardown replaces the C++ destructor and automatic device unregistration.
   *
   * Carbon: ~Tr2SolidSet (trinity/trinity/Tr2SolidSet.cpp:20-23).
   * @adapted Retains existing JS teardown; the graph dispatches each base hook.
   * @returns {void}
   */
  _Destructor()
  {
    this._destroyed = true;
    this.ReleaseResources();
  }


  /**
   * The development description (Tr2SolidSet.h:49-52).
   *
   * @adapted a C++ output reference becomes the return value
   * @returns {string} The description.
   */
  GetDescription()
  {
    return "<Tr2SolidSet>";
  }
}

CjsSchema.decorateMethod(Tr2SolidSet, "SetCurrentColor");
CjsSchema.decorateMethod(Tr2SolidSet, "GetCenterOfMass");
