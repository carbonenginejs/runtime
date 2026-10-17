// Source: trinity/trinity/Include/ITr2Scene.h
import { blue } from "#schema";
import { ITr2Updateable } from "./ITr2Updateable.js";

/** Native scene contract adding render entry points to the two-clock update contract. */
@blue.define({ className: "ITr2Scene", abstract: true })
export class ITr2Scene extends ITr2Updateable
{
  /** Renders this scene. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @blue.abstract
  Render(_renderContext) {}

  /** Renders scene debugging geometry. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @blue.abstract
  RenderDebugInfo(_renderContext) {}
}
