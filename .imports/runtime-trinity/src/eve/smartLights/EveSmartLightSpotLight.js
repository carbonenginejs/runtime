// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight.h
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; the renderer obligation remains explicit.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2Light } from "../lights/Tr2Light.js";
import { EveSmartLightPointLight } from "./EveSmartLightPointLight.js";

/** A spot-light specialization with persisted cone angles. */
@type.define({ className: "EveSmartLightSpotLight", family: "eve/smartLights" })
export class EveSmartLightSpotLight extends EveSmartLightPointLight
{

  /** m_lightGroupData.innerAngle (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerAngle = 0;

  /** m_lightGroupData.outerAngle (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  outerAngle = 0;

  /** m_lightType override - the constructor's only job (EveSmartLightSpotLight.cpp:7-11). */
  lightType = Tr2Light.SPOT_LIGHT;

  /** Carbon method RenderDebugInfo (EveSmartLightSpotLight.cpp:13-56). */
  @carbon.method
  @impl.notImplemented
  RenderDebugInfo(..._args)
  {
    throw new Error("EveSmartLightSpotLight.RenderDebugInfo is not implemented in CarbonEngineJS.");
  }

  static LightDataFields = [
    ...EveSmartLightPointLight.LightDataFields,
    "innerAngle",
    "outerAngle"
  ];

}
