// Source: blueexposure/include/IBlueRtti.h:14-26

/**
 * One entry of a class's run-time type information: a member, a Python method or a property, told apart by `type`.
 * Carbon's union becomes three members, of which the one `type` names is set.
 *
 * Carbon: BlueRttiValue (blueexposure/include/IBlueRtti.h:14-26)
 *
 * @adapted `mXtraOffset` and `mTotalOffset` are not kept: a JavaScript member is reached by its key on the
 *   object, not by byte offsets through each parent (see BlueRttiType).
 */
export class BlueRttiValue
{

  /**
   * Carbon's anonymous `enum {var, pymethod, pyproperty}` (IBlueRtti.h:16), the vocabulary of `type`.
   *
   * @implemented
   */
  static Type = Object.freeze({ var: 0, pymethod: 1, pyproperty: 2 });

  /**
   * `mType` (IBlueRtti.h:16): which member below is set.
   *
   * @type {number}
   */
  type = BlueRttiValue.Type.var;

  /**
   * `mVar` (IBlueRtti.h:19): the member, when `type` is `var`.
   *
   * @type {object|null}
   */
  var = null;

  /**
   * `mPyMethod` (IBlueRtti.h:23): the method definition, when `type` is `pymethod`.
   *
   * @type {object|null}
   */
  pyMethod = null;

  /**
   * `mPyProperty` (IBlueRtti.h:24): the property's member, when `type` is `pyproperty`.
   *
   * @type {object|null}
   */
  pyProperty = null;

  /**
   * Ours: the registered name, which minification cannot change.
   *
   * @cjs
   * @implemented
   */
  static className = "BlueRttiValue";

}
