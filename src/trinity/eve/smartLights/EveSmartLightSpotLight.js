// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight.h
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; the renderer obligation remains explicit.
import { meta } from "#schema";
import { Tr2Light } from "../lights/Tr2Light.js";
import { EveSmartLightPointLight } from "./EveSmartLightPointLight.js";

/** A spot-light specialization with persisted cone angles. */
@meta.define({ className: "EveSmartLightSpotLight", family: "eve/smartLights" })
export class EveSmartLightSpotLight extends EveSmartLightPointLight
{

  /** m_lightGroupData.innerAngle (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  innerAngle = 0;

  /** m_lightGroupData.outerAngle (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  outerAngle = 0;

  /** m_lightType override - the constructor's only job (EveSmartLightSpotLight.cpp:7-11). */
  lightType = Tr2Light.SPOT_LIGHT;

  /** Carbon method RenderDebugInfo (EveSmartLightSpotLight.cpp:13-56). */
  @meta.blue.method
  @meta.notImplemented
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

// EveSmartLightSpotLight_Blue.cpp: native exposure.
meta.blue.interfaceTable({ interfaces: [EveSmartLightSpotLight], chainTo: EveSmartLightPointLight })(EveSmartLightSpotLight, { kind: "class" });
