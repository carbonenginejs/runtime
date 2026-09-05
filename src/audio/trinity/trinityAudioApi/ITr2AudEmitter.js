// Source: trinityaudioapi/include/ITr2AudEmitter.h
//
// The contract audio2 exposes for an audio emitter. Carbon makes all fourteen
// methods PURE VIRTUAL; AudEmitter (via AudGameObjResource) implements every
// one, yet until this file existed the interface was only a name in five
// schema fields, so callers hedged the surface one method at a time.
//
// The brand plumbing is written longhand rather than imported from the trinity
// contract family: the audio layer may not import trinity (layers.json), and
// global/contracts (ITr2BoundingBox.js) establishes exactly this local idiom.
//
// Signature notes against the header:
// - Carbon splits std::string (name) from std::wstring (prefix, event, RTPC
//   and switch names); JavaScript has one string type.
// - `Initialize` is @impl.adapted in AudGameObjResource: one method covers
//   Carbon's no-arg and three-arg overloads and returns a boolean that two
//   call sites (AudioGameObject, EveChildAudio) rely on.
// - `SendEvent` returns the playing id (Carbon's unsigned int), 0 when
//   invalid.

import { CjsSchema, impl } from "#schema";


const ITR2_AUD_EMITTER = Symbol.for("carbonenginejs.contract.ITr2AudEmitter");

const EMITTER_METHODS = [
  "Initialize", "SetPosition", "SetName", "SetPrefix", "SendEvent", "SetSwitch",
  "SetRTPC", "SetAttenuationScalingFactor", "GetName", "SetVisibility", "Mute",
  "Unmute", "ForceCullingStateChange", "ReleaseForcedCullingState"
];


/** Contract for an audio emitter the runtime can position, name and drive. */
export class ITr2AudEmitter
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_AUD_EMITTER] === true;
  }

  /**
   * Prepares the emitter with its name, event prefix and initial position.
   *
   * @param {string} _name The emitter's name.
   * @param {string} _prefix The event-name prefix.
   * @param {Float32Array} _position Initial world position.
   * @returns {boolean} Whether initialization succeeded.
   */
  Initialize(_name, _prefix, _position)
  {
    throw new Error("ITr2AudEmitter.Initialize must be implemented by an audio emitter.");
  }

  /**
   * Sets the emitter's orientation and position.
   *
   * @param {Float32Array} _front Forward vector.
   * @param {Float32Array} _top Up vector.
   * @param {Float32Array} _position World position.
   * @returns {number} A status code.
   */
  SetPosition(_front, _top, _position)
  {
    throw new Error("ITr2AudEmitter.SetPosition must be implemented by an audio emitter.");
  }

  /**
   * Renames the emitter.
   *
   * @param {string} _name The new name.
   */
  SetName(_name)
  {
    throw new Error("ITr2AudEmitter.SetName must be implemented by an audio emitter.");
  }

  /**
   * Sets the event-name prefix.
   *
   * @param {string} _prefix The new prefix.
   */
  SetPrefix(_prefix)
  {
    throw new Error("ITr2AudEmitter.SetPrefix must be implemented by an audio emitter.");
  }

  /**
   * Posts a one-shot event on this emitter.
   *
   * @param {string} _name The event's name.
   * @param {boolean} [_bypassPrefix] Whether to skip the prefix.
   * @returns {number} The playing id, or 0 when the post failed.
   */
  SendEvent(_name, _bypassPrefix = false)
  {
    throw new Error("ITr2AudEmitter.SendEvent must be implemented by an audio emitter.");
  }

  /**
   * Sets one switch group to a state.
   *
   * @param {string} _switchGroup The group's name.
   * @param {string} _switchState The state's name.
   * @returns {boolean} Whether the switch applied.
   */
  SetSwitch(_switchGroup, _switchState)
  {
    throw new Error("ITr2AudEmitter.SetSwitch must be implemented by an audio emitter.");
  }

  /**
   * Sets one RTPC value.
   *
   * @param {string} _rtpcName The parameter's name.
   * @param {number} _rtpcValue Its new value.
   * @returns {boolean} Whether the parameter applied.
   */
  SetRTPC(_rtpcName, _rtpcValue)
  {
    throw new Error("ITr2AudEmitter.SetRTPC must be implemented by an audio emitter.");
  }

  /**
   * Scales the emitter's attenuation radius.
   *
   * @param {number} _scalingFactor The scaling factor.
   * @returns {boolean} Whether the factor applied.
   */
  SetAttenuationScalingFactor(_scalingFactor)
  {
    throw new Error("ITr2AudEmitter.SetAttenuationScalingFactor must be implemented by an audio emitter.");
  }

  /**
   * The emitter's name.
   *
   * @returns {string} The name.
   */
  GetName()
  {
    throw new Error("ITr2AudEmitter.GetName must be implemented by an audio emitter.");
  }

  /**
   * Tells the emitter whether its owner is visible.
   *
   * @param {boolean} _visible Whether the owner is visible.
   */
  SetVisibility(_visible)
  {
    throw new Error("ITr2AudEmitter.SetVisibility must be implemented by an audio emitter.");
  }

  /** Silences the emitter. */
  Mute()
  {
    throw new Error("ITr2AudEmitter.Mute must be implemented by an audio emitter.");
  }

  /** Restores the emitter after Mute. */
  Unmute()
  {
    throw new Error("ITr2AudEmitter.Unmute must be implemented by an audio emitter.");
  }

  /** Forces the emitter's culling state to be re-evaluated. */
  ForceCullingStateChange()
  {
    throw new Error("ITr2AudEmitter.ForceCullingStateChange must be implemented by an audio emitter.");
  }

  /** Releases a forced culling state. */
  ReleaseForcedCullingState()
  {
    throw new Error("ITr2AudEmitter.ReleaseForcedCullingState must be implemented by an audio emitter.");
  }
}


Object.defineProperty(ITr2AudEmitter.prototype, ITR2_AUD_EMITTER, { value: true });
for (const name of EMITTER_METHODS) CjsSchema.decorateMethod(ITr2AudEmitter, name, impl.abstract);
CjsSchema.define(ITr2AudEmitter, { className: "ITr2AudEmitter", family: "trinityAudioApi" });


/**
 * Adds the ITr2AudEmitter contract without replacing an existing model base.
 *
 * A contract method is copied onto the subclass ONLY where nothing in the
 * base chain already answers it - AudGameObjResource implements most of the
 * surface below the mixin, and a copied throwing body would shadow those
 * working implementations.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withITr2AudEmitter(Base)
{
  const Emitter = class extends Base
  {
  };

  for (const name of EMITTER_METHODS)
  {
    if (name in Emitter.prototype) continue;

    Object.defineProperty(Emitter.prototype, name, {
      value: ITr2AudEmitter.prototype[name],
      writable: true,
      configurable: true
    });
  }

  Object.defineProperty(Emitter.prototype, ITR2_AUD_EMITTER, { value: true });
  for (const name of EMITTER_METHODS) CjsSchema.decorateMethod(Emitter, name, impl.abstract);

  return Emitter;
}
