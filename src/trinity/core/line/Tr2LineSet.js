import { ITr2Renderable } from "../ITr2Renderable.js";
import { ITr2Pickable } from "../ITr2Pickable.js";
// Source: trinity/trinity/Tr2LineSet.h
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { Tr2PrimitiveSet } from "./Tr2PrimitiveSet.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2CpuUsage, Tr2GpuUsage, Topology } from "#consts/render-context";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";


/** A set of coloured lines with an accompanying picking-triangle list, submitted as one buffer. */
@blue.define("Tr2LineSet")
@blue.inherit(IInitialize)
@blue.interface(IInitialize, ITr2Renderable, Tr2PrimitiveSet, ITr2Pickable)
@blue.chainTo(Tr2PrimitiveSet)
export class Tr2LineSet extends Tr2PrimitiveSet
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

  /** m_lines (std::vector<LineData>) */
  @type.array({ kind: "rawStruct", className: "LineData" })
  lines = [];

  /** m_maxCurrentLineCount (unsigned int) */
  @type.uint32
  maxCurrentLineCount = 0;

  /** m_currentSubmittedLineCount (unsigned int) */
  @type.uint32
  currentSubmittedLineCount = 0;

  /** m_pickingVertexDeclHandle (unsigned int) */
  @type.uint32
  pickingVertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_pickingVertexBuffer (Tr2BufferAL) */
  @type.rawStruct("Tr2BufferAL")
  pickingVertexBuffer = new Tr2BufferAL();

  /** m_triangles (std::vector<Triangle>) */
  @type.array({ kind: "rawStruct", className: "Triangle" })
  triangles = [];

  /** m_maxCurrentTriangleCount (unsigned int) */
  @type.uint32
  maxCurrentTriangleCount = 0;

  /** m_currentSubmittedTriangleCount (unsigned int) */
  @type.uint32
  currentSubmittedTriangleCount = 0;

  /** Carbon method AddLine (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
  AddLine(position1, color1, position2, color2)
  {
    this.lines.push({
      position1: vec3.clone(position1),
      color1: vec4.clone(color1),
      position2: vec3.clone(position2),
      color2: vec4.clone(color2)
    });
  }

  /** Carbon method AddPickingTriangle (MAP_METHOD_AND_WRAP). */
  /**
   * Appends a triangle to the picking list that accompanies the lines.
   */
  @blue.method
  @meta.adapted
  AddPickingTriangle(position1, position2, position3)
  {
    this.triangles.push({
      position1: vec3.clone(position1),
      position2: vec3.clone(position2),
      position3: vec3.clone(position3)
    });
  }

  /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  ClearLines()
  {
    this.lines.length = 0;
  }

  /** Carbon method ClearPickingTriangles (MAP_METHOD_AND_WRAP). */
  /**
   * Empties the picking-triangle list, leaving the lines intact.
   */
  @blue.method
  @meta.implemented
  ClearPickingTriangles()
  {
    this.triangles.length = 0;
  }

  /** Native SubmitChanges; JS array length replaces inaccessible vector capacity. */
  @blue.method
  @meta.adapted
  SubmitChanges()
  {
    if (this.lines.length > this.maxCurrentLineCount)
    {
      this.maxCurrentLineCount = this.lines.length;
      // Native quirk: the triangle capacity check is nested in the line check.
      if (this.triangles.length > this.maxCurrentTriangleCount) this.maxCurrentTriangleCount = this.triangles.length;
    }
    this.ReleaseResources();
    this.PrepareResources();
    return true;
  }

  /**
   * Recolors all existing vertices and submits them, as Carbon does.
   */
  @meta.adapted
  @blue.method
  SetCurrentColor(color)
  {
    for (const line of this.lines)
    {
      vec4.copy(line.color1, color);
      vec4.copy(line.color2, color);
    }
    this.SubmitChanges();
  }

  /**
   * Prepares existing geometry after reader population; JS arrays need no reserve.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this.maxCurrentLineCount = this.maxCurrentTriangleCount = 100;
    this.PrepareResources();
    return true;
  }

  /** Carbon Tr2DeviceResource::PrepareResources: defer while creation is disabled. */
  @blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Explicit AL destruction replaces Carbon's empty reference-counted handles. */
  @blue.method
  @meta.adapted
  ReleaseResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
    this.pickingVertexDeclHandle = Tr2EffectStateManager.Unknown;
    this.pickingVertexBuffer.Destroy();
  }

  /** Packs Carbon's native vertex records into mapped AL storage instead of memcpy. */
  @blue.method
  @meta.adapted
  OnPrepareResources()
  {
    if (this._destroyed) return false;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      const declaration = new Tr2VertexDefinition();
      declaration.Add("FLOAT32_3", "POSITION");
      declaration.Add("FLOAT32_4", "TEXCOORD");
      this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(declaration);
      if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;
    }
    if (this.pickingVertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      const declaration = new Tr2VertexDefinition();
      declaration.Add("FLOAT32_3", "POSITION");
      this.pickingVertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(declaration);
      if (this.pickingVertexDeclHandle === Tr2EffectStateManager.Unknown) return false;
    }
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (this.lines.length)
    {
      if (!this._vertexBuffer.IsValid() || this.currentSubmittedLineCount < this.lines.length)
      {
        if (Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.create__Stride(56, this.lines.length,
          Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN), null, context))) return false;
        this.currentSubmittedLineCount = this.lines.length;
      }
      const mapped = this._vertexBuffer.MapForWriting(context);
      if (Failed(mapped.result)) return false;
      const data = new Float32Array(mapped.data.buffer, mapped.data.byteOffset, this.lines.length * 14); // alloc: view of mapped AL storage.
      let offset = 0;
      for (const item of this.lines)
      {
        for (let vertex = 1; vertex <= 2; vertex++)
        {
          data.set(item["position" + vertex], offset);
          data.set(item["color" + vertex], offset + 3);
          offset += 7;
        }
      }
      // Carbon ComputeBoundingSphere: mean of vertices, then maximum distance.
      const bound = this.boundingSphere;
      bound.fill(0);
      for (let offset = 0; offset < data.length; offset += 7)
        for (let axis = 0; axis < 3; axis++) bound[axis] += data[offset + axis];
      for (let axis = 0; axis < 3; axis++) bound[axis] /= this.lines.length * 2;
      for (let offset = 0; offset < data.length; offset += 7)
        bound[3] = Math.max(bound[3], Math.hypot(data[offset] - bound[0], data[offset + 1] - bound[1], data[offset + 2] - bound[2]));
      this._vertexBuffer.UnmapForWriting(context);
    }
    if (this.triangles.length)
    {
      if (!this.pickingVertexBuffer.IsValid() || this.currentSubmittedTriangleCount < this.triangles.length)
      {
        if (Failed(this.pickingVertexBuffer.Create(Tr2BufferDescriptionAL.create__Stride(36, this.triangles.length,
          Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN), null, context))) return false;
        this.currentSubmittedTriangleCount = this.triangles.length;
      }
      const mapped = this.pickingVertexBuffer.MapForWriting(context);
      if (Failed(mapped.result)) return false;
      const data = new Float32Array(mapped.data.buffer, mapped.data.byteOffset, this.triangles.length * 9); // alloc: mapped picking vertex view.
      let offset = 0;
      for (const triangle of this.triangles)
      {
        data.set(triangle.position1, offset);
        data.set(triangle.position2, offset + 3);
        data.set(triangle.position3, offset + 6);
        offset += 9;
      }
      this.pickingVertexBuffer.UnmapForWriting(context);
    }
    return true;
  }

  /** Native Tr2LineSet draw dispatch, including the visible-buffer gate for picking. */
  @blue.method
  @meta.implemented
  GetBatchesImpl(accumulator, perObjectData, effect, reason)
  {
    if (!this._vertexBuffer.IsValid()) return;
    const picking = reason === Tr2PrimitiveSet.GetBatchesReason.Picking && this.currentSubmittedTriangleCount > 0;
    const declaration = picking ? this.pickingVertexDeclHandle : this._vertexDeclHandle;
    if (declaration === Tr2EffectStateManager.Unknown) return;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(declaration);
    if (!picking) batch.SetTopology(Topology.TOP_LINES);
    batch.SetStreamSource(0, picking ? this.pickingVertexBuffer : this._vertexBuffer, picking ? 12 : 28);
    batch.SetDrawInstanced(picking ? this.currentSubmittedTriangleCount * 3 : this.currentSubmittedLineCount * 2, 1, 0, 0);
    accumulator.Commit(batch);
  }

  /**
   * Owner teardown replaces the C++ destructor and automatic device unregistration.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    this._destroyed = true;
    this.ReleaseResources();
    TriDevice.UnregisterResource(this);
  }

}
