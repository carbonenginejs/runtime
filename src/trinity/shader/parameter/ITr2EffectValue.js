// Source: trinity/trinity/ITr2EffectValue.h:14-19
//
// The flag word every effect parameter shares.
//
// WHY IT HAS ITS OWN MODULE. Carbon declares `ResourceFlags` on
// `ITr2EffectValue`, the interface every parameter implements, and passes it to
// `CopyToResourceSet`. Here it was a module-private constant inside
// `Tr2Effect.js`, which was fine while `Tr2Effect` was the only writer — it
// stamps the flag into a mapped resource's `registerCount` — and stopped being
// fine on 2026-09-05 when four parameter classes became readers of it.
//
// A COPY IN EACH READER WOULD HAVE WORKED AND THAT IS THE PROBLEM: nothing
// would have caught the day one of them disagreed.

import { CjsSchema, meta } from "#schema";

/**
 * Flags a resource is bound with, stored by a mapped resource in
 * `registerCount` — which for a resource is a flag word, not a count. The
 * field name is Carbon's and it means something different for a constant,
 * where it is a byte size.
 */
export const ResourceFlags = Object.freeze({
  RESOURCE_FLAG_NONE: 0,

  /** The texture is bound through the sRGB transfer function. */
  RESOURCE_FLAG_SRGB: 1
});

/**
 * Native effect-value contract. Its methods deliberately have inert defaults;
 * implementations override only the constant/resource operations they support.
 */
export class ITr2EffectValue
{
  /**
   * Native default leaves the effect constant storage untouched.
   * @param {number} _inputType Shader stage.
   * @param {*} _destination Constant storage.
   * @param {number} _size Available bytes.
   * @param {object} _renderContext Binding context.
   * @returns {void} No operation.
   */
  @meta.impl.noop
  CopyValueToEffect(_inputType, _destination, _size, _renderContext)
  {
  }

  /**
   * Native default supplies no shader resource.
   * @param {object} _resourceDesc Resource-set description.
   * @param {number} _stage Shader stage.
   * @param {number} _registerIndex Destination register.
   * @param {number} _flags ResourceFlags word.
   * @returns {boolean} False.
   */
  @meta.impl.implemented
  CopyToResourceSet(_resourceDesc, _stage, _registerIndex, _flags)
  {
    return false;
  }

  /**
   * Native default supplies no unordered-access resource.
   * @param {object} _resourceDesc Resource-set description.
   * @param {number} _stage Shader stage.
   * @param {number} _registerIndex Destination register.
   * @returns {boolean} False.
   */
  @meta.impl.implemented
  ApplyUav(_resourceDesc, _stage, _registerIndex)
  {
    return false;
  }

  /**
   * Native default contributes no bindless texture.
   * @param {object} _usedTextures Bindless texture collection.
   * @returns {void} No operation.
   */
  @meta.impl.noop
  AddUsedTexture(_usedTextures)
  {
  }
}

CjsSchema.define(ITr2EffectValue, { className: "ITr2EffectValue", carbon: "ITr2EffectValue", family: "trinityCore", fields: {} });
