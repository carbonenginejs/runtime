// Source: trinity/trinity/RenderJob/TriStepRenderPass.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { PassType } from "../../generated/include/enums.js";
import { be } from "#blue";

/** A render step that renders one named pass of a multi-pass scene. */
@blue.define("TriStepRenderPass")
export class TriStepRenderPass extends TriRenderStep
{

  /** m_pass (ITr2MultiPassScene::PassType - enum PassType) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.ITr2MultiPassScene.PassType")
  passType = 0;

  /** m_scene (ITr2MultiPassScenePtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITr2MultiPassScene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @blue.method
  @meta.implemented
  __init__(scene = null, passType = 0)
  {
    this.scene = scene;
    this.passType = Number(passType) | 0;
  }

  /**
   * Renders a present multi-pass scene directly and observes its terminate result.
   * Carbon TriStepRenderPass.cpp:16-27 retains the nullable scene branch.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    const result = this.scene?.RenderPass(this.passType, renderContext);
    return result === 1 ? TriRenderStep.Result.RS_TERMINATE : TriRenderStep.Result.RS_OK;
  }

  static PassType = PassType;

}
