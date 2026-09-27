// Source: audio/src/AudObstructionOcclusion.h + AudObstructionOcclusion.cpp
// Headless behavior port. The host supplies blockage; this class performs no
// ray casting and leaves the audible obstruction/occlusion law to the backend.

import { LISTENER_GAME_OBJ_ID } from "../SoundPrioritization.js";
import { EmitterState } from "./EmitterState.js";

const DEFAULT_FADE_RATE = 1;

function NowSeconds()
{
  return (globalThis.performance?.now() ?? Date.now()) / 1000;
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
  _audioManager;

  _emitters = new Map();

  _fadeRate = DEFAULT_FADE_RATE;

  _hasUpdated = false;

  _lastUpdateTime = 0;

  _enabled = true;

  _now;

  /** Creates Carbon's obstruction/occlusion collaborator for one manager. */
  constructor(audioManager, now = NowSeconds)
  {
    this._audioManager = audioManager;
    this._now = now;
  }

  /** Advances every fade and sends changed awake-emitter values. */
  Update(backend)
  {
    if (!this._audioManager
      || this._audioManager.GetState?.() !== "enabled")
    {
      return;
    }

    const now = Number(this._now());
    const deltaSeconds = this._hasUpdated && Number.isFinite(now)
      ? Math.max(0, now - this._lastUpdateTime)
      : 0;

    this._lastUpdateTime = Number.isFinite(now) ? now : NowSeconds();
    this._hasUpdated = true;

    for (const [ emitterID, state ] of this._emitters)
    {
      let culled = false;
      const exists = this._audioManager.WithCallbackGameObject?.(
        emitterID,
        emitter =>
        {
          culled = emitter.IsCulled?.() === true;
        },
      ) === true;

      if (!exists)
      {
        this._emitters.delete(emitterID);
        continue;
      }

      const obstructionChanged = state.obstruction.Advance(
        deltaSeconds,
        this._fadeRate,
      );
      const occlusionChanged = state.occlusion.Advance(
        deltaSeconds,
        this._fadeRate,
      );

      if (culled)
      {
        state.needsSend = true;
        continue;
      }
      if (obstructionChanged || occlusionChanged || state.needsSend)
      {
        state.needsSend = !this._SendToBackend(
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
    if (!this._enabled
      || !this._audioManager
      || this._audioManager.GetState?.() !== "enabled"
      || emitterID === LISTENER_GAME_OBJ_ID
      || this._audioManager.WithCallbackGameObject?.(
        emitterID,
        () => {},
      ) !== true)
    {
      return false;
    }

    let state = this._emitters.get(emitterID);
    const isNewEmitter = !state;

    if (!state)
    {
      state = new EmitterState();
      this._emitters.set(emitterID, state);
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
    const acousticsEnabled = this._audioManager
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
    return this._emitters.get(emitterID)?.occlusion.currentValue ?? 0;
  }

  /** Drops one emitter immediately when its game object is unregistered. */
  RemoveEmitter(emitterID)
  {
    this._emitters.delete(emitterID);
  }

  /** Forgets every emitter and resets the fade clock. */
  Reset()
  {
    this._emitters.clear();
    this._hasUpdated = false;
    this._lastUpdateTime = 0;
  }

  /** Fades every tracked emitter back to clear. */
  ClearAll()
  {
    for (const state of this._emitters.values())
    {
      state.obstruction.SetTarget(0);
      state.occlusion.SetTarget(0);
    }
  }

  /** Returns whether new caller-supplied targets are accepted. */
  IsEnabled()
  {
    return this._enabled;
  }

  /** Enables target input or fades every existing target to clear. */
  SetEnabled(value)
  {
    const enabled = Boolean(value);

    if (this._enabled === enabled)
    {
      return;
    }
    this._enabled = enabled;
    if (!enabled)
    {
      this.ClearAll();
    }
  }

  /** Returns the linear fade speed in value units per second. */
  GetFadeRate()
  {
    return this._fadeRate;
  }

  /** Stores Carbon's nonnegative linear fade speed. */
  SetFadeRate(value)
  {
    this._fadeRate = Math.max(0, Number(value));
  }

  /** Delivers one live value through the optional Wwise-shaped backend seam. */
  _SendToBackend(backend, emitterID, state)
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
