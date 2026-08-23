// Source: audio/src/AudObstructionOcclusion.h + AudObstructionOcclusion.cpp
// Headless behavior port. The host supplies blockage; this class performs no
// ray casting and leaves the audible obstruction/occlusion law to the backend.

import { LISTENER_GAME_OBJ_ID } from "./SoundPrioritization.js";

const DEFAULT_FADE_RATE = 1;

function NowSeconds()
{
  return (globalThis.performance?.now() ?? Date.now()) / 1000;
}

function ClampUnit(value)
{
  return Math.max(0, Math.min(1, Number(value)));
}

/** One obstruction or occlusion value fading towards an authored target. */
class FadingValue
{
  currentValue = 0;

  targetValue = 0;

  /** Clamps and stores the next fade target. */
  SetTarget(target)
  {
    this.targetValue = ClampUnit(target);
  }

  /** Advances linearly by one clock delta and reports a live-value change. */
  Advance(deltaSeconds, fadeRate)
  {
    if (this.currentValue === this.targetValue)
    {
      return false;
    }
    if (fadeRate <= 0)
    {
      this.currentValue = this.targetValue;
      return true;
    }

    const previous = this.currentValue;
    const step = fadeRate * deltaSeconds;

    if (previous > this.targetValue)
    {
      this.currentValue = Math.max(this.targetValue, previous - step);
    }
    else
    {
      this.currentValue = Math.min(this.targetValue, previous + step);
    }
    return this.currentValue !== previous;
  }

  /** Applies the target immediately for a newly tracked emitter. */
  SnapToTarget()
  {
    this.currentValue = this.targetValue;
  }
}

/** Obstruction/occlusion fade state retained for one registered emitter. */
class EmitterState
{
  obstruction = new FadingValue();

  occlusion = new FadingValue();

  needsSend = true;
}

/**
 * Owns Carbon's caller-supplied line-of-sight state and backend delivery.
 *
 * This collaborator is intentionally not exported from the package. Hosts use
 * the Carbon-facing AudManager methods; injected backends may implement
 * SetObjectObstructionAndOcclusion to realize the values.
 */
export class AudObstructionOcclusion
{
  #audioManager;

  #emitters = new Map();

  #fadeRate = DEFAULT_FADE_RATE;

  #hasUpdated = false;

  #lastUpdateTime = 0;

  #enabled = true;

  #now;

  /** Creates Carbon's obstruction/occlusion collaborator for one manager. */
  constructor(audioManager, now = NowSeconds)
  {
    this.#audioManager = audioManager;
    this.#now = now;
  }

  /** Advances every fade and sends changed awake-emitter values. */
  Update(backend)
  {
    if (!this.#audioManager
      || this.#audioManager.GetState?.() !== "enabled")
    {
      return;
    }

    const now = Number(this.#now());
    const deltaSeconds = this.#hasUpdated && Number.isFinite(now)
      ? Math.max(0, now - this.#lastUpdateTime)
      : 0;

    this.#lastUpdateTime = Number.isFinite(now) ? now : NowSeconds();
    this.#hasUpdated = true;

    for (const [ emitterID, state ] of this.#emitters)
    {
      let culled = false;
      const exists = this.#audioManager.WithCallbackGameObject?.(
        emitterID,
        emitter =>
        {
          culled = emitter.IsCulled?.() === true;
        },
      ) === true;

      if (!exists)
      {
        this.#emitters.delete(emitterID);
        continue;
      }

      const obstructionChanged = state.obstruction.Advance(
        deltaSeconds,
        this.#fadeRate,
      );
      const occlusionChanged = state.occlusion.Advance(
        deltaSeconds,
        this.#fadeRate,
      );

      if (culled)
      {
        state.needsSend = true;
        continue;
      }
      if (obstructionChanged || occlusionChanged || state.needsSend)
      {
        state.needsSend = !this.#SendToBackend(
          backend,
          emitterID,
          state,
        );
      }
    }
  }

  /** Sets the obstruction and occlusion targets for a registered emitter. */
  SetObstructionOcclusion(emitterID, obstruction, occlusion)
  {
    if (!this.#enabled
      || !this.#audioManager
      || this.#audioManager.GetState?.() !== "enabled"
      || emitterID === LISTENER_GAME_OBJ_ID
      || this.#audioManager.WithCallbackGameObject?.(
        emitterID,
        () => {},
      ) !== true)
    {
      return false;
    }

    let state = this.#emitters.get(emitterID);
    const isNewEmitter = !state;

    if (!state)
    {
      state = new EmitterState();
      this.#emitters.set(emitterID, state);
    }
    state.obstruction.SetTarget(obstruction);
    state.occlusion.SetTarget(occlusion);

    if (isNewEmitter)
    {
      state.obstruction.SnapToTarget();
      state.occlusion.SnapToTarget();
    }
    return true;
  }

  /** Maps caller-supplied blockage to Carbon's acoustics-aware targets. */
  SetEmitterLineOfSightBlockage(emitterID, blockage)
  {
    const acousticsEnabled = this.#audioManager
      ?.GetSpatialAudioGeometryEnabled?.() === true;

    return this.SetObstructionOcclusion(
      emitterID,
      0,
      acousticsEnabled ? 0 : blockage,
    );
  }

  /** Returns the live, mid-fade occlusion value for one emitter. */
  GetEmitterOcclusion(emitterID)
  {
    return this.#emitters.get(emitterID)?.occlusion.currentValue ?? 0;
  }

  /** Drops one emitter immediately when its game object is unregistered. */
  RemoveEmitter(emitterID)
  {
    this.#emitters.delete(emitterID);
  }

  /** Forgets every emitter and resets the fade clock. */
  Reset()
  {
    this.#emitters.clear();
    this.#hasUpdated = false;
    this.#lastUpdateTime = 0;
  }

  /** Fades every tracked emitter back to clear. */
  ClearAll()
  {
    for (const state of this.#emitters.values())
    {
      state.obstruction.SetTarget(0);
      state.occlusion.SetTarget(0);
    }
  }

  /** Returns whether new caller-supplied targets are accepted. */
  IsEnabled()
  {
    return this.#enabled;
  }

  /** Enables target input or fades every existing target to clear. */
  SetEnabled(value)
  {
    const enabled = Boolean(value);

    if (this.#enabled === enabled)
    {
      return;
    }
    this.#enabled = enabled;
    if (!enabled)
    {
      this.ClearAll();
    }
  }

  /** Returns the linear fade speed in value units per second. */
  GetFadeRate()
  {
    return this.#fadeRate;
  }

  /** Stores Carbon's nonnegative linear fade speed. */
  SetFadeRate(value)
  {
    this.#fadeRate = Math.max(0, Number(value));
  }

  /** Delivers one live value through the optional Wwise-shaped backend seam. */
  #SendToBackend(backend, emitterID, state)
  {
    if (typeof backend?.SetObjectObstructionAndOcclusion !== "function")
    {
      return false;
    }
    // Runtime-audio backend setters conventionally accept a void return and
    // reserve explicit false for rejection. A rejection retains needsSend so
    // the next Process retries, matching Carbon's failed AKRESULT behavior.
    return backend.SetObjectObstructionAndOcclusion(
      emitterID,
      LISTENER_GAME_OBJ_ID,
      state.obstruction.currentValue,
      state.occlusion.currentValue,
    ) !== false;
  }
}
