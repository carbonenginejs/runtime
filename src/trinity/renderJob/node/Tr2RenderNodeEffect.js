import { IRoot } from "../../../blue/exposure/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2RenderNodeEffect.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { type } from "#schema";
import { RenderingMode } from "#consts/graphics";
import { ITr2RenderNode } from "#interfaces/ITr2RenderNode";
import { BlueList } from "#blue";
import "#consts/graphics/trinityEnums";

/** A render-graph node that binds named sources onto an effect and produces its output. */
@be.define({
  name: "Tr2RenderNodeEffect",
  inherit: [ ITr2RenderNode ],
  // Tr2RenderNodeEffect_Blue.cpp:30-58, in Carbon's order.
  interfaces: [ ITr2RenderNode ],
  members: [
    [ be.ATTR, "effect", be.READWRITE ],
    [ be.ATTR, "viewport", be.READWRITE ],
    [ be.ATTR_CHOOSER, "renderingMode", be.READWRITE | be.ENUM, "trinity.Tr2EffectStateManager.RenderingMode" ],
    [ be.METHOD, "AddSource", be.WRAP_OPTIONAL_ARGS, 1 ],
    [ be.ATTR, "inputNodes", be.READ | be.PERSIST ]
  ]
})
export class Tr2RenderNodeEffect extends IRoot
{

  /** Carbon's grouped source/parameter bindings. */
  @type.array("Tr2RenderNodeEffectSource")
  sources = [];

  /**
   * m_renderingMode (Tr2EffectStateManager::RenderingMode - enum RenderingMode) [READWRITE, ENUM]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Tr2RenderNodeEffect_Blue.cpp:43); chooser TriRMChooser (trinity/trinity/Tr2RenderNodeEffect_Blue.cpp:9).
   */
  @type.int32
  @type.enum("trinity.Tr2EffectStateManager.RenderingMode")
  renderingMode = 8;

  /** m_effect (Tr2EffectPtr) [READWRITE] */
  @type.object.ref("Tr2Effect")
  effect = null;

  /** m_viewport (TriViewportPtr) [READWRITE] */
  @type.object.ref("TriViewport")
  viewport = null;

  /** m_inputNodes (PITr2RenderNodeVector) [READ, PERSIST] */

  @type.list("ITr2RenderNode")
  inputNodes = new BlueList(ITr2RenderNode);

  /**
   * Carbon Tr2RenderNodeEffect::Validate (cpp:15-46).
   *
   * @adapted Tr2BitmapDimensions spans are represented by JavaScript arrays of value
   *   records.
   */

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

  /**
   * Carbon method AddSource (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
   *
   * @adapted
   */
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

  /**
   * Carbon: Tr2RenderNodeEffect::Execute (trinity/trinity/Tr2RenderNodeEffect.h:20), `void Execute( const Span<const Tr2TextureAL>& destinations, const Span<TempOutput>& outputs, Be::Time realTime, Be::Time simTime, const Tr2ProfileTimer& rootTimer, Tr2RenderContext& renderContext ) override`.
   *
   * @notImplemented
   * @param {Tr2TextureAL[]} destinations Destination textures.
   * @param {object[]} outputs Temporary outputs (TempOutput).
   * @param {number} realTime Real time (Be::Time).
   * @param {number} simTime Simulation time (Be::Time).
   * @param {object} rootTimer Profile timer (Tr2ProfileTimer).
   * @param {Tr2RenderContext} renderContext Render context.
   * @throws {Error} Always.
   */
  Execute(destinations, outputs, realTime, simTime, rootTimer, renderContext)
  {
    throw new Error("Tr2RenderNodeEffect.Execute is not implemented in CarbonEngineJS.");
  }
}
