// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume_Blue.cpp
// Hand-maintained after promotion from generated intake.
import { meta } from "#schema";
import { INotify } from "#blue";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Runtime model for one editable cloud-volume ball. */
@meta.define({ className: "EveCloudVolumeBall", family: "eve/child" })
@meta.blue.inherit(INotify)
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

  _owner = null;

  /** Native cpp:26-33 forwards every edit; JavaScript WeakRef replaces BlueWeakRef ownership. */
  @meta.blue.method
  @meta.adapted
  OnModified(_names)
  {
    // JavaScript WeakRef replaces BlueWeakRef without keeping the editor alive.
    const owner = this._owner?.deref();
    if (owner) owner.OnVolumeModified();
    return true;
  }
}

meta.blue.interfaceTable({ interfaces: [EveCloudVolumeBall, INotify], chainTo: null })(EveCloudVolumeBall, { kind: "class" });
