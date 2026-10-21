import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/ITr2AudEmitter.h
//
// The contract audio2 exposes for an audio emitter. Carbon makes all fourteen
// methods PURE VIRTUAL; AudEmitter (via AudGameObjResource) implements every
// one, yet until this file existed the interface was only a name in five
// schema fields, so callers hedged the surface one method at a time.
//
// The brand plumbing is written longhand rather than imported from the trinity
// contract family: the audio layer may not import trinity (layers.json), and
// global/interfaces (ITr2BoundingBox.js) establishes exactly this local idiom.
//
// Signature notes against the header:
// - Carbon splits std::string (name) from std::wstring (prefix, event, RTPC
//   and switch names); JavaScript has one string type.
// - Carbon's `Initialize(name, prefix, position)` is Initialize__WithParameters
//   here: JavaScript has no overloads, and the no-argument `Initialize` is
//   IInitialize's, which readers call. It returns nothing, as in Carbon.
// - `SendEvent` returns the playing id (Carbon's unsigned int), 0 when
//   invalid.

import { CjsSchema, meta, blue } from "#schema";


const EMITTER_METHODS = [
  "Initialize__WithParameters", "SetPosition", "SetName", "SetPrefix", "SendEvent", "SetSwitch",
  "SetRTPC", "SetAttenuationScalingFactor", "GetName", "SetVisibility", "Mute",
  "Unmute", "ForceCullingStateChange", "ReleaseForcedCullingState"
];


/** Contract for an audio emitter the runtime can position, name and drive. */
export class ITr2AudEmitter
{

  /**
   * Carbon's `Initialize(name, prefix, position)` (ITr2AudEmitter.h:14):
   * prepares the emitter with its name, event prefix and initial position.
   *
   * @param {string} _name The emitter's name.
   * @param {string} _prefix The event-name prefix.
   * @param {Float32Array} _position Initial world position.
   */
  Initialize__WithParameters(_name, _prefix, _position) {}

  /**
   * Sets the emitter's orientation and position.
   *
   * @param {Float32Array} _front Forward vector.
   * @param {Float32Array} _top Up vector.
   * @param {Float32Array} _position World position.
   * @returns {number} A status code.
   */
  SetPosition(_front, _top, _position) {}

  /**
   * Renames the emitter.
   *
   * @param {string} _name The new name.
   */
  SetName(_name) {}

  /**
   * Sets the event-name prefix.
   *
   * @param {string} _prefix The new prefix.
   */
  SetPrefix(_prefix) {}

  /**
   * Posts a one-shot event on this emitter.
   *
   * @param {string} _name The event's name.
   * @param {boolean} [_bypassPrefix] Whether to skip the prefix.
   * @returns {number} The playing id, or 0 when the post failed.
   */
  SendEvent(_name, _bypassPrefix = false) {}

  /**
   * Sets one switch group to a state.
   *
   * @param {string} _switchGroup The group's name.
   * @param {string} _switchState The state's name.
   * @returns {boolean} Whether the switch applied.
   */
  SetSwitch(_switchGroup, _switchState) {}

  /**
   * Sets one RTPC value.
   *
   * @param {string} _rtpcName The parameter's name.
   * @param {number} _rtpcValue Its new value.
   * @returns {boolean} Whether the parameter applied.
   */
  SetRTPC(_rtpcName, _rtpcValue) {}

  /**
   * Scales the emitter's attenuation radius.
   *
   * @param {number} _scalingFactor The scaling factor.
   * @returns {boolean} Whether the factor applied.
   */
  SetAttenuationScalingFactor(_scalingFactor) {}

  /**
   * The emitter's name.
   *
   * @returns {string} The name.
   */
  GetName() {}

  /**
   * Tells the emitter whether its owner is visible.
   *
   * @param {boolean} _visible Whether the owner is visible.
   */
  SetVisibility(_visible) {}

  /** Silences the emitter. */
  Mute() {}

  /** Restores the emitter after Mute. */
  Unmute() {}

  /** Forces the emitter's culling state to be re-evaluated. */
  ForceCullingStateChange() {}

  /** Releases a forced culling state. */
  ReleaseForcedCullingState() {}
}


for (const name of EMITTER_METHODS) CjsSchema.decorateMethod(ITr2AudEmitter, name, blue.abstract);
CjsSchema.decorateMethod(ITr2AudEmitter, "Initialize__WithParameters", meta.renamed("Initialize"));
blue.inherit(IRoot)(ITr2AudEmitter);
CjsSchema.exposure.interface("ITr2AudEmitter")(ITr2AudEmitter);
