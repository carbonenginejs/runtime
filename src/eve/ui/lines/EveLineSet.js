// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/UI/EveLineSet.h
// Source: trinity/trinity/Eve/UI/EveLineSet.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
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

  /** Carbon EveLineSet::GetSortValue reads renderer view state and the live world transform (cpp:203-208). */
  @carbon.method
  @impl.notImplemented
  GetSortValue()
  {
    throw new Error("EveLineSet.GetSortValue is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveLineSet::GetPerObjectData populates standard device constant buffers (cpp:210-231). */
  @carbon.method
  @impl.notImplemented
  GetPerObjectData(_accumulator)
  {
    throw new Error("EveLineSet.GetPerObjectData is not implemented in CarbonEngineJS.");
  }

}
