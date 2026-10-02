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
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2PerObjectDataStandard } from "../../../core/rawData/perObjectData/Tr2PerObjectDataStandard.js";

/** Stores editable tactical line records before renderer submission. */
@meta.define({ className: "EveLineSet", family: "eve/ui" })
@meta.blue.inherit(ITr2Renderable, IEveSpaceObject2, IEveTransform)
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveLineSet
{

  /** Carbon's pending CPU line records. */
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

  /** Carbon EveLineSet::UpdateSyncronous (cpp:97-114): sample the position and
   * rotation curves, then m_worldTransform = TransformationMatrix(scaling,
   * rotation, translation). Carbon (s, r, t) is gl
   * fromRotationTranslationScale (r, t, s) - equivalent matrix, different
   * argument order (math skill rule table). */
  @meta.blue.method
  @meta.implemented
  UpdateSyncronous(updateContext)
  {
    const rotation = vec4.fromValues(0, 0, 0, 1);
    const translation = vec3.create();
    const time = updateContext?.GetTime?.() ?? updateContext?.currentTime ?? 0;

    this.translationCurve?.Update(time, translation);
    this.rotationCurve?.Update(time, rotation);

    mat4.fromRotationTranslationScale(this.worldTransform, rotation, translation, this.scaling);
  }

  /** Carbon EveLineSet::Update forwards to UpdateSyncronous (cpp:120-123). */
  @meta.blue.method
  @meta.implemented
  Update(updateContext)
  {
    this.UpdateSyncronous(updateContext);
  }

  /** Carbon method AddLine (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Stores Carbon's pending line data as renderer-neutral JavaScript records; buffer realization is not ported yet.")
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

  /** Carbon method ChangeLineColor (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")
  ChangeLineColor(id, color1, color2)
  {
    const line = this.lines[id];
    if (!line) return false;
    vec4.copy(line.color1, color1);
    vec4.copy(line.color2, color2);
    return true;
  }

  /** Carbon method ChangeLine (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")
  ChangeLine(id, position1, color1, position2, color2)
  {
    const line = this.lines[id];
    if (!line) return false;
    vec3.copy(line.position1, position1);
    vec4.copy(line.color1, color1);
    vec3.copy(line.position2, position2);
    vec4.copy(line.color2, color2);
    return true;
  }

  /** Carbon method ChangeLinePosition (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")
  ChangeLinePosition(id, position1, position2)
  {
    const line = this.lines[id];
    if (!line) return false;
    vec3.copy(line.position1, position1);
    vec3.copy(line.position2, position2);
    return true;
  }

  /**
   * Carbon Initialize (EveLineSet.cpp:35-42): seed the line capacity at 100
   * and bring resources up. JS arrays need no reserve, so the seed IS the
   * capacity watermark; the PrepareResources hop is the AL half and stays
   * with the device lane (OnPrepareResources is classified there).
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon reserves vector capacity and calls PrepareResources; JS arrays need no reserve and the device half belongs to the AL lane.")
  Initialize()
  {
    this.maxCurrentLineCount = Math.max(this.maxCurrentLineCount, 100);
    return true;
  }

  /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  ClearLines()
  {
    this.lines.length = 0;
  }

  /** Carbon method RemoveLine (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Returns a Boolean for JavaScript callers while preserving Carbon's indexed CPU-line removal.")
  RemoveLine(id)
  {
    if (!this.lines[id]) return false;
    this.lines.splice(id, 1);
    return true;
  }

  /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Records submitted counts without creating Carbon's GPU vertex buffer; realization is not ported yet.")
  SubmitChanges()
  {
    this.maxCurrentLineCount = Math.max(this.maxCurrentLineCount, this.lines.length);
    this.currentSubmittedLineCount = this.lines.length;
    return true;
  }

  /** Carbon EveLineSet::HasTransparentBatches is always true (cpp:161-164). */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Carbon EveLineSet::GetBatches submits its GPU-backed line vertex buffer (cpp:166-201). */
  @meta.blue.method
  @meta.notImplemented
  GetBatches(_accumulator, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveLineSet.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveLineSet::GetSortValue (cpp:203-208): distance from the view
   * position to the world translation. Carbon reads the Tr2Renderer static;
   * the collector threads the render context instead. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon reads the Tr2Renderer view-position static; the batch collector supplies the render context explicitly.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition();

    if (!viewPosition)
    {
      return 0;
    }

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

}
