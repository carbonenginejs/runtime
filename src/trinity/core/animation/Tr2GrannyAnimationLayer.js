// Source: trinity/trinity/Tr2GrannyAnimationLayer.h
// Source: trinity/trinity/Tr2GrannyAnimationLayer.cpp
import { meta } from "#schema";
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
@meta.define({ className: "Tr2GrannyAnimationLayer", family: "trinityCore/animation" })
export class Tr2GrannyAnimationLayer
{

  /** Carbon m_name (public, Tr2GrannyAnimationLayer.h:106). */
  name = "";

  /** Carbon m_layerWeight. */
  weight = 1;

  /** Whether the layer is unmasked (the base layer, or AddAllBones). */
  allBones = false;

  /** Carbon m_bones: bone names the layer's mask admits. */
  bones = new Set();

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
   * JS queue. Negative speed plays in reverse in this port where Carbon
   * clamps it to 0 (animation.cpp:635-639), so it is timed by |speed|.
   * A request whose animation has no positive duration contributes 0.
   *
   * @returns {number} Remaining seconds; Infinity when a player never ends.
   */
  @meta.blue.method
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
      const speed = Math.abs(request.speed);
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
    if (request.stopAt !== undefined)
    {
      return { explicit: true, value: request.stopAt };
    }
    const natural = request.loopCount > 0 && speed > 0 ? duration * request.loopCount / speed : NEVER;
    return { explicit: request.loopCount > 0 && !!request.clearWhenDone, value: natural };
  }

  /**
   * Finishes the playing animation at the end of its current loop and drops
   * the chained requests (Tr2GrannyAnimationLayer.cpp:410-441).
   *
   * Adapted: the chained requests are the JS queue's tail, so they are dropped
   * with the pending queue; Carbon keeps already-created chained players.
   */
  @meta.blue.method
  @meta.adapted
  EndAnimation()
  {
    const request = this.queue[0];
    this.queue.splice(1);
    if (!request?.animation)
    {
      return;
    }
    const duration = Math.max(0, CjsGrannyCurves.getAnimationDuration(request.animation));
    if (duration > 0)
    {
      const localTime = Math.max(0, request.elapsed) * Math.abs(request.speed);
      request.loopCount = Math.floor(localTime / duration) + 1;
    }
  }

  /**
   * Stops all animations, current and queued, `delay` seconds from now
   * (Tr2GrannyAnimationLayer.cpp:460-475). A non-positive delay removes the
   * active animation immediately; a positive delay pins its stop time.
   *
   * Adapted: the single active request carries the pinned stop as `stopAt`
   * in its own elapsed seconds, with the pending queue dropped.
   */
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  ClearAnimations()
  {
    this.queue.length = 0;
  }

  /** Carbon GetLayerWeight (Tr2GrannyAnimationLayer.cpp:1071-1074). */
  @meta.blue.method
  @meta.implemented
  GetLayerWeight()
  {
    return this.weight;
  }

  /** Carbon SetLayerWeight (Tr2GrannyAnimationLayer.cpp:1076-1079). */
  @meta.blue.method
  @meta.implemented
  SetLayerWeight(layerWeight)
  {
    this.weight = Number(layerWeight) || 0;
  }

  /** Carbon SetControlParam (Tr2GrannyAnimationLayer.cpp:1081-1085). */
  @meta.blue.method
  @meta.implemented
  SetControlParam(controlParam)
  {
    this.controlParamTarget = Number(controlParam) || 0;
    this.controlParamEnabled = true;
  }

  /** Carbon SetControlParamSkewRate (Tr2GrannyAnimationLayer.cpp:1087-1090). */
  @meta.blue.method
  @meta.implemented
  SetControlParamSkewRate(skewRate)
  {
    this.controlParamSkewRate = Number(skewRate) || 0;
  }

  /**
   * Admits a bone to the layer mask (Tr2GrannyAnimationLayer.cpp:929-970).
   *
   * Adapted: the mask is a name set resolved at sampling time, so no bone
   * index lookup is needed here.
   */
  @meta.blue.method
  @meta.adapted
  AddBone(_grannyAnimation, name)
  {
    this.bones.add(String(name ?? ""));
  }

  /**
   * Admits every bone (Tr2GrannyAnimationLayer.cpp:972-982).
   *
   * Adapted: a flag rather than Carbon's snapshot of the current bone list,
   * so bones of a later-loaded rig are admitted too.
   */
  @meta.blue.method
  @meta.adapted
  AddAllBones(_grannyAnimation)
  {
    this.allBones = true;
  }

  /** Removes a bone from the layer mask (Tr2GrannyAnimationLayer.cpp:1029-1069). */
  @meta.blue.method
  @meta.adapted
  RemoveBone(_grannyAnimation, name)
  {
    return this.bones.delete(String(name ?? ""));
  }

  /** Not ported: queueing lives in Tr2GrannyAnimation._playLayer. */
  @meta.blue.method
  @meta.notImplemented
  PlayAnimation(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.PlayAnimation is not implemented in CarbonEngineJS; use Tr2GrannyAnimation.PlayLayerAnimation.");
  }

  /** Not ported: queueing lives in Tr2GrannyAnimation._playLayer. */
  @meta.blue.method
  @meta.notImplemented
  QueueAnimation(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.QueueAnimation is not implemented in CarbonEngineJS.");
  }

  /** Not ported: the layer holds no absolute animation clock in this port. */
  @meta.blue.method
  @meta.notImplemented
  GetAnimationChainCompleteTime(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.GetAnimationChainCompleteTime is not implemented in CarbonEngineJS.");
  }

  /** Not ported: no cmf::AnimationSequencer; the owner rebuilds rig state. */
  @meta.blue.method
  @meta.notImplemented
  InitializeAnimationLayer(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.InitializeAnimationLayer is not implemented in CarbonEngineJS.");
  }

  /** Not ported: requests are consumed by Tr2GrannyAnimation._advanceLayer. */
  @meta.blue.method
  @meta.notImplemented
  ConsumeAnimationQueue(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.ConsumeAnimationQueue is not implemented in CarbonEngineJS.");
  }

  /** Not ported: no sequencer or Granny controls to release. */
  @meta.blue.method
  @meta.notImplemented
  Cleanup(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.Cleanup is not implemented in CarbonEngineJS.");
  }

  /** Not ported: sampling lives in Tr2GrannyAnimation._sampleLayer. */
  @meta.blue.method
  @meta.notImplemented
  SampleAnimation(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.SampleAnimation is not implemented in CarbonEngineJS.");
  }

  /** Not ported: track masks are not decoded. */
  @meta.blue.method
  @meta.notImplemented
  ExtractTrackMask(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.ExtractTrackMask is not implemented in CarbonEngineJS.");
  }

  /** Not ported: pause is owner-wide (Tr2GrannyAnimation.TogglePauseAnimations). */
  @meta.blue.method
  @meta.notImplemented
  TogglePauseAnimation(..._args)
  {
    throw new Error("Tr2GrannyAnimationLayer.TogglePauseAnimation is not implemented in CarbonEngineJS.");
  }

  /** Carbon private GetLayerAnimationTime (cpp:183-190). Not ported: no layer clock. */
  @meta.notImplemented
  _GetLayerAnimationTime()
  {
    throw new Error("Tr2GrannyAnimationLayer.GetLayerAnimationTime is not implemented in CarbonEngineJS.");
  }

  /** Carbon private FreeCompletedControls. Not ported: _advanceLayer retires requests. */
  @meta.notImplemented
  _FreeCompletedControls()
  {
    throw new Error("Tr2GrannyAnimationLayer.FreeCompletedControls is not implemented in CarbonEngineJS.");
  }

  /** Carbon private IsUsingCMF. Not ported: one decoded-payload path only. */
  @meta.notImplemented
  _IsUsingCMF()
  {
    throw new Error("Tr2GrannyAnimationLayer.IsUsingCMF is not implemented in CarbonEngineJS.");
  }

  /** Carbon private UpdateControlParam (cpp:1092-1125). Not ported: _advanceLayer skews it. */
  @meta.notImplemented
  _UpdateControlParam()
  {
    throw new Error("Tr2GrannyAnimationLayer.UpdateControlParam is not implemented in CarbonEngineJS.");
  }

  /** Carbon private RegisterTextTracks (Granny-only). Not ported. */
  @meta.notImplemented
  _RegisterTextTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.RegisterTextTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private RegisterMorphTracks. Not ported: _sampleMorphs decodes per sample. */
  @meta.notImplemented
  _RegisterMorphTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.RegisterMorphTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private ClearTextTracks (Granny-only). Not ported. */
  @meta.notImplemented
  _ClearTextTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.ClearTextTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private ClearMorphTracks. Not ported. */
  @meta.notImplemented
  _ClearMorphTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.ClearMorphTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private SampleTextTracks (Granny-only). Not ported. */
  @meta.notImplemented
  _SampleTextTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.SampleTextTracks is not implemented in CarbonEngineJS.");
  }

  /** Carbon private SampleMorphTracks. Not ported: _sampleMorphs on the owner. */
  @meta.notImplemented
  _SampleMorphTracks()
  {
    throw new Error("Tr2GrannyAnimationLayer.SampleMorphTracks is not implemented in CarbonEngineJS.");
  }

}
