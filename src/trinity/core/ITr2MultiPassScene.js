// Source: trinity/trinity/Include/ITr2MultiPassScene.h:16-44
import { CjsSchema, meta } from "#schema";
import { PassType, RenderPassResult } from "../generated/include/enums.js";

/** Native multi-pass scene contract; IRoot has no JavaScript base class. */
export class ITr2MultiPassScene
{
  /**
   * Renders one pass (ITr2MultiPassScene.h:43-44).
   * @param {number} _pass Native PassType value.
   * @param {Tr2RenderContext} _renderContext Active render context.
   * @returns {number} Native RenderPassResult value.
   */
  @meta.abstract
  RenderPass(_pass, _renderContext) {}

  static PassType = PassType;
  static RenderPassResult = RenderPassResult;
}

CjsSchema.blue.define(ITr2MultiPassScene, { className: "ITr2MultiPassScene", fields: {} });
