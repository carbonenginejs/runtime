import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Tr2SolidSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { Tr2PrimitiveSet } from "./Tr2PrimitiveSet.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";


/** A set of coloured triangles with a running centre of mass, submitted as one buffer. */
@meta.define({ className: "Tr2SolidSet", family: "trinityCore" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class Tr2SolidSet extends Tr2PrimitiveSet
{

  _vertexDeclHandle = Tr2EffectStateManager.Unknown;
  _vertexBuffer = new Tr2BufferAL();
  _destroyed = false;

  /** Registers the lifetime inherited from Carbon's Tr2DeviceResource base. */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /** m_triangles (std::vector<TriangleData>) */
  @meta.type.list("TriangleData")
  triangles = [];

  /** m_maxCurrentTriangleCount (unsigned int) */
  @meta.type.uint32
  maxCurrentTriangleCount = 100;

  /** m_currentSubmittedTriangleCount (unsigned int) */
  @meta.type.uint32
  currentSubmittedTriangleCount = 0;

  /** Carbon method AddTriangle (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  AddTriangle(position1, color1, position2, color2, position3, color3)
  {
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
  @meta.blue.method
  @meta.implemented
  ClearTriangles()
  {
    this.triangles.length = 0;
  }

  /** Native SubmitChanges; JS array length replaces inaccessible vector capacity. */
  @meta.blue.method
  @meta.adapted
  SubmitChanges()
  {
    if (this.triangles.length > this.maxCurrentTriangleCount)
    {
      this.maxCurrentTriangleCount = this.triangles.length;
      this.ReleaseResources();
    }
    this.PrepareResources();
    return true;
  }

  /**
   * Recolors all existing vertices and submits them, as Carbon does.
   */
  @meta.adapted
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
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    this.PrepareResources();
    return true;
  }

  /**
   * The average position of every triangle vertex added so far.
   */
  @meta.implemented
  GetCenterOfMass(out = vec3.create())
  {
    vec3.set(out, 0, 0, 0);
    if (!this.triangles.length) return out;
    for (const triangle of this.triangles)
    {
      vec3.add(out, out, triangle.position1);
      vec3.add(out, out, triangle.position2);
      vec3.add(out, out, triangle.position3);
    }
    return vec3.scale(out, out, 1 / (this.triangles.length * 3));
  }

  /** Carbon Tr2DeviceResource::PrepareResources: defer while creation is disabled. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Explicit AL destruction replaces Carbon's empty reference-counted handles. */
  @meta.blue.method
  @meta.adapted
  ReleaseResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
  }

  /** Packs Carbon's native vertex records into mapped AL storage instead of memcpy. */
  @meta.blue.method
  @meta.adapted
  OnPrepareResources()
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
        if (Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(40, this.triangles.length * 3,
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

  /** Native Tr2SolidSet draw dispatch, including the visible-buffer gate for picking. */
  @meta.blue.method
  @meta.implemented
  GetBatchesImpl(accumulator, perObjectData, effect, _reason)
  {
    if (!this._vertexBuffer.IsValid()) return;
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

  /** Owner teardown replaces the C++ destructor and automatic device unregistration. */
  @meta.ours
  Destroy()
  {
    this._destroyed = true;
    this.ReleaseResources();
    TriDevice.UnregisterResource(this);
  }

}
