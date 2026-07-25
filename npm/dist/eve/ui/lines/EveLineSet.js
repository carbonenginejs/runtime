import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_lines, _init_extra_lines, _init_maxCurrentLineCount, _init_extra_maxCurrentLineCount, _init_currentSubmittedLineCount, _init_extra_currentSubmittedLineCount, _init_scaling, _init_extra_scaling, _init_name, _init_extra_name, _init_rotationCurve, _init_extra_rotationCurve, _init_effect, _init_extra_effect, _init_display, _init_extra_display, _init_renderTransparent, _init_extra_renderTransparent, _init_translationCurve, _init_extra_translationCurve;

/** Stores editable tactical line records before renderer submission. */
let _EveLineSet;
class EveLineSet extends CjsModel {
  static {
    ({
      e: [_init_lines, _init_extra_lines, _init_maxCurrentLineCount, _init_extra_maxCurrentLineCount, _init_currentSubmittedLineCount, _init_extra_currentSubmittedLineCount, _init_scaling, _init_extra_scaling, _init_name, _init_extra_name, _init_rotationCurve, _init_extra_rotationCurve, _init_effect, _init_extra_effect, _init_display, _init_extra_display, _init_renderTransparent, _init_extra_renderTransparent, _init_translationCurve, _init_extra_translationCurve, _initProto],
      c: [_EveLineSet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveLineSet",
      family: "eve/ui"
    })], [[type.list("EveLineData"), 0, "lines"], [[type, type.uint32], 16, "maxCurrentLineCount"], [[type, type.uint32], 16, "currentSubmittedLineCount"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("ITriQuaternionFunction")], 16, "rotationCurve"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "effect"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "renderTransparent"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "translationCurve"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Stores Carbon's pending line data as renderer-neutral JavaScript records; buffer realization belongs to an engine package.")], 18, "AddLine"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")], 18, "ChangeLineColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")], 18, "ChangeLine"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Mutates the renderer-neutral CPU record because GPU buffer updates belong to an engine package.")], 18, "ChangeLinePosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearLines"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Returns a Boolean for JavaScript callers while preserving Carbon's indexed CPU-line removal.")], 18, "RemoveLine"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Records submitted counts without creating Carbon's GPU vertex buffer; realization belongs to an engine package.")], 18, "SubmitChanges"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetPerObjectData"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_translationCurve(this);
  }
  /** Carbon's pending CPU line records. */
  lines = (_initProto(this), _init_lines(this, []));
  maxCurrentLineCount = (_init_extra_lines(this), _init_maxCurrentLineCount(this, 0));
  currentSubmittedLineCount = (_init_extra_maxCurrentLineCount(this), _init_currentSubmittedLineCount(this, 0));

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_currentSubmittedLineCount(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_scaling(this), _init_name(this, ""));

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  rotationCurve = (_init_extra_name(this), _init_rotationCurve(this, null));

  /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  effect = (_init_extra_rotationCurve(this), _init_effect(this, null));

  /** m_display (bool) [READWRITE, PERSIST] */
  display = (_init_extra_effect(this), _init_display(this, true));

  /** m_isRenderedAsTransparent (bool) [READWRITE, PERSIST] */
  renderTransparent = (_init_extra_display(this), _init_renderTransparent(this, false));

  /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  translationCurve = (_init_extra_renderTransparent(this), _init_translationCurve(this, null));

  /** Carbon method AddLine (MAP_METHOD_AND_WRAP). */
  AddLine(position1, color1, position2, color2) {
    this.lines.push({
      position1: vec3.clone(position1),
      color1: vec4.clone(color1),
      position2: vec3.clone(position2),
      color2: vec4.clone(color2)
    });
    return this.lines.length - 1;
  }

  /** Carbon method ChangeLineColor (MAP_METHOD_AND_WRAP). */
  ChangeLineColor(id, color1, color2) {
    const line = this.lines[id];
    if (!line) return false;
    vec4.copy(line.color1, color1);
    vec4.copy(line.color2, color2);
    return true;
  }

  /** Carbon method ChangeLine (MAP_METHOD_AND_WRAP). */
  ChangeLine(id, position1, color1, position2, color2) {
    const line = this.lines[id];
    if (!line) return false;
    vec3.copy(line.position1, position1);
    vec4.copy(line.color1, color1);
    vec3.copy(line.position2, position2);
    vec4.copy(line.color2, color2);
    return true;
  }

  /** Carbon method ChangeLinePosition (MAP_METHOD_AND_WRAP). */
  ChangeLinePosition(id, position1, position2) {
    const line = this.lines[id];
    if (!line) return false;
    vec3.copy(line.position1, position1);
    vec3.copy(line.position2, position2);
    return true;
  }

  /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
  ClearLines() {
    this.lines.length = 0;
  }

  /** Carbon method RemoveLine (MAP_METHOD_AND_WRAP). */
  RemoveLine(id) {
    if (!this.lines[id]) return false;
    this.lines.splice(id, 1);
    return true;
  }

  /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
  SubmitChanges() {
    this.maxCurrentLineCount = Math.max(this.maxCurrentLineCount, this.lines.length);
    this.currentSubmittedLineCount = this.lines.length;
    return true;
  }

  /** Carbon EveLineSet::HasTransparentBatches is always true (cpp:161-164). */
  HasTransparentBatches() {
    return true;
  }

  /** Carbon EveLineSet::GetBatches submits its GPU-backed line vertex buffer (cpp:166-201). */
  GetBatches(_accumulator, _batchType, _perObjectData, _reason) {
    throw new Error("EveLineSet.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveLineSet::GetSortValue reads renderer view state and the live world transform (cpp:203-208). */
  GetSortValue() {
    throw new Error("EveLineSet.GetSortValue is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveLineSet::GetPerObjectData populates standard device constant buffers (cpp:210-231). */
  GetPerObjectData(_accumulator) {
    throw new Error("EveLineSet.GetPerObjectData is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _EveLineSet as EveLineSet };
//# sourceMappingURL=EveLineSet.js.map
