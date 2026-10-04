import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/UI/EveLineSet.h
// Source: trinity/trinity/Eve/UI/EveLineSet.cpp
// Hand-maintained after promotion from generated schema intake.
import { meta } from "#schema";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { IEveTransform } from "../../IEveTransform.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { TriBatchType } from "#consts/graphics";
import { Topology, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed } from "../../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2PerObjectDataStandard } from "../../../core/rawData/perObjectData/Tr2PerObjectDataStandard.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { TriDevice } from "../../../core/device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/Tr2RenderBatch.js";


/** EveLineData (EveLineSet.h:22-28): position1, color1, position2, color2, two 28-byte vertices. */
const EVE_LINE_DATA_FLOATS = 14;
const EVE_LINE_DATA_SIZE = EVE_LINE_DATA_FLOATS * 4;


/**
 * Carbon's EveLineSet: tactical-overlay lines kept as CPU records and drawn from a vertex buffer that SubmitChanges
 * uploads. Each line is two vertices of a position and a colour, drawn as a line list, additive unless
 * renderTransparent.
 */
@meta.define({ className: "EveLineSet", family: "eve/ui" })
@meta.blue.inherit(ITr2Renderable, IEveSpaceObject2, IEveTransform)
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveLineSet
{

  /** Carbon's pending CPU line records (m_lines). */
  @meta.type.list("EveLineData")
  lines = [];

  @meta.type.uint32
  maxCurrentLineCount = 0;

  @meta.type.uint32
  currentSubmittedLineCount = 0;

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  effect = null;

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_isRenderedAsTransparent (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  renderTransparent = false;

  /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriVectorFunction")
  translationCurve = null;

  /** m_worldTransform (EveLineSet.h:119) - runtime state stamped by
   * UpdateSyncronous from the curves and scaling; not persisted. */
  worldTransform = mat4.create();

  /** m_boundingSphere: rebuilt by SubmitChanges from the line end points. */
  boundingSphere = vec4.create();

  /** m_vertexDeclHandle */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_vertexBuffer */
  _vertexBuffer = new Tr2BufferAL();

  /** The EveLineData bytes an upload copies from, grown with the line count. */
  _staging = new Float32Array(0);

  /** Registers the device-resource lifetime, as Carbon's Tr2DeviceResource base does. */
  constructor()
  {
    TriDevice.RegisterResource(this);
  }

  /**
   * Carbon Initialize (cpp:35-42): seeds the line capacity at 100 and prepares the resources. Carbon also reserves
   * the line vector; a JavaScript array needs no reserve.
   */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.maxCurrentLineCount = 100;
    this.PrepareResources();
    return true;
  }

  /** Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-32): only while resource creation is allowed. */
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Carbon ReleaseResources (cpp:45-50). Adapted: the buffer is destroyed explicitly. */
  @meta.adapted
  ReleaseResources(_storage)
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
  }

  /** Releases final ownership because JavaScript has no deterministic destructor. */
  @meta.ours
  Destroy()
  {
    this.ReleaseResources();
    TriDevice.UnregisterResource(this);
  }

  /**
   * Carbon OnPrepareResources (cpp:52-96): interns the position and colour declaration, creates a vertex buffer of
   * maxCurrentLineCount lines on first need, and uploads the current lines.
   *
   * Adapted: the AL description replaces the native stride/count overload.
   */
  @meta.adapted
  OnPrepareResources()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(EveLineSet._VertexDefinition());
      if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;
    }

    if (!this._vertexBuffer.IsValid())
    {
      if (Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(EVE_LINE_DATA_SIZE, this.maxCurrentLineCount,
        Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN), null, renderContext))) return false;
    }

    if (!this._Upload(renderContext)) return false;
    this.currentSubmittedLineCount = this.lines.length;
    return true;
  }

  /**
   * Carbon UpdateSyncronous (cpp:97-114): samples the position and rotation curves, then m_worldTransform =
   * TransformationMatrix( scaling, rotation, translation ), which is gl's fromRotationTranslationScale( r, t, s ).
   */
  @meta.blue.method
  @meta.implemented
  UpdateSyncronous(updateContext)
  {
    const { vec3_0, quat_0 } = EveLineSet.scratch;
    vec3.zero(vec3_0);
    quat.identity(quat_0);
    const time = updateContext.GetTime();

    if (this.translationCurve) this.translationCurve.Update_Ticks(time, vec3_0);
    if (this.rotationCurve) this.rotationCurve.Update_Ticks(time, quat_0);

    mat4.fromRotationTranslationScale(this.worldTransform, quat_0, vec3_0, this.scaling);
  }

  /** Carbon UpdateAsyncronous (cpp:117-119): nothing to do. */
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Carbon EveLineSet::Update forwards to UpdateSyncronous (cpp:120-123). */
  @meta.blue.method
  @meta.implemented
  Update(updateContext)
  {
    this.UpdateSyncronous(updateContext);
  }

  /** Carbon UpdateViewDependentData (cpp:130-132): nothing to do. */
  @meta.blue.method
  @meta.implemented
  UpdateViewDependentData(_frustum, _parentTransform)
  {
  }

  /** Carbon UpdateVisibility (cpp:134-136): nothing to do; a line set is never culled. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(_updateContext, _parentTransform)
  {
  }

  /** Carbon's GetRenderables( renderables, impostors ) (cpp:138-146): the set itself while displayed. */
  @meta.blue.renamed("GetRenderables")
  @meta.implemented
  GetRenderables_Impostors(out = [], _impostors = null)
  {
    if (!this.display) return out;
    out.push(this);
    return out;
  }

  /** Carbon's GetRenderables( renderables ) (cpp:148-151): forwards with no impostor manager. */
  @meta.blue.method
  @meta.implemented
  GetRenderables(out = [])
  {
    return this.GetRenderables_Impostors(out, null);
  }

  /** Carbon GetBoundingSphere (cpp:153-157): the sphere SubmitChanges last built; always valid. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    vec4.copy(out, this.boundingSphere);
    return true;
  }

  /** Carbon AddLine (cpp:233-244): appends a line without submitting it, and returns its index. */
  @meta.blue.method
  @meta.implemented
  AddLine(position1, color1, position2, color2)
  {
    this.lines.push({
      position1: vec3.clone(position1),
      color1: vec4.clone(color1),
      position2: vec3.clone(position2),
      color2: vec4.clone(color2)
    });
    return this.lines.length - 1;
  }

  /** Carbon ChangeLineColor (cpp:305-313): an out-of-range id is ignored. */
  @meta.blue.method
  @meta.implemented
  ChangeLineColor(id, color1, color2)
  {
    if (id < this.lines.length)
    {
      const line = this.lines[id];
      vec4.copy(line.color1, color1);
      vec4.copy(line.color2, color2);
    }
  }

  /** Carbon ChangeLine (cpp:293-303): an out-of-range id is ignored. */
  @meta.blue.method
  @meta.implemented
  ChangeLine(id, position1, color1, position2, color2)
  {
    if (id < this.lines.length)
    {
      const line = this.lines[id];
      vec3.copy(line.position1, position1);
      vec3.copy(line.position2, position2);
      vec4.copy(line.color1, color1);
      vec4.copy(line.color2, color2);
    }
  }

  /** Carbon ChangeLinePosition (cpp:315-323): an out-of-range id is ignored. */
  @meta.blue.method
  @meta.implemented
  ChangeLinePosition(id, position1, position2)
  {
    if (id < this.lines.length)
    {
      const line = this.lines[id];
      vec3.copy(line.position1, position1);
      vec3.copy(line.position2, position2);
    }
  }

  /** Carbon ClearLines (cpp:325-327): needs SubmitChanges to take effect. */
  @meta.blue.method
  @meta.implemented
  ClearLines()
  {
    this.lines.length = 0;
  }

  /** Carbon RemoveLine (cpp:285-291): an out-of-range id is ignored; later ids shift down. */
  @meta.blue.method
  @meta.implemented
  RemoveLine(id)
  {
    if (id < this.lines.length) this.lines.splice(id, 1);
  }

  /**
   * Carbon SubmitChanges (cpp:246-283): grows the buffer when the lines outgrow it, prepares the resources, uploads
   * the lines, and rebuilds the bounding sphere from their end points.
   *
   * Adapted: Carbon grows to the line vector's capacity, which its allocator chooses; a JavaScript array has none, so
   * the buffer grows to the line count.
   */
  @meta.blue.method
  @meta.adapted
  SubmitChanges()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (this.lines.length > this.maxCurrentLineCount)
    {
      this.maxCurrentLineCount = this.lines.length;
      this.ReleaseResources();
    }

    // Make sure the resources are prepared.
    this.PrepareResources();

    if (!this._vertexBuffer.IsValid()) return false;

    if (!this._Upload(renderContext)) return false;
    this.currentSubmittedLineCount = this.lines.length;

    // Also rebuild the bounding sphere.
    vec4.set(this.boundingSphere, 0, 0, 0, 0);
    for (const line of this.lines)
    {
      sph3.boundingSphereUpdate(this.boundingSphere, line.position1);
      sph3.boundingSphereUpdate(this.boundingSphere, line.position2);
    }
    return true;
  }

  /** Carbon EveLineSet::HasTransparentBatches is always true (cpp:161-164). */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /**
   * Carbon GetBatches (cpp:166-201): transparent when renderTransparent, otherwise additive; while displayed, with a
   * vertex buffer and a declaration, one line-list draw of the submitted lines' vertices.
   */
  @meta.blue.method
  @meta.implemented
  GetBatches(accumulator, batchType, perObjectData, _reason)
  {
    // Only rendered as transparent or additive.
    if (!(batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT && this.renderTransparent)
      && !(batchType === TriBatchType.TRIBATCHTYPE_ADDITIVE && !this.renderTransparent)) return;
    if (!this.display) return;
    if (!this._vertexBuffer.IsValid()) return;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetStreamSource(0, this._vertexBuffer, EVE_LINE_DATA_SIZE / 2);
    batch.SetTopology(Topology.TOP_LINES);
    batch.SetDrawInstanced(this.currentSubmittedLineCount * 2, 1, 0, 0);
    accumulator.Commit(batch);
  }

  /**
   * Carbon GetSortValue (cpp:203-208): the distance from the view position to the world translation.
   *
   * Adapted: Carbon reads Tr2Renderer's view-position static; the batch collector passes the render context, and
   * without one the value is 0.
   */
  @meta.blue.method
  @meta.adapted
  GetSortValue(renderContext = null)
  {
    if (renderContext === null) return 0;
    const viewPosition = renderContext.GetViewPosition();
    const world = this.worldTransform;
    const dx = viewPosition[0] - world[12];
    const dy = viewPosition[1] - world[13];
    const dz = viewPosition[2] - world[14];

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Carbon EveLineSet::GetPerObjectData (cpp:210-231): a Tr2PerObjectDataStandard
   * carrying EvePerObjectVSData and EvePerObjectPSData, each with a transposed
   * WorldMat, bound as two constant buffers.
   *
   * Carbon leases the object from the accumulator and copies a stack struct into
   * each of its buffers; the lease here creates the buffers in those named
   * layouts, so the writes below land where the copy would have put them.
   * SetAndTranspose is Carbon's `Transpose( m_worldTransform )`.
   */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = Tr2PerObjectDataStandard.alloc(accumulator, "EvePerObjectVSData", "EvePerObjectPSData");

    data.vs.SetAndTranspose("WorldMat", this.worldTransform);
    data.ps.SetAndTranspose("WorldMat", this.worldTransform);

    return data;
  }

  /** Carbon's memcpy of m_lines into the mapped buffer (cpp:79-88, 264-270), as packed EveLineData. */
  _Upload(renderContext)
  {
    const count = this.lines.length;
    if (this._staging.length < count * EVE_LINE_DATA_FLOATS)
    {
      this._staging = new Float32Array(count * EVE_LINE_DATA_FLOATS); // alloc: grows with the line count
    }
    const staging = this._staging;
    for (let index = 0; index < count; index++)
    {
      const line = this.lines[index], offset = index * EVE_LINE_DATA_FLOATS;
      staging.set(line.position1, offset);
      staging.set(line.color1, offset + 3);
      staging.set(line.position2, offset + 7);
      staging.set(line.color2, offset + 10);
    }
    const mapping = this._vertexBuffer.MapForWriting(renderContext);
    if (Failed(mapping.result) || !mapping.data) return false;
    if (count) mapping.data.set(new Uint8Array(staging.buffer, 0, count * EVE_LINE_DATA_SIZE)); // alloc: byte view for the upload
    this._vertexBuffer.UnmapForWriting(renderContext);
    return true;
  }

  /** The line vertex: a float3 POSITION and a float4 TEXCOORD colour (cpp:58-60). */
  static _VertexDefinition()
  {
    const definition = new Tr2VertexDefinition();
    definition.Add("FLOAT32_3", "POSITION");
    definition.Add("FLOAT32_4", "TEXCOORD");
    return definition;
  }

  static scratch = {
    vec3_0: vec3.create(),
    quat_0: quat.create()
  };
}
