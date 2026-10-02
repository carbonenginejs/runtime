// Source: blue/include/ITr2DebugRenderer2.h:127-187
import { CjsSchema, meta } from "#schema";


/**
 * Shared abstract debug-renderer contract; it performs no drawing or device work.
 * Carbon's overloads share one JavaScript method name and preserve the caller's
 * argument order. Concrete renderers must interpret the documented variants.
 * Carbon derives this interface from IRoot; JavaScript uses a plain class.
 */
export class ITr2DebugRenderer2
{
  /**
   * Tests whether an option is enabled for an owner.
   * Carbon's HasOption<T> forwards owner->GetRawRoot() to this pure IRoot query.
   * JavaScript uses the existing object identity for that root pointer; no
   * GetRawRoot helper or default query result is introduced.
   * @param {object} _owner The object being queried.
   * @param {string} _option The option name.
   * @returns {boolean} Whether the option is enabled.
   */
  HasOption(_owner, _option) {}

  /**
   * Tests selection using Carbon's IRoot* or Tr2DebugObjectReference overload.
   * @param {object} _owner The object or debug-object reference being queried.
   * @returns {boolean} Whether the object or referenced area is selected.
   */
  IsSelected(_owner) {}

  /**
   * Draws a line between the supplied endpoints.
   * @param {object} _owner A debug-object reference.
   * @param {Float32Array} _from First endpoint.
   * @param {Float32Array} _to Second endpoint.
   * @param {object} _color A Tr2DebugColor value.
   * @returns {void}
   */
  DrawLine(_owner, _from, _to, _color) {}

  /**
   * Draws a triangle using (vertex1, normal1, vertex2, normal2, vertex3, normal3,
   * color) or (vertex1, vertex2, vertex3, normal, color) after the owner.
   * @param {object} _owner A debug-object reference.
   * @param {...*} _args The selected native overload's arguments, in order.
   * @returns {void}
   */
  DrawTriangle(_owner, ..._args) {}

  /**
   * Draws a box using (min, max, effect, color) or
   * (transform, min, max, effect, color) after the owner.
   * @param {object} _owner A debug-object reference.
   * @param {...*} _args The selected native overload's arguments, in order.
   * @returns {void}
   */
  DrawBox(_owner, ..._args) {}

  /**
   * Draws a sphere from (sphere Vector4), (center, radius), (transform),
   * (transform, radius), or (transform, center, radius). Each variant follows
   * the owner and ends with (segments, effect, color).
   * @param {object} _owner A debug-object reference.
   * @param {...*} _args The selected native overload's arguments, in order.
   * @returns {void}
   */
  DrawSphere(_owner, ..._args) {}

  /**
   * Draws a cylinder from (transform, radius, height), (cap0, cap1, radius),
   * or (transform, cap0, cap1, radius). Each variant follows the owner and
   * ends with (segments, effect, color).
   * @param {object} _owner A debug-object reference.
   * @param {...*} _args The selected native overload's arguments, in order.
   * @returns {void}
   */
  DrawCylinder(_owner, ..._args) {}

  /**
   * Draws a cone using (transform, radius, height, segments, effect, color),
   * (base, focal, radius, segments, effect, color), or
   * (transform, height, angle, segments, coneSegments, effect, color) after the owner.
   * @param {object} _owner A debug-object reference.
   * @param {...*} _args The selected native overload's arguments, in order.
   * @returns {void}
   */
  DrawCone(_owner, ..._args) {}

  /**
   * Draws a capsule from (transform, radius, height) or (cap0, cap1, radius).
   * Each variant follows the owner and ends with (segments, effect, color).
   * @param {object} _owner A debug-object reference.
   * @param {...*} _args The selected native overload's arguments, in order.
   * @returns {void}
   */
  DrawCapsule(_owner, ..._args) {}

  /**
   * Draws an arrow from start to end.
   * @param {object} _owner A debug-object reference.
   * @param {Float32Array} _start Arrow start.
   * @param {Float32Array} _end Arrow end.
   * @param {number} _radius Shaft radius.
   * @param {number} _pointerLength Arrowhead length.
   * @param {number} _segments Segment count.
   * @param {number} _effect Native Effect value.
   * @param {object} _color A Tr2DebugColor value.
   * @returns {void}
   */
  DrawArrow(_owner, _start, _end, _radius, _pointerLength, _segments, _effect, _color) {}

