// The wire layout of Carbon's Blue math wrappers, as the Black and Red readers
// read an embedded one into a declared math member. A wrapped member's row names
// the wrapper class in its iid; this says how its elements are persisted and
// which value types it holds, which the Blue compile checks once.

/**
 * Carbon's Blue math wrappers: each persists its value's elements as FLOAT members
 * (TriMatrix_Blue.cpp:18-33, TriVector_Blue.cpp, TriQuaternion_Blue.cpp,
 * TriColor_Blue.cpp) and constructs with the given defaults (TriMatrix.cpp:72-90,
 * TriVector.cpp:203-206, TriQuaternion.cpp:53-56, TriColor.cpp:164-167).
 */
export const BLUE_MATH_WRAPPERS = {
  TriMatrix: {
    types: [ "mat4", "matrix4" ],
    elements: [ "_11", "_12", "_13", "_14", "_21", "_22", "_23", "_24", "_31", "_32", "_33", "_34", "_41", "_42", "_43", "_44" ],
    defaults: [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]
  },
  TriVector: { types: [ "vec3", "vector3" ], elements: [ "x", "y", "z" ], defaults: [ 0, 0, 0 ] },
  TriQuaternion: { types: [ "quat", "quaternion" ], elements: [ "x", "y", "z", "w" ], defaults: [ 0, 0, 0, 1 ] },
  TriColor: { types: [ "color" ], elements: [ "r", "g", "b", "a" ], defaults: [ 0, 0, 0, 0 ] }
};

/**
 * The persisted elements and defaults of a math wrapper, and the value types it holds.
 *
 * @param {string} className The wrapper class, a wrapped member's iid.
 * @returns {{types: string[], elements: string[], defaults: number[]}} The layout.
 * @throws {TypeError} When the class is not a Blue math wrapper.
 */
export function getWrapperLayout(className)
{
  const layout = Object.hasOwn(BLUE_MATH_WRAPPERS, className) ? BLUE_MATH_WRAPPERS[className] : null;
  if (!layout) throw new TypeError(`${className} is not a Blue math wrapper.`);
  return layout;
}

/**
 * Checks that a member may be persisted as the given wrapper: the class is a Blue math wrapper and holds the
 * member's value type. Every declaration form calls it, decorator and data alike, before its class registers.
 *
 * @param {string} className The wrapper class the member declares.
 * @param {string} valueType The member's value type.
 * @throws {TypeError} When the class is not a Blue math wrapper, or holds another value type.
 */
export function requireWrapperHolds(className, valueType)
{
  if (!getWrapperLayout(className).types.includes(valueType)) throw new TypeError(`${className} does not hold ${valueType}.`);
}
