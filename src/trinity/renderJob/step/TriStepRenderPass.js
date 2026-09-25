// Source: trinity/trinity/RenderJob/TriStepRenderPass.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { PassType } from "../../generated/include/enums.js";
import { blue, EnumRegistrationType } from "#blue";

/** A render step that renders one named pass of a multi-pass scene. */
@type.define({ className: "TriStepRenderPass", family: "renderJob" })
export class TriStepRenderPass extends TriRenderStep
{

  /** m_pass (ITr2MultiPassScene::PassType - enum PassType) [READWRITE, PERSIST, ENUM] */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.ITr2MultiPassScene.PassType")
  passType = 0;

  /** m_scene (ITr2MultiPassScenePtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
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
  Execute(_realTime, _simTime, renderContext)
  {
    const result = this.scene?.RenderPass?.(this.passType, renderContext);
    return result === 1 ? TriRenderStep.Result.RS_TERMINATE : TriRenderStep.Result.RS_OK;
  }

  static PassType = PassType;

}

// Registered as Carbon registers it (trinity/trinity/RenderJob/TriStepRenderPass_Blue.cpp:23).
blue.enums.RegisterEnum("trinity.ITr2MultiPassScene.PassType", TriStepRenderPass.PassType, {
  source: "trinity/trinity/Include/ITr2MultiPassScene.h", family: "renderJob", line: 25,
  exposedName: "MULTI_PASS_SCENE_PASS", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/RenderJob/TriStepRenderPass_Blue.cpp:6",
  chooser: [
    { name: "TRIPASS_BEGIN_RENDER", value: TriStepRenderPass.PassType.RP_BEGIN_RENDER, description: "Begin rendering" },
    { name: "TRIPASS_PRE_PASS", value: TriStepRenderPass.PassType.RP_PRE_PASS, description: "Render prepass (depth, normals, specular)" },
    { name: "TRIPASS_LIGHT_PASS", value: TriStepRenderPass.PassType.RP_LIGHT_PASS, description: "Render lights" },
    { name: "TRIPASS_GATHER_PASS", value: TriStepRenderPass.PassType.RP_GATHER_PASS, description: "Render gather pass" },
    { name: "TRIPASS_FLARE_PASS", value: TriStepRenderPass.PassType.RP_FLARE_PASS, description: "Render flare pass" },
    { name: "TRIPASS_END_RENDER", value: TriStepRenderPass.PassType.RP_END_RENDER, description: "End rendering" },
    { name: "TRIPASS_BACKGROUND_RENDER", value: TriStepRenderPass.PassType.RP_BACKGROUND_RENDER, description: "Background rendering" },
    { name: "TRIPASS_MAIN_RENDER", value: TriStepRenderPass.PassType.RP_MAIN_RENDER, description: "Main rendering" },
    { name: "TRIPASS_REFLECTION_RENDER", value: TriStepRenderPass.PassType.RP_REFLECTION_RENDER, description: "Reflection rendering" },
    { name: "TRIPASS_DEPTH_PASS", value: TriStepRenderPass.PassType.RP_DEPTH_PASS, description: "Depth pass" },
    { name: "TRIPASS_SET_PERFRAME_DATA", value: TriStepRenderPass.PassType.RP_SET_PERFRAME_DATA, description: "Set perframe data to shaders" },
    { name: "TRIPASS_RENDER_UI", value: TriStepRenderPass.PassType.RP_RENDER_UI, description: "Set perframe data to shaders" }
  ]
});
