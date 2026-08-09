// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/RenderJob/TriStepRenderPass.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that renders one named pass of a multi-pass scene. */
@type.define({ className: "TriStepRenderPass", family: "renderJob" })
export class TriStepRenderPass extends TriRenderStep
{

  /** m_pass (ITr2MultiPassScene::PassType - enum PassType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @schema.enum("PassType")
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

  static PassType = Object.freeze({
    RP_BEGIN_RENDER: 0,
    RP_PRE_PASS: 1,
    RP_LIGHT_PASS: 2,
    RP_GATHER_PASS: 3,
    RP_FLARE_PASS: 4,
    RP_END_RENDER: 5,
    RP_BACKGROUND_RENDER: 6,
    RP_MAIN_RENDER: 7,
    RP_REFLECTION_RENDER: 8,
    RP_DEPTH_PASS: 9,
    RP_SET_PERFRAME_DATA: 10,
    RP_RENDER_UI: 11,
    RP_COUNT: 12,
  });

}
