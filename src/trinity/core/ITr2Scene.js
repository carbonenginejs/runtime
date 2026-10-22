// Source: trinity/trinity/Include/ITr2Scene.h
import { exposure as be } from "#be";
import { meta } from "#schema";
import { ITr2Updateable } from "./ITr2Updateable.js";

/** Native scene contract adding render entry points to the two-clock update contract. */
@be.interface("ITr2Scene")
@be.abstract
export class ITr2Scene extends ITr2Updateable
{
  /** Renders this scene. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @meta.abstract
  Render(_renderContext) {}

  /** Renders scene debugging geometry. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @meta.abstract
  RenderDebugInfo(_renderContext) {}
}
