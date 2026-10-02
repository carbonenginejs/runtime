import { IsMatch } from "#blue";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Curves/Tr2GrannyTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyTrack.cpp
import { meta } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";


/**
 * Base for curves sampled out of a Granny animation resource, owning the
 * resource path, group and track name plus the cycle flag and resolved duration;
 * subclasses supply the track binding and sampling.
 */
@meta.define({
  className: "Tr2GrannyTrack",
  family: "curves"
})
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class Tr2GrannyTrack
{
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  grannyResPath = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  cycle = false;

  @meta.blue.read
  @meta.type.float32
  duration = 0;

  @meta.blue.read
  @meta.type.objectRef("TriGrannyRes")
  grannyRes = null;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  group = "";

  /**
   * Initializes the resource-backed track.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    this.SetGrannyResource();
    return true;
  }

  /**
   * Relinks the resource when authored fields change.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Dispatches Carbon member notifications by exposed property name; existing JS expression and resource adapters retain their owning methods.")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "grannyResPath")) this.SetGrannyResource();
    else if (IsMatch(propertyName, "name") || IsMatch(propertyName, "group"))
    {
      this.ResetTracks();
      this.duration = 0;
      this.SetCurves();
    }
    return true;
  }

  /**
   * Relinks the authored Granny resource path.
   */
  @meta.blue.method
  @meta.adapted
  SetGrannyResource()
  {
    this.ResetTracks();
    this.duration = 0;
    this.grannyRes = null;
    if (this.grannyResPath)
    {
      this.grannyRes = CjsGrannyCurves.resolveResource(this.grannyResPath);
    }
    this.SetCurves();
  }

  /**
   * Updates the track value.
   */
  @meta.blue.method
  @meta.adapted
  UpdateValue(time)
  {
    if (!this.TracksReady())
    {
      return;
    }
    const duration = this.Length();
    const localTime = this.cycle && duration > 0 ? time % duration : time;
    if (localTime >= 0 && localTime <= duration)
    {
      this.UpdateValueImpl(localTime);
    }
  }

  /**
   * Gets track duration.
   */
  @meta.blue.method
  @meta.implemented
  Length()
  {
    return Number(this.duration) || 0;
  }

  /**
   * Locates resource curves.
   */
  @meta.blue.method
  @meta.adapted
  SetCurves()
  {
    if (!this.name || !this.group)
    {
      return;
    }
    const source = CjsGrannyCurves.getTrackSource(this.grannyRes);
    if (!source)
    {
      return;
    }
    for (const animation of CjsGrannyCurves.getAnimations(source))
    {
      for (const trackGroup of CjsGrannyCurves.getTrackGroups(animation))
      {
        const groupName = trackGroup.name ?? trackGroup.Name;
        if (groupName === this.group)
        {
          this.ApplyTracks(trackGroup, CjsGrannyCurves.getAnimationDuration(animation), CjsGrannyCurves.getAnimationTimeStep(animation));
          return;
        }
      }
    }
  }

  /**
   * Subclass hook for sampled value updates.
   */
  @meta.blue.method
  @meta.noop
  UpdateValueImpl(_time)
  {
  }

  /**
   * Subclass hook for clearing resource track handles.
   */
  @meta.blue.method
  @meta.noop
  ResetTracks()
  {
  }

  /**
   * Subclass hook for applying resource track handles.
   */
  @meta.blue.method
  @meta.noop
  ApplyTracks(_group, _duration, _timeStep)
  {
  }

  /**
   * Checks whether resource track handles are ready.
   */
  @meta.blue.method
  @meta.noop
  TracksReady()
  {
    return false;
  }
}
