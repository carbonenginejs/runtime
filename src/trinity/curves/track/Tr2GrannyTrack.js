import { IRoot } from "../../../global/blueexposure/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Curves/Tr2GrannyTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyTrack.cpp
import { IsMatch } from "#blue";
import { IInitialize } from "../../../global/blueexposure/IInitialize.js";
import { meta, type, blue } from "#schema";
import { INotify, ITriFunction, ITriCurveLength } from "#blue";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";


/**
 * Base for curves sampled out of a Granny animation resource, owning the
 * resource path, group and track name plus the cycle flag and resolved duration;
 * subclasses supply the track binding and sampling.
 *
 * @abstract
 */
@be.define("Tr2GrannyTrack")
@be.inherit(ITriFunction, IInitialize, ITriCurveLength, INotify)
@be.mapInterface(ITriFunction)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.abstract
export class Tr2GrannyTrack extends IRoot
{
  /** Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Curves/Tr2GrannyTrack_Blue.cpp:16); chooser TriGR2Chooser (trinity/trinity/TriConstants.cpp:87). */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.NOTIFY, "blue.TriGR2Chooser")
  @type.path
  grannyResPath = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  cycle = false;

  @be.mapAttribute(be.READ)
  @type.float32
  duration = 0;

  @be.mapAttribute(be.READ)
  @type.object.ref("TriGrannyRes")
  grannyRes = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  group = "";

  /**
   * Initializes the resource-backed track.
   *
   * @adapted
   */

  Initialize()
  {
    this.SetGrannyResource();
    return true;
  }

  /**
   * Carbon OnModified (Tr2GrannyTrack.cpp:49-65): a new resource path relinks
   * the resource; a new name or group rebuilds the curves. The two checks are
   * independent, so a batched change runs both.
   *
   * @implemented
   */

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
   *
   * @adapted
   */

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
   *
   * @adapted
   */

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
   *
   * @implemented
   */

  Length()
  {
    return Number(this.duration) || 0;
  }

  /**
   * Locates resource curves.
   *
   * @adapted
   */

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
   * @abstract
   * @param {number} _time Local time in seconds.
   */
  @meta.abstract
  UpdateValueImpl(_time) {}

  /**
   * Carbon's pure virtual `ResetTracks( void )` (Tr2GrannyTrack.h:87): the
   * subclass drops its resource track handles.
   *
   * @abstract
   */
  @meta.abstract
  ResetTracks() {}

  /**
   * Carbon's pure virtual `ApplyTracks( granny_track_group* group, float
   * duration, float timeStep )` (Tr2GrannyTrack.h:88): the subclass binds its
   * tracks from the named group.
   *
   * @abstract
   * @param {object} _group The decoded track group.
   * @param {number} _duration Animation duration in seconds.
   * @param {number} _timeStep Animation time step in seconds.
   */
  @meta.abstract
  ApplyTracks(_group, _duration, _timeStep) {}

  /**
   * Carbon's pure virtual `TracksReady( void )` (Tr2GrannyTrack.h:89).
   *
   * @abstract
   * @returns {boolean} Whether the subclass's track handles are bound.
   */
  @meta.abstract
  TracksReady() {}
}
