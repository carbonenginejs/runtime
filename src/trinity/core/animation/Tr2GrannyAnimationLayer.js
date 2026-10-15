// Source: trinity/trinity/Tr2GrannyAnimationLayer.h
// Source: trinity/trinity/Tr2GrannyAnimationLayer.cpp
import { meta, blue } from "#schema";
import { CjsGrannyCurves } from "../../curves/track/CjsGrannyCurves.js";


/** Carbon `cmf::AnimationPlayer::GetDurationLeft`'s "never ends" value (mesh/src/cmf/animation.cpp:690-693). */
const NEVER = Infinity;


/**
 * One animation layer of a Tr2GrannyAnimation: the base layer, or a named
 * layer masked to a bone set. Not Blue-exposed in Carbon; reached through
 * `Tr2GrannyAnimation::GetAnimationLayer` (Tr2GrannyAnimation.cpp:305-319).
 *
 * The browser port keeps sampling on the owning Tr2GrannyAnimation, which
 * reads the public fields below; Carbon's cmf::AnimationSequencer is modelled
 * by `queue`, whose head is the one playing request and whose tail are the
 * chained requests. Each request is `{ name, animation, loopCount, elapsed,
 * speed, clearWhenDone, held, stopAt? }`, `elapsed` counting unscaled layer
 * seconds since its start (negative while delayed).
 */
@blue.define("Tr2GrannyAnimationLayer")
export class Tr2GrannyAnimationLayer
{

  /** Carbon m_name (public, Tr2GrannyAnimationLayer.h:106). */
  name = "";

  /** Carbon m_layerWeight. */
  weight = 1;

  /** Carbon m_bones (h:143): the bone names added to the layer, applied again when the rig is built. */
  bones = [];

  /**
   * Carbon m_defaultBoneWeight (h:148): the weight every bone starts at when
   * the rig is built - 1 for the base layer, 0 for added layers.
   */
  defaultBoneWeight = 0;

  /** Carbon m_trackMaskName (h:164): the skeleton bone mask this layer blends by, or null. */
  trackMaskName = null;

  /**
   * Carbon m_boneMask.boneWeights (h:166): one weight per skeleton bone, or
   * null while the layer has no skeleton.
   *
   * @type {Float32Array|null}
   */
  boneMask = null;

  /** The playing request followed by chained requests (see the class JSDoc). */
  queue = [];

  /** Carbon m_controlParam. */
  controlParam = 0;

  /** Carbon m_controlParamTarget. */
  controlParamTarget = 0;

  /** Carbon m_controlParamEnabled. */
  controlParamEnabled = false;

  /** Carbon m_skewRate. */
  controlParamSkewRate = 0;

  /**
   * Seconds until the layer's animations reach the end of their CURRENT loop,
   * the maximum over its players (Tr2GrannyAnimationLayer.cpp:836-861).
   *
   * Carbon truncates each player's loop count to `loopIndex + 1` and reads
   * `GetDurationLeft`. Quirk (mesh/src/cmf/animation.cpp:602-607): a player
   * with an EXPLICIT stop time - a finite `clearWhenDone` play
   * (Tr2GrannyAnimationLayer.cpp:257-260) or StopAnimations - ignores the
   * truncation, so it reports the time to its pinned stop, all remaining
   * loops included. An infinite loop reports the end of the current loop.
   * Zero speed never ends (animation.cpp:690-693).
   *
   * Adapted: a chained request here starts when its predecessor finishes,
   * not when Carbon's chaining truncated it, so its start is derived from the
   * JS queue. A request whose animation has no positive duration contributes 0.
   *
   * @returns {number} Remaining seconds; Infinity when a player never ends.
   */
  @blue.method
  @meta.adapted
  GetAnimationRemainingTime()
  {
    let maxRemaining = 0;
    // Seconds from now until the request under inspection starts playing.
    let startsIn = 0;
    for (let index = 0; index < this.queue.length; index++)
    {
      const request = this.queue[index];
      const elapsed = index === 0 ? request.elapsed : request.elapsed - startsIn;
      const duration = request.animation ? Math.max(0, CjsGrannyCurves.getAnimationDuration(request.animation)) : 0;
      const speed = request.speed;
      const loops = request.loopCount;
      const stop = Tr2GrannyAnimationLayer._getStopElapsed(request, duration, speed);

      let remaining = 0;
      if (speed <= 0)
      {
        remaining = NEVER;
      }
      else if (duration > 0)
      {
        if (stop.explicit)
        {
          remaining = Math.max(0, stop.value - elapsed);
        }
        else
        {
          // cmf AnimationPlayer::GetLoopIndex (animation.cpp:702-716), int32 truncation.
          const played = elapsed * speed;
          const loopIndex = loops > 0 && played >= duration * loops
            ? loops - 1
            : Math.trunc(played / duration);
          remaining = Math.max(0, duration * (Math.max(0, loopIndex) + 1) / speed - elapsed);
        }
      }
      if (remaining > maxRemaining)
      {
        maxRemaining = remaining;
      }
      // The next request begins once this one is retired by _advanceLayer.
      startsIn = Math.max(0, stop.value - elapsed);
    }
    return maxRemaining;
  }

