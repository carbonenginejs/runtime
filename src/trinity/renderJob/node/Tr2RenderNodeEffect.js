// Source: trinity/trinity/Tr2RenderNodeEffect.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { RenderingMode } from "#consts/graphics";
import { ITr2RenderNode } from "#interfaces/ITr2RenderNode";
import "#consts/graphics/trinityEnums";

/** A render-graph node that binds named sources onto an effect and produces its output. */
@blue.define("Tr2RenderNodeEffect")
@blue.interface(ITr2RenderNode)
@blue.inherit(ITr2RenderNode)
export class Tr2RenderNodeEffect
{

  /** Carbon's grouped source/parameter bindings. */
  @type.list("Tr2RenderNodeEffectSource")
  sources = [];

  /** m_renderingMode (Tr2EffectStateManager::RenderingMode - enum RenderingMode) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.Tr2EffectStateManager.RenderingMode")
  renderingMode = 8;

  /** m_effect (Tr2EffectPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("Tr2Effect")
  effect = null;

  /** m_viewport (TriViewportPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("TriViewport")
  viewport = null;

  /** m_inputNodes (PITr2RenderNodeVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("ITr2RenderNode")
  inputNodes = [];

  /**
   * Carbon Tr2RenderNodeEffect::Validate (cpp:15-46).
   *
   * Adapted: Tr2BitmapDimensions spans are represented by JavaScript arrays of value
   * records.
   */
  @blue.method
  @meta.adapted
  Validate(destinationDimensions, outputs, realTime, simTime)
  {
    if (!destinationDimensions.length || outputs.length)
    {
      return false;
    }
    // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
    if (!this.effect || !this.effect.IsGood())
    {
      return false;
    }
    if (this.viewport && (this.viewport.width <= 0 || this.viewport.height <= 0))
    {
      return false;
    }

    for (const source of this.sources)
    {
      let dimensions = destinationDimensions[0];
      if (this.viewport)
      {
        dimensions = {
          ...dimensions,
          width: Math.max(0, this.viewport.width),
          height: Math.max(0, this.viewport.height),
          depth: 1
        };
      }
      if (!source.node.Validate([dimensions], source.outputNames, realTime, simTime))
      {
        return false;
      }
    }
    return true;
  }

  /** Carbon method AddSource (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @blue.method
  @meta.adapted
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
