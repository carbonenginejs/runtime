// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/UI/EveLineSet.h
// Source: trinity/trinity/Eve/UI/EveLineSet.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Stores editable tactical line records before renderer submission. */
@type.define({ className: "EveLineSet", family: "eve/ui" })
export class EveLineSet extends CjsModel
{

  /** Carbon's pending CPU line records. */
  @type.list("EveLineData")
  lines = [];

  @type.uint32
  maxCurrentLineCount = 0;

  @type.uint32
  currentSubmittedLineCount = 0;

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  effect = null;

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_isRenderedAsTransparent (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderTransparent = false;

  /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  /** m_worldTransform (EveLineSet.h:119) - runtime state stamped by
   * UpdateSyncronous from the curves and scaling; not persisted. */
  worldTransform = mat4.create();

  /** Carbon EveLineSet::UpdateSyncronous (cpp:97-114): sample the position and
   * rotation curves, then m_worldTransform = TransformationMatrix(scaling,
   * rotation, translation). Carbon (s, r, t) is gl
   * fromRotationTranslationScale (r, t, s) - equivalent matrix, different
   * argument order (math skill rule table). */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext)
  {
    const rotation = vec4.fromValues(0, 0, 0, 1);
    const translation = vec3.create();
    const time = updateContext?.GetTime?.() ?? updateContext?.currentTime ?? 0;

    this.translationCurve?.Update?.(translation, time);
    this.rotationCurve?.Update?.(rotation, time);

    mat4.fromRotationTranslationScale(this.worldTransform, rotation, translation, this.scaling);
  }

  /** Carbon EveLineSet::Update forwards to UpdateSyncronous (cpp:120-123). */
  @carbon.method
  @impl.implemented
  Update(updateContext)
  {
    this.UpdateSyncronous(updateContext);
  }

  /** Carbon method AddLine (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Stores Carbon's pending line data as renderer-neutral JavaScript records; buffer realization belongs to an engine package.")
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
  @carbon.method
  @impl.adapted
  @impl.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")
  ChangeLineColor(id, color1, color2)
  {
    const line = this.lines[id];
    if (!line) return false;
    vec4.copy(line.color1, color1);
    vec4.copy(line.color2, color2);
    return true;
  }

  /** Carbon method ChangeLine (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")
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
  @carbon.method
  @impl.adapted
  @impl.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")
  ChangeLinePosition(id, position1, position2)
  {
    const line = this.lines[id];
    if (!line) return false;
    vec3.copy(line.position1, position1);
    vec3.copy(line.position2, position2);
    return true;
  }

  /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ClearLines()
  {
    this.lines.length = 0;
  }

  /** Carbon method RemoveLine (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Returns a Boolean for JavaScript callers while preserving Carbon's indexed CPU-line removal.")
  RemoveLine(id)
  {
    if (!this.lines[id]) return false;
    this.lines.splice(id, 1);
    return true;
  }

  /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Records submitted counts without creating Carbon's GPU vertex buffer; realization belongs to an engine package.")
  SubmitChanges()
  {
    this.maxCurrentLineCount = Math.max(this.maxCurrentLineCount, this.lines.length);
    this.currentSubmittedLineCount = this.lines.length;
    return true;
  }

  /** Carbon EveLineSet::HasTransparentBatches is always true (cpp:161-164). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Carbon EveLineSet::GetBatches submits its GPU-backed line vertex buffer (cpp:166-201). */
  @carbon.method
  @impl.notImplemented
  GetBatches(_accumulator, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveLineSet.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveLineSet::GetSortValue (cpp:203-208): distance from the view
   * position to the world translation. Carbon reads the Tr2Renderer static;
   * the collector threads the render context instead. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer view-position static; the batch collector supplies the render context explicitly.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition?.();

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

  /** Carbon EveLineSet::GetPerObjectData (cpp:210-231): a Tr2PerObjectDataStandard
   * carrying EvePerObjectVSData + EvePerObjectPSData, each one transposed
   * WorldMat, uploaded as two constant buffers. Here that is two Allocs
   * returned as a { vs, ps } record; Set(MATRIX) performs Carbon's
   * `Transpose(m_worldTransform)`. */
  @carbon.method
  @impl.implemented
  GetPerObjectData(accumulator)
  {
    const vs = accumulator.Alloc("EvePerObjectVSData");
    const ps = accumulator.Alloc("EvePerObjectPSData");

    vs.Set("WorldMat", this.worldTransform);
    ps.Set("WorldMat", this.worldTransform);

    return { vs, ps };
  }

}
