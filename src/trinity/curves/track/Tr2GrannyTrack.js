// Source: trinity/trinity/Curves/Tr2GrannyTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyTrack.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";


/**
 * Base for curves sampled out of a Granny animation resource, owning the
 * resource path, group and track name plus the cycle flag and resolved duration;
 * subclasses supply the track binding and sampling.
 */
@type.define({
  className: "Tr2GrannyTrack",
  family: "curves"
})
export class Tr2GrannyTrack extends CjsModel
{
  @io.persist
  @io.notify
  @type.path
  grannyResPath = "";

  @io.persist
  @type.boolean
  cycle = false;

  @io.read
  @type.float32
  duration = 0;

  @io.read
  @type.objectRef("TriGrannyRes")
  grannyRes = null;

  @io.notify
  @io.persist
  @type.string
  name = "";

  @io.notify
  @io.persist
  @type.string
  group = "";

  /**
   * Initializes the resource-backed track.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.SetGrannyResource();
    return true;
  }

  /**
   * Relinks the resource when authored fields change.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.SetGrannyResource();
    return true;
  }

  /**
   * Relinks the authored Granny resource path.
   */
  @carbon.method
  @impl.adapted
  SetGrannyResource()
  {
    this.ResetTracks();
    this.duration = 0;
    if (this.grannyResPath)
    {
      this.grannyRes = CjsGrannyCurves.resolveResource(this.grannyResPath);
    }
    this.SetCurves();
  }

  /**
   * Updates the track value.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.implemented
  Length()
  {
    return Number(this.duration) || 0;
  }

  /**
   * Locates resource curves.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.noop
  UpdateValueImpl(_time)
  {
  }

  /**
   * Subclass hook for clearing resource track handles.
   */
  @carbon.method
  @impl.noop
  ResetTracks()
  {
  }

  /**
   * Subclass hook for applying resource track handles.
   */
  @carbon.method
  @impl.noop
  ApplyTracks(_group, _duration, _timeStep)
  {
  }

  /**
   * Checks whether resource track handles are ready.
   */
  @carbon.method
  @impl.noop
  TracksReady()
  {
    return false;
  }
}
