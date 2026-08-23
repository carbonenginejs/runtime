// Source: trinity/trinity/Tr2RenderNodeEffect.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { RenderingMode } from "#consts/graphics";

/** A render-graph node that binds named sources onto an effect and produces its output. */
@type.define({ className: "Tr2RenderNodeEffect", family: "renderJob" })
export class Tr2RenderNodeEffect extends CjsModel
{

  /** Carbon's grouped source/parameter bindings. */
  @type.list("Tr2RenderNodeEffectSource")
  sources = [];

  /** m_renderingMode (Tr2EffectStateManager::RenderingMode - enum RenderingMode) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("RenderingMode")
  renderingMode = 8;

  /** m_effect (Tr2EffectPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2Effect")
  effect = null;

  /** m_viewport (TriViewportPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("TriViewport")
  viewport = null;

  /** m_inputNodes (PITr2RenderNodeVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2RenderNode")
  inputNodes = [];

  /** Carbon method AddSource (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.adapted
  AddSource(name, source, outputName = "")
  {
    if (!source) return false;
    let entry = this.sources.find(item => item.node === source);
    if (!entry)
    {
      entry = { node: source, params: [], outputNames: [], outputs: [] };
      this.sources.push(entry);
    }
    const normalizedOutput = String(outputName ?? "");
    entry.params.push({ paramName: String(name), outputName: normalizedOutput, outputIndex: 0 });
    entry.outputNames.length = 0;
    entry.outputs.length = 0;
    for (const parameter of entry.params)
    {
      if (!parameter.outputName) continue;
      let outputIndex = entry.outputNames.indexOf(parameter.outputName);
      if (outputIndex === -1)
      {
        outputIndex = entry.outputNames.length;
        entry.outputNames.push(parameter.outputName);
        entry.outputs.push({ name: parameter.outputName, texture: null });
      }
      parameter.outputIndex = outputIndex;
    }
    this.inputNodes.push(source);
    return true;
  }

  static RenderingMode = RenderingMode;

}
