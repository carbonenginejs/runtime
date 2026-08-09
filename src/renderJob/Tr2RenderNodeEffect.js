// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2RenderNodeEffect.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

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
  @schema.enum("RenderingMode")
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

  static RenderingMode = Object.freeze({
    RM_ANY: 0,
    RM_OPAQUE: 1,
    RM_DECAL: 2,
    RM_DECAL_NO_DEPTH: 3,
    RM_ALPHA: 4,
    RM_ALPHA_ADDITIVE: 5,
    RM_DEPTH_ONLY: 6,
    RM_PICKING: 7,
    RM_FULLSCREEN: 8,
    RM_SPRITE2D: 9,
    RM_CULL: 10,
    RM_LIGHT: 11,
    RM_ERASE: 12,
    RM_PREPASS_COLOR: 13,
    RM_COUNT: 14,
  });

}
