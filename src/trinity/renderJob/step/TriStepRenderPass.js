// Source: trinity/trinity/RenderJob/TriStepRenderPass.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { PassType } from "../../generated/include/enums.js";
import { blue } from "#blue";

/** A render step that renders one named pass of a multi-pass scene. */
@meta.define({ className: "TriStepRenderPass", family: "renderJob" })
export class TriStepRenderPass extends TriRenderStep
{

  /** m_pass (ITr2MultiPassScene::PassType - enum PassType) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.ITr2MultiPassScene.PassType")
  passType = 0;

  /** m_scene (ITr2MultiPassScenePtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITr2MultiPassScene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.implemented
  __init__(scene = null, passType = 0)
  {
    this.scene = scene;
    this.passType = Number(passType) | 0;
  }

  /**
   * Renders the configured pass of the bound multi-pass scene.
   */
  @meta.blue.method
  @meta.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    const result = this.scene?.RenderPass?.(this.passType, renderContext);
    return result === 1 ? TriRenderStep.Result.RS_TERMINATE : TriRenderStep.Result.RS_OK;
  }

  static PassType = PassType;

}
