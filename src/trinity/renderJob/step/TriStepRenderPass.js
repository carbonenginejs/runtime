import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepRenderPass.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue as legacyBlue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { PassType } from "../../generated/include/enums.js";
import { blue } from "#blue";

/** A render step that renders one named pass of a multi-pass scene. */
@be.define("TriStepRenderPass")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepRenderPass extends TriRenderStep
{

  /** m_pass (ITr2MultiPassScene::PassType - enum PassType) [READWRITE, PERSIST, ENUM] */
  @legacyBlue.readwrite
  @legacyBlue.persist
  @type.int32
  @type.enum("trinity.ITr2MultiPassScene.PassType")
  passType = 0;

  /** m_scene (ITr2MultiPassScenePtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("ITr2MultiPassScene")
  scene = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @be.mapMethodAndWrapOptionalArgs()
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

  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    const result = this.scene?.RenderPass(this.passType, renderContext);
    return result === 1 ? TriRenderStep.Result.RS_TERMINATE : TriRenderStep.Result.RS_OK;
  }

  static PassType = PassType;

}
