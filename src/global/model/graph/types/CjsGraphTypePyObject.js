/**
 * PYOBJECTPTR and SCRIPTCALLBACK members: a script object or a callback, held by reference.
 * Modelled on: Be::PYOBJECTPTR (blueexposure/BlueVariable.cpp:606-626)
 * Modelled on: Be::SCRIPTCALLBACK (blueexposure/BlueVariable.cpp:998-1008)
 * @cjs Owner and key replace native pointers. Carbon converts a Python callable into the member's
 *   BlueScriptCallback; ours assigns through the key, so a class that converts does it in its own setter.
 */
export class CjsGraphTypePyObject
{

  /** Returns the stored reference. @cjs */
  Get(holder, key)
  {
    return holder[key];
  }

  /** Stores the reference and returns true: nothing is compared, since two are never equal. @cjs */
  Set(holder, key, value)
  {
    holder[key] = value;
    return true;
  }

  /** Stores the reference. @cjs */
  Write(holder, key, value)
  {
    holder[key] = value;
  }

  /**
   * Never equal: Carbon has no AreEqual for either type, and its default answers false
   * (blueexposure/BlueVariable.cpp:111-114).
   * @cjs
   */
  IsEqual()
  {
    return false;
  }

  /**
   * Never unchanged, as IsEqual: Carbon's answer for a type with no AreEqual. So a set of the
   * reference already held is reported as a change each time, and a diff lists the member each time.
   * @cjs
   */
  IsUnchanged()
  {
    return false;
  }

  /**
   * Tests whether two are the same reference: Carbon's Copier skips a member whose bytes match
   * before it copies (blueexposure/Copier.cpp:171-175), and a pointer's bytes are its identity.
   * @cjs
   */
  IsExactEqual(a, b)
  {
    return a === b;
  }

  /** Any value: a script object is whatever the script holds, and a class checks a callback in its setter. @cjs */
  IsValidValue()
  {
    return true;
  }

  /** Stable class identity. */
  static className = "CjsGraphTypePyObject";

}