  /**
   * When a request stops, in its own elapsed seconds, and whether that stop is
   * Carbon-explicit (pinned) rather than derived from the loop count
   * (animation.cpp:602-616; Tr2GrannyAnimationLayer.cpp:257-260).
   */
  static _getStopElapsed(request, duration, speed)
  {
    // A finite clear-when-done play is pinned at play time, so every explicit stop is `stopAt`.
    if (request.stopAt !== undefined)
    {
      return { explicit: true, value: request.stopAt };
    }
    const natural = request.loopCount > 0 && speed > 0 ? duration * request.loopCount / speed : NEVER;
    return { explicit: false, value: natural };
  }

  /**
   * Ends every player at the end of its current loop
   * (Tr2GrannyAnimationLayer.cpp:410-441): each player's loop count becomes
   * its loop index + 1. Carbon clears only m_animationQueue, the requests not
   * yet handed to the sequencer; players chained by an enqueueing play stay
   * and run once each.
   *
   * Adapted: Carbon's players are the JS queue, chained ones included, so
   * nothing is dropped; this port has no separate pre-sequencer queue.
   */
  @blue.method
  @meta.adapted
  EndAnimation()
  {
    for (const request of this.queue)
    {
      const duration = request.animation ? Math.max(0, CjsGrannyCurves.getAnimationDuration(request.animation)) : 0;
      const loopIndex = Tr2GrannyAnimationLayer._GetLoopIndex(request, duration);
      if (loopIndex >= 0) request.loopCount = loopIndex + 1;
    }
  }

  /**
   * cmf::AnimationPlayer::GetLoopIndex (animation.cpp:702-716): the loop a
   * request is in, clamped to its last loop once finished; 0 before it starts.
   *
   * @param {object} request A queue request.
   * @param {number} duration Its animation's duration in seconds.
   * @returns {number} The loop index, or -1 when the animation has no positive duration.
   */
  static _GetLoopIndex(request, duration)
  {
    // Carbon divides by the loop duration, undefined at 0; speed is never negative (SetSpeed clamps).
    if (!(duration > 0)) return -1;
    const played = Math.max(0, request.elapsed) * request.speed;
    if (request.loopCount > 0 && played >= duration * request.loopCount) return request.loopCount - 1;
    return Math.trunc(played / duration);
  }

  /**
   * Stops all animations, current and queued, `delay` seconds from now
   * (Tr2GrannyAnimationLayer.cpp:460-475). A non-positive delay removes the
   * active animation immediately; a positive delay pins its stop time.
   *
   * Adapted: the single active request carries the pinned stop as `stopAt`
   * in its own elapsed seconds, with the pending queue dropped.
   */
  @blue.method
  @meta.adapted
  StopAnimations(delay = 0)
  {
    const request = this.queue[0];
    this.queue.length = 0;
    const stopDelay = Number(delay) || 0;
    if (request && stopDelay > 0)
    {
      // Carbon: player.SetStopTime(animationTime + delay) - the layer clock
      // and request.elapsed advance in the same unscaled seconds.
      request.stopAt = request.elapsed + stopDelay;
      this.queue.push(request);
    }
  }

  /** Drops every animation, playing and queued (Tr2GrannyAnimationLayer.cpp:495-525). */
  @blue.method
  @meta.implemented
  ClearAnimations()
  {
    this.queue.length = 0;
  }

  /** Carbon GetLayerWeight (Tr2GrannyAnimationLayer.cpp:1071-1074). */
  @blue.method
  @meta.implemented
  GetLayerWeight()
  {
    return this.weight;
  }

  /** Carbon SetLayerWeight (Tr2GrannyAnimationLayer.cpp:1076-1079). */
  @blue.method
  @meta.implemented
  SetLayerWeight(layerWeight)
  {
    this.weight = Number(layerWeight) || 0;
  }

