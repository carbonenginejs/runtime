import { ITr2RenderNode } from "#interfaces/ITr2RenderNode";
import { CjsSchema } from "#schema";

/**
 * Runs one outline helper's retained mask composite after the scene driver.
 * @cjs
 */
export class TnyOutlineCompositeNode extends ITr2RenderNode
{

  /**
   * Borrowed outline helper owning this composite node.
   * @type {TnyOutlineHelper|null}
   * @cjs
   */
  _helper = null;

  /**
   * Borrows the helper; the helper owns this node and its resources.
   * @param {TnyOutlineHelper} helper Owning outline helper.
   * @cjs
   */
  constructor(helper)
  {
    super();
    this._helper = helper;
  }

  /**
   * The later render-job step has one frame destination and no named outputs.
   *
   * @param {object[]} dimensions Input render-target dimensions.
   * @param {object[]} outputs Named render outputs.
   * @returns {boolean}
   * @cjs
   */
  Validate(dimensions, outputs)
  {
    return !this._helper._destroyed && dimensions.length === 1 && outputs.length === 0;
  }

  /**
   * Consumes only a mask produced for this context and these frame timestamps.
   *
   * @param {object[]} destinations Frame render destinations.
   * @param {object[]} _outputs Unused named render outputs.
   * @param {number} realTime Real frame timestamp in engine ticks.
   * @param {number} simTime Simulation frame timestamp in engine ticks.
   * @param {object|null} _rootTimer Unused render-job timer.
   * @param {object} renderContext Active render context.
   * @cjs
   */
  Execute(destinations, _outputs, realTime, simTime, _rootTimer, renderContext)
  {
    const helper = this._helper;
    if (helper.compositePlacement !== "afterPost") return;
    const frame = helper._frame;
    helper._frame = null;
    if (!frame || frame.context !== renderContext || frame.realTime !== realTime || frame.simTime !== simTime) return;
    helper._Composite(destinations[0], frame, renderContext);
  }

  /**
   * Stable identity for diagnostics and registration.
   * @type {string}
   * @cjs
   */
  static className = "TnyOutlineCompositeNode";

}

CjsSchema.meta.define(TnyOutlineCompositeNode, {
  name: "TnyOutlineCompositeNode",
  methods: { Validate: [], Execute: [] }
});
CjsSchema.meta.exposureChainTo(ITr2RenderNode)(TnyOutlineCompositeNode);
