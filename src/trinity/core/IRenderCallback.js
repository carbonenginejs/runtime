// Source: trinity/trinity/IRenderCallback.h
import { blue } from "#schema";


/**
 * Carbon IRenderCallback (IRenderCallback.h:9-13): a geometry source that
 * Tr2Effect.Render asks to submit its draw once per pass.
 */
@blue.define("IRenderCallback")
export class IRenderCallback
{

  /**
   * Submits this object's geometry on the context, after the pass state and
   * material data are applied.
   * @param {object} _renderContext The `Tr2RenderContext` to draw on.
   * @returns {void}
   */
  @blue.abstract
  SubmitGeometry(_renderContext) {}

}