  /** Carbon SetControlParam (Tr2GrannyAnimationLayer.cpp:1081-1085). */
  @blue.method
  @meta.implemented
  SetControlParam(controlParam)
  {
    this.controlParamTarget = Number(controlParam) || 0;
    this.controlParamEnabled = true;
  }

  /** Carbon SetControlParamSkewRate (Tr2GrannyAnimationLayer.cpp:1087-1090). */
  @blue.method
  @meta.implemented
  SetControlParamSkewRate(skewRate)
  {
    this.controlParamSkewRate = Number(skewRate) || 0;
  }

  /**
   * Carbon AddBone (Tr2GrannyAnimationLayer.cpp:929-970): records the name,
   * and once the layer has a skeleton sets that bone's weight to 1.
   *
   * @param {import("./Tr2GrannyAnimation.js").Tr2GrannyAnimation} grannyAnimation The owning animation.
   * @param {string} name Bone name.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  AddBone(grannyAnimation, name)
  {
    this.bones.push(name);
    if (!this.boneMask) return;
    const boneIndex = grannyAnimation.FindBoneByName(name);
    if (boneIndex === -1) return;
    this.boneMask[boneIndex] = 1;
  }

  /**
   * Carbon AddAllBones (Tr2GrannyAnimationLayer.cpp:972-982): AddBone for
   * each bone the owner lists now. Before the rig is built the list is empty.
   *
   * @param {import("./Tr2GrannyAnimation.js").Tr2GrannyAnimation} grannyAnimation The owning animation.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  AddAllBones(grannyAnimation)
  {
    for (const name of grannyAnimation.GetAnimationBoneList())
    {
      this.AddBone(grannyAnimation, name);
    }
  }

  /**
   * Carbon RemoveBone (Tr2GrannyAnimationLayer.cpp:1029-1069): forgets every
   * copy of the name, and once the layer has a skeleton sets that bone's
   * weight to 0, whether the weight came from AddBone or the track mask.
   *
   * @param {import("./Tr2GrannyAnimation.js").Tr2GrannyAnimation} grannyAnimation The owning animation.
   * @param {string} name Bone name.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  RemoveBone(grannyAnimation, name)
  {
    for (let index = this.bones.length - 1; index >= 0; index--)
    {
      if (this.bones[index] === name) this.bones.splice(index, 1);
    }
    if (!this.boneMask) return;
    const boneIndex = grannyAnimation.FindBoneByName(name);
    if (boneIndex === -1) return;
    this.boneMask[boneIndex] = 0;
  }

  /** Not ported: queueing lives in Tr2GrannyAnimation._playLayer. */
  @blue.method
  @meta.notImplemented
  PlayAnimation(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.PlayAnimation is not implemented in CarbonEngineJS; use Tr2GrannyAnimation.PlayLayerAnimation.");
  }

  /** Not ported: queueing lives in Tr2GrannyAnimation._playLayer. */
  @blue.method
  @meta.notImplemented
  QueueAnimation(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.QueueAnimation is not implemented in CarbonEngineJS.");
  }

