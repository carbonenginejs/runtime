// Source: trinity/trinity/Curves/Tr2GrannyTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyTrack.cpp
import { IsMatch } from "#blue";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { meta, type, blue } from "#schema";
import { INotify, ITriFunction, ITriCurveLength } from "#blue";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";


/**
 * Base for curves sampled out of a Granny animation resource, owning the
 * resource path, group and track name plus the cycle flag and resolved duration;
 * subclasses supply the track binding and sampling.
 */
@blue.define({ className: "Tr2GrannyTrack", abstract: true })
@blue.inherit(ITriFunction, IInitialize, ITriCurveLength, INotify)
@blue.interface(ITriFunction, IInitialize, INotify)
export class Tr2GrannyTrack
{
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path
  grannyResPath = "";

  @blue.readwrite
  @blue.persist
  @type.boolean
  cycle = false;

  @blue.read
  @type.float32
  duration = 0;

  @blue.read
  @type.rootRef("TriGrannyRes")
  grannyRes = null;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  group = "";

  /**
   * Initializes the resource-backed track.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this.SetGrannyResource();
    return true;
  }

  /**
   * Carbon OnModified (Tr2GrannyTrack.cpp:49-65): a new resource path relinks
   * the resource; a new name or group rebuilds the curves. The two checks are
   * independent, so a batched change runs both.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "grannyResPath")) this.SetGrannyResource();
    if (IsMatch(propertyName, "name") || IsMatch(propertyName, "group"))
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
  @blue.method
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
  @blue.method
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
  @blue.method
  @meta.implemented
  Length()
  {
    return Number(this.duration) || 0;
  }

  /**
   * Locates resource curves.
   */
  @blue.method
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
   * Carbon's pure virtual `UpdateValueImpl( double time )` (Tr2GrannyTrack.h:86):
   * the subclass samples its tracks at a local time.
   *
   * @param {number} _time Local time in seconds.
   */
  @blue.abstract
  UpdateValueImpl(_time) {}

  /**
   * Carbon's pure virtual `ResetTracks( void )` (Tr2GrannyTrack.h:87): the
   * subclass drops its resource track handles.
   */
  @blue.abstract
  ResetTracks() {}

  /**
   * Carbon's pure virtual `ApplyTracks( granny_track_group* group, float
   * duration, float timeStep )` (Tr2GrannyTrack.h:88): the subclass binds its
   * tracks from the named group.
   *
   * @param {object} _group The decoded track group.
   * @param {number} _duration Animation duration in seconds.
   * @param {number} _timeStep Animation time step in seconds.
   */
  @blue.abstract
  ApplyTracks(_group, _duration, _timeStep) {}

  /**
   * Carbon's pure virtual `TracksReady( void )` (Tr2GrannyTrack.h:89).
   *
   * @returns {boolean} Whether the subclass's track handles are bound.
   */
  @blue.abstract
  TracksReady() {}
}
