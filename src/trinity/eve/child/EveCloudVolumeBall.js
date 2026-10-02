// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/EveCloudVolumeBall.json.).
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Runtime model for one editable cloud-volume ball. */
@meta.define({ className: "EveCloudVolumeBall", family: "eve/child" })
export class EveCloudVolumeBall
{

  /** m_ballData.m_position (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  position = vec3.create();

  /** m_ballData.m_radius (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  radius = 0;

  /** m_ballData.m_opacity (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  opacity = 0;

  /** m_ballData.m_falloff (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  falloff = 1;

  /** m_ballData.m_selfIllumination (Color) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  selfIllumination = vec4.create();

}
