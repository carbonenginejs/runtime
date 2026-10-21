import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume_Blue.cpp
// Hand-maintained after promotion from generated intake.
import { meta, type, blue } from "#schema";
import { INotify } from "#blue";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Runtime model for one editable cloud-volume ball. */
@be.define("EveCloudVolumeBall")
@blue.inherit(INotify)
@be.mapInterface(INotify)
export class EveCloudVolumeBall
{

  /** m_ballData.m_position (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.vec3
  position = vec3.create();

  /** m_ballData.m_radius (float) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  radius = 0;

  /** m_ballData.m_opacity (float) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  opacity = 0;

  /** m_ballData.m_falloff (float) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  falloff = 1;

  /** m_ballData.m_selfIllumination (Color) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.color
  selfIllumination = vec4.create();

  _owner = null;

  /** Native cpp:26-33 forwards every edit; JavaScript WeakRef replaces BlueWeakRef ownership. */

  @meta.implemented
  OnModified(_names)
  {
    // JavaScript WeakRef replaces BlueWeakRef without keeping the editor alive.
    const owner = this._owner?.deref();
    if (owner) owner.OnVolumeModified();
    return true;
  }
}

