// Source: trinity/trinity/Include/ITr2Scene.h
import { meta } from "#schema";
import { ITr2Updateable } from "./ITr2Updateable.js";

/** Native scene contract adding render entry points to the two-clock update contract. */
@meta.define({ className: "ITr2Scene", family: "trinityCore", abstract: true })
export class ITr2Scene extends ITr2Updateable
{
  /** Renders this scene. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @meta.blue.method
  @meta.abstract
  Render(_renderContext)
  {
    throw new Error("ITr2Scene.Render must be implemented by a concrete scene.");
  }

  /** Renders scene debugging geometry. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @meta.blue.method
  @meta.abstract
  RenderDebugInfo(_renderContext)
  {
    throw new Error("ITr2Scene.RenderDebugInfo must be implemented by a concrete scene.");
  }
}