  /**
   * Draws an arrow with a pointer at each end.
   * @param {object} _owner A debug-object reference.
   * @param {Float32Array} _start Arrow start.
   * @param {Float32Array} _end Arrow end.
   * @param {number} _radius Shaft radius.
   * @param {number} _pointerLength Arrowhead length.
   * @param {number} _segments Segment count.
   * @param {number} _effect Native Effect value.
   * @param {object} _color A Tr2DebugColor value.
   * @returns {void}
   */
  DrawDoubleArrow(_owner, _start, _end, _radius, _pointerLength, _segments, _effect, _color) {}

  /**
   * Draws a spherical arrow in the supplied direction.
   * @param {object} _owner A debug-object reference.
   * @param {Float32Array} _center Sphere center.
   * @param {Float32Array} _direction Arrow direction.
   * @param {number} _radius Sphere radius.
   * @param {number} _segments Segment count.
   * @param {number} _effect Native Effect value.
   * @param {object} _color A Tr2DebugColor value.
   * @returns {void}
   */
  DrawSphereArrow(_owner, _center, _direction, _radius, _segments, _effect, _color) {}

  /**
   * Draws the transformed axes; Carbon supplies no color argument here.
   * @param {object} _owner A debug-object reference.
   * @param {Float32Array} _transform Axis transform.
   * @param {number} _effect Native Effect value.
   * @returns {void}
   */
  DrawAxis(_owner, _transform, _effect) {}

  /**
   * Draws a transformed extrusion from the caller's vertex and normal sequences.
   * @param {object} _owner A debug-object reference.
   * @param {Float32Array} _transform Shape transform.
   * @param {object} _vertices Native Vector2 sequence.
   * @param {object} _normals Native Vector2 sequence.
   * @param {number} _vertexCount Number of vertices.
   * @param {number} _segments Segment count.
   * @param {number} _effect Native Effect value.
   * @param {object} _color A Tr2DebugColor value.
   * @returns {void}
   */
  DrawExtrusionShape(_owner, _transform, _vertices, _normals, _vertexCount, _segments, _effect, _color) {}

  /**
   * Draws text using the native format-string/variadic contract, without an owner argument.
   * @param {number} _font Native TriDebugFont value.
   * @param {Float32Array} _position Text position.
   * @param {Float32Array} _color Text color.
   * @param {string} _format Format string.
   * @param {...*} _args Format arguments.
   * @returns {void}
   */
  DrawText(_font, _position, _color, _format, ..._args) {}

  /**
   * Writes an option's color to caller-owned storage.
   * @param {Float32Array} _color Output color, first as in Carbon.
   * @param {string} _option The option name.
   * @returns {boolean} Whether a color was found.
   */
  GetColorForOption(_color, _option) {}

  /**
   * Sets the color associated with an option.
   * @param {string} _option The option name, first as in Carbon.
   * @param {Float32Array} _color Input color.
   * @returns {void}
   */
  SetColorForOption(_option, _color) {}

  /**
   * Draws an audio-speaker marker.
   * @param {object} _owner A debug-object reference.
   * @param {Float32Array} _transform Marker transform.
   * @param {number} _size Marker size.
   * @param {number} _segments Segment count.
   * @param {number} _effect Native Effect value.
   * @param {object} _color A Tr2DebugColor value.
   * @returns {void}
   */
  DrawAudioSpeaker(_owner, _transform, _size, _segments, _effect, _color) {}
}

for (const method of [
  "HasOption", "IsSelected", "DrawLine", "DrawTriangle", "DrawBox", "DrawSphere",
  "DrawCylinder", "DrawCone", "DrawCapsule", "DrawArrow", "DrawDoubleArrow",
  "DrawSphereArrow", "DrawAxis", "DrawExtrusionShape", "DrawText",
  "GetColorForOption", "SetColorForOption", "DrawAudioSpeaker"
])
{
  CjsSchema.decorateMethod(ITr2DebugRenderer2, method, meta.requires, meta.abstract);
}
// This JavaScript registration supplies one nominal interface identity for named
// declarations and composition. It does not install a renderer implementation.
CjsSchema.define(ITr2DebugRenderer2, {
  className: "ITr2DebugRenderer2", carbon: "ITr2DebugRenderer2", fields: {}
});
