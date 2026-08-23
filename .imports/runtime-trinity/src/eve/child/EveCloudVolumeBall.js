// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/EveCloudVolumeBall.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** EveCloudVolumeBall (eve/child) - generated from schema shapeHash 70440408.... */
@type.define({ className: "EveCloudVolumeBall", family: "eve/child" })
export class EveCloudVolumeBall extends CjsModel
{

  /** m_ballData.m_position (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_ballData.m_radius (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  radius = 0;

  /** m_ballData.m_opacity (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  opacity = 0;

  /** m_ballData.m_falloff (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  falloff = 0;

  /** m_ballData.m_selfIllumination (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.color
  selfIllumination = vec4.create();

}
