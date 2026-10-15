import { ITr2RenderNode } from "#interfaces/ITr2RenderNode";
import { CjsSchema, meta } from "#schema";

/** Runs one outline helper's retained mask composite after the scene driver. */
export class TnyOutlineCompositeNode extends ITr2RenderNode
{
  _helper = null;

  /** Borrows the helper; the helper owns this node and its resources. */
  constructor(helper)
  {
    super();
    this._helper = helper;
  }

  /** The later render-job step has one frame destination and no named outputs. */
  Validate(dimensions, outputs)
  {
    return !this._helper._destroyed && dimensions.length === 1 && outputs.length === 0;
  }

  /** Consumes only a mask produced for this context and these frame timestamps. */
  Execute(destinations, _outputs, realTime, simTime, _rootTimer, renderContext)
  {
    const helper = this._helper;
    if (helper.compositePlacement !== "afterPost") return;
    const frame = helper._frame;
    helper._frame = null;
    if (!frame || frame.context !== renderContext || frame.realTime !== realTime || frame.simTime !== simTime) return;
    helper._Composite(destinations[0], frame, renderContext);
  }
}

CjsSchema.meta.define(TnyOutlineCompositeNode, {
  className: "TnyOutlineCompositeNode",
  methods: { Validate: [meta.ours], Execute: [meta.ours] }
});
