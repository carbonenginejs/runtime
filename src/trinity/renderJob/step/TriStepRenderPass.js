// Source: trinity/trinity/RenderJob/TriStepRenderPass.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { PassType } from "../../generated/include/enums.js";

/** A render step that renders one named pass of a multi-pass scene. */
@type.define({ className: "TriStepRenderPass", family: "renderJob" })
export class TriStepRenderPass extends TriRenderStep
{

  /** m_pass (ITr2MultiPassScene::PassType - enum PassType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("PassType")
  passType = 0;

  /** m_scene (ITr2MultiPassScenePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2MultiPassScene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(scene = null, passType = 0)
  {
    this.scene = scene;
    this.passType = Number(passType) | 0;
  }

  /**
   * Renders the configured pass of the bound multi-pass scene.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    const result = this.scene?.RenderPass?.(this.passType, executor);
    return result === 1 ? TriRenderStep.Result.RS_TERMINATE : TriRenderStep.Result.RS_OK;
  }

  static PassType = PassType;

}
