// Source: trinity/trinity/ITr2VisualizationModeRenderer.h:16-27
import { CjsSchema, meta } from "#schema";

/** Native visualization-mode contract; IRoot has no JavaScript base class. */
export class ITr2VisualizationModeRenderer
{
  /**
   * Selects the renderer-specific visualization mode
   * (ITr2VisualizationModeRenderer.h:27).
   * @param {number} _visualizationMode Renderer-specific mode value.
   * @returns {void}
   */
  @meta.abstract
  SetVisualizationMode(_visualizationMode) {}
}

CjsSchema.blue.define(ITr2VisualizationModeRenderer, { className: "ITr2VisualizationModeRenderer", fields: {} });