  /** Not ported: the layer holds no absolute animation clock in this port. */
  @blue.method
  @meta.notImplemented
  GetAnimationChainCompleteTime(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.GetAnimationChainCompleteTime is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon InitializeAnimationLayer (Tr2GrannyAnimationLayer.cpp:85-150),
   * run when the owner's rig is built and when a layer is added to a built
   * rig: the mask comes from the track mask when the layer has one, else
   * every bone starts at the default weight. Then each added bone is set to
   * the DEFAULT weight, not 1 (cpp:112-119), so on an added layer a bone
   * named before the rig was built does not move (CE-170).
   *
   * Adapted: the cmf::AnimationSequencer is not created; the layer's queue
   * stands in for it and is left as it is.
   *
   * @param {import("./Tr2GrannyAnimation.js").Tr2GrannyAnimation} grannyAnimation The owning animation.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  InitializeAnimationLayer(grannyAnimation)
  {
    const boneCount = grannyAnimation.GetAnimationBoneList().length;
    if (!boneCount) return;
    if (this.trackMaskName !== null)
    {
      this.ExtractTrackMask(grannyAnimation, this.trackMaskName);
    }
    else
    {
      this.boneMask = new Float32Array(boneCount).fill(this.defaultBoneWeight); // alloc: once per rig build.
    }
    for (const name of this.bones)
    {
      const boneIndex = grannyAnimation.FindBoneByName(name);
      if (boneIndex !== -1) this.boneMask[boneIndex] = this.defaultBoneWeight;
    }
  }

  /** Not ported: requests are consumed by Tr2GrannyAnimation._advanceLayer. */
  @blue.method
  @meta.notImplemented
  ConsumeAnimationQueue(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.ConsumeAnimationQueue is not implemented in CarbonEngineJS.");
  }

  /** Not ported: no sequencer or Granny controls to release. */
  @blue.method
  @meta.notImplemented
  Cleanup(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.Cleanup is not implemented in CarbonEngineJS.");
  }

  /** Not ported: sampling lives in Tr2GrannyAnimation._sampleLayer. */
  @blue.method
  @meta.notImplemented
  SampleAnimation(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.SampleAnimation is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon ExtractTrackMask (Tr2GrannyAnimationLayer.cpp:986-1024): keeps the
   * name and, once there is a skeleton, REPLACES the whole mask with the
   * skeleton's named mask - on the CMF branch the skeleton's bone mask
   * (cmf::ExtractBoneWeights), on the Granny branch each bone's extended-data
   * member of that name (GrannyExtractTrackMask). Weights set earlier by
   * AddBone are lost; a bone the mask does not name weighs 0.
   *
   * Adapted: the weights are a Float32Array by bone index rather than a
   * cmf::BoneWeights or granny_track_mask.
   *
   * @param {import("./Tr2GrannyAnimation.js").Tr2GrannyAnimation} grannyAnimation The owning animation.
   * @param {string} name Track mask name.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  ExtractTrackMask(grannyAnimation, name)
  {
    this.trackMaskName = name;
    const weights = grannyAnimation._ExtractTrackMaskWeights(name);
    if (!weights) return;
    this.boneMask = weights;
  }

  /** Not ported: pause is owner-wide (Tr2GrannyAnimation.TogglePauseAnimations). */
  @blue.method
  @meta.notImplemented
  TogglePauseAnimation(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.TogglePauseAnimation is not implemented in CarbonEngineJS.");
  }

  /** Carbon private GetLayerAnimationTime (cpp:183-190). Not ported: no layer clock. */
  @meta.notImplemented
  @meta.renamed("GetLayerAnimationTime")
  _GetLayerAnimationTime()
  {
    throw new Error("Tr2GrannyAnimationLayer.GetLayerAnimationTime is not implemented in CarbonEngineJS.");
  }

  /** Carbon private FreeCompletedControls. Not ported: _advanceLayer retires requests. */
  @meta.notImplemented
  @meta.renamed("FreeCompletedControls")
  _FreeCompletedControls()
  {
    throw new Error("Tr2GrannyAnimationLayer.FreeCompletedControls is not implemented in CarbonEngineJS.");
  }

  /** Carbon private IsUsingCMF. Not ported: one decoded-payload path only. */
  @meta.notImplemented
  @meta.renamed("IsUsingCMF")
  _IsUsingCMF()
  {
    throw new Error("Tr2GrannyAnimationLayer.IsUsingCMF is not implemented in CarbonEngineJS.");
  }

  /** Carbon private UpdateControlParam (cpp:1092-1125). Not ported: _advanceLayer skews it. */
  @meta.notImplemented
  @meta.renamed("UpdateControlParam")
  _UpdateControlParam()
  {
    throw new Error("Tr2GrannyAnimationLayer.UpdateControlParam is not implemented in CarbonEngineJS.");
  }

  /** Carbon private RegisterTextTracks (Granny-only). Not ported. */
  @meta.notImplemented
  @meta.renamed("RegisterTextTracks")
  _RegisterTextTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.RegisterTextTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private RegisterMorphTracks. Not ported: _sampleMorphs decodes per sample. */
  @meta.notImplemented
  @meta.renamed("RegisterMorphTracks")
  _RegisterMorphTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.RegisterMorphTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private ClearTextTracks (Granny-only). Not ported. */
  @meta.notImplemented
  @meta.renamed("ClearTextTracks")
  _ClearTextTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.ClearTextTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private ClearMorphTracks. Not ported. */
  @meta.notImplemented
  @meta.renamed("ClearMorphTracks")
  _ClearMorphTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.ClearMorphTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private SampleTextTracks (Granny-only). Not ported. */
  @meta.notImplemented
  @meta.renamed("SampleTextTracks")
  _SampleTextTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.SampleTextTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private SampleMorphTracks. Not ported: _sampleMorphs on the owner. */
  @meta.notImplemented
  @meta.renamed("SampleMorphTracks")
  _SampleMorphTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.SampleMorphTracks is not implemented in CarbonEngineJS.");
  }

}
