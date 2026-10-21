// Source: blue/include/ITr2DebugRenderer2.h:127-187
import { CjsSchema, blue } from "#schema";


/**
 * Shared abstract debug-renderer contract; it performs no drawing or device work.
 * Carbon derives this interface from IRoot; JavaScript uses a plain class.
 *
 * Every owner argument is a `Tr2DebugObjectReference` and every color argument
 * a `Tr2DebugColor`; Carbon's call sites build both implicitly from `this` and
 * from a `Color` or packed word, JavaScript callers through their `create__`
 * factories.
 *
 * Carbon overloads DrawTriangle, DrawBox, DrawSphere, DrawCylinder, DrawCone,
 * DrawCapsule and IsSelected. JavaScript cannot tell the overloads apart from
 * their arguments (a Matrix, a Vector3 and a Vector4 are all Float32Arrays), so
 * each overload is its own `__` method and none keeps the bare name.
 */
export class ITr2DebugRenderer2
{
  /** Native nested Effect enum (blue/include/ITr2DebugRenderer2.h:129-134). */
  static Effect = { Wireframe: 0, Solid: 1, Lit: 2 };

  /**
   * Tests whether an option is enabled for an owner.
   * Carbon's HasOption<T> forwards owner->GetRawRoot() to this pure IRoot query;
   * in JavaScript the object is its own root, so the two are one method.
   * @param {object} _owner The object being queried.
   * @param {string} _option The option name.
   * @returns {boolean} Whether the option is enabled.
   */
  HasOption(_owner, _option) {}

  /**
   * Carbon's `IsSelected( IRoot* owner )` (h:143).
   * @param {object} _owner The object being queried.
   * @returns {boolean} Whether the object is selected.
   */
  IsSelected__Root(_owner) {}

  /**
   * Carbon's `IsSelected( Tr2DebugObjectReference owner )` (h:144).
   * @param {Tr2DebugObjectReference} _owner The object and area being queried.
   * @returns {boolean} Whether the referenced area is selected.
   */
  IsSelected__Reference(_owner) {}

  /**
   * Draws a line between the supplied endpoints (h:146).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _from First endpoint.
   * @param {Float32Array} _to Second endpoint.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawLine(_owner, _from, _to, _color) {}

  /**
   * Draws a triangle with a normal per vertex (h:147).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _vertex1
   * @param {Float32Array} _normal1
   * @param {Float32Array} _vertex2
   * @param {Float32Array} _normal2
   * @param {Float32Array} _vertex3
   * @param {Float32Array} _normal3
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawTriangle__VertexNormals(_owner, _vertex1, _normal1, _vertex2, _normal2, _vertex3, _normal3, _color) {}

  /**
   * Draws a triangle with one normal for the face (h:148).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _vertex1
   * @param {Float32Array} _vertex2
   * @param {Float32Array} _vertex3
   * @param {Float32Array} _normal
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawTriangle__FaceNormal(_owner, _vertex1, _vertex2, _vertex3, _normal, _color) {}

  /**
   * Draws an untransformed box (h:150).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _min
   * @param {Float32Array} _max
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawBox__MinMax(_owner, _min, _max, _effect, _color) {}

  /**
   * Draws a box under a transform (h:151).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {Float32Array} _min
   * @param {Float32Array} _max
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawBox__Transform(_owner, _transform, _min, _max, _effect, _color) {}

  /**
   * Draws a sphere given as a Vector4, centre then radius (h:153).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _sphere
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawSphere__Sphere(_owner, _sphere, _segments, _effect, _color) {}

  /**
   * Draws a sphere from a centre and radius (h:154).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _center
   * @param {number} _radius
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawSphere__CenterRadius(_owner, _center, _radius, _segments, _effect, _color) {}

  /**
   * Draws a unit sphere under a transform (h:155).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawSphere__Transform(_owner, _transform, _segments, _effect, _color) {}

  /**
   * Draws a sphere of a radius under a transform (h:156).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {number} _radius
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawSphere__TransformRadius(_owner, _transform, _radius, _segments, _effect, _color) {}

  /**
   * Draws a sphere of a centre and radius under a transform (h:157).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {Float32Array} _center
   * @param {number} _radius
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawSphere__TransformCenterRadius(_owner, _transform, _center, _radius, _segments, _effect, _color) {}

  /**
   * Draws a cylinder of a radius and height under a transform (h:159).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {number} _radius
   * @param {number} _height
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawCylinder__TransformHeight(_owner, _transform, _radius, _height, _segments, _effect, _color) {}

  /**
   * Draws a cylinder between two cap centres (h:160).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _cap0
   * @param {Float32Array} _cap1
   * @param {number} _radius
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawCylinder__Caps(_owner, _cap0, _cap1, _radius, _segments, _effect, _color) {}

  /**
   * Draws a cylinder between two cap centres under a transform (h:161).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {Float32Array} _cap0
   * @param {Float32Array} _cap1
   * @param {number} _radius
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawCylinder__TransformCaps(_owner, _transform, _cap0, _cap1, _radius, _segments, _effect, _color) {}

  /**
   * Draws a cone of a base radius and height under a transform (h:163).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {number} _radius
   * @param {number} _height
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawCone__TransformRadius(_owner, _transform, _radius, _height, _segments, _effect, _color) {}

  /**
   * Draws a cone from a base centre to a focal point (h:164).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _base
   * @param {Float32Array} _focal
   * @param {number} _radius
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawCone__BaseFocal(_owner, _base, _focal, _radius, _segments, _effect, _color) {}

  /**
   * Draws a cone of a height and opening angle under a transform (h:166).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {number} _height
   * @param {number} _angle
   * @param {number} _segments
   * @param {number} _coneSegments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawCone__TransformAngle(_owner, _transform, _height, _angle, _segments, _coneSegments, _effect, _color) {}

  /**
   * Draws a capsule of a radius and height under a transform (h:168).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform
   * @param {number} _radius
   * @param {number} _height
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawCapsule__TransformHeight(_owner, _transform, _radius, _height, _segments, _effect, _color) {}

  /**
   * Draws a capsule between two cap centres (h:169).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _cap0
   * @param {Float32Array} _cap1
   * @param {number} _radius
   * @param {number} _segments
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawCapsule__Caps(_owner, _cap0, _cap1, _radius, _segments, _effect, _color) {}

  /**
   * Draws an arrow from start to end (h:171).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _start Arrow start.
   * @param {Float32Array} _end Arrow end.
   * @param {number} _radius Shaft radius.
   * @param {number} _pointerLength Arrowhead length.
   * @param {number} _segments Segment count.
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawArrow(_owner, _start, _end, _radius, _pointerLength, _segments, _effect, _color) {}

  /**
   * Draws an arrow with a pointer at each end (h:172).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _start Arrow start.
   * @param {Float32Array} _end Arrow end.
   * @param {number} _radius Shaft radius.
   * @param {number} _pointerLength Arrowhead length.
   * @param {number} _segments Segment count.
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawDoubleArrow(_owner, _start, _end, _radius, _pointerLength, _segments, _effect, _color) {}

  /**
   * Draws a spherical arrow in the supplied direction (h:174).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _center Sphere center.
   * @param {Float32Array} _direction Arrow direction.
   * @param {number} _radius Sphere radius.
   * @param {number} _segments Segment count.
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawSphereArrow(_owner, _center, _direction, _radius, _segments, _effect, _color) {}

  /**
   * Draws the transformed axes; Carbon supplies no color argument here (h:176).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform Axis transform.
   * @param {number} _effect An Effect value.
   * @returns {void}
   */
  DrawAxis(_owner, _transform, _effect) {}

  /**
   * Draws a transformed extrusion from the caller's vertex and normal sequences (h:178).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform Shape transform.
   * @param {object} _vertices Native Vector2 sequence.
   * @param {object} _normals Native Vector2 sequence.
   * @param {number} _vertexCount Number of vertices.
   * @param {number} _segments Segment count.
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawExtrusionShape(_owner, _transform, _vertices, _normals, _vertexCount, _segments, _effect, _color) {}

  /**
   * Draws text using the native format-string/variadic contract, without an owner argument (h:180).
   * @param {number} _font Native TriDebugFont value.
   * @param {Float32Array} _position Text position.
   * @param {Float32Array} _color Text color.
   * @param {string} _format Format string.
   * @param {...*} _args Format arguments.
   * @returns {void}
   */
  DrawText(_font, _position, _color, _format, ..._args) {}

  /**
   * An option's color (h:182). Carbon writes it to an output parameter and
   * returns whether one was set; the output becomes the return value
   * (skill rule 11), null when none is set.
   * @param {string} _option The option name.
   * @returns {Float32Array|null} The color.
   */
  GetColorForOption(_option) {}

  /**
   * Sets the color associated with an option (h:183).
   * @param {string} _option The option name, first as in Carbon.
   * @param {Float32Array} _color Input color.
   * @returns {void}
   */
  SetColorForOption(_option, _color) {}

  /**
   * Draws an audio-speaker marker (h:185).
   * @param {Tr2DebugObjectReference} _owner
   * @param {Float32Array} _transform Marker transform.
   * @param {number} _size Marker size.
   * @param {number} _segments Segment count.
   * @param {number} _effect An Effect value.
   * @param {Tr2DebugColor} _color
   * @returns {void}
   */
  DrawAudioSpeaker(_owner, _transform, _size, _segments, _effect, _color) {}
}

for (const method of [
  "HasOption", "IsSelected__Root", "IsSelected__Reference", "DrawLine",
  "DrawTriangle__VertexNormals", "DrawTriangle__FaceNormal",
  "DrawBox__MinMax", "DrawBox__Transform",
  "DrawSphere__Sphere", "DrawSphere__CenterRadius", "DrawSphere__Transform",
  "DrawSphere__TransformRadius", "DrawSphere__TransformCenterRadius",
  "DrawCylinder__TransformHeight", "DrawCylinder__Caps", "DrawCylinder__TransformCaps",
  "DrawCone__TransformRadius", "DrawCone__BaseFocal", "DrawCone__TransformAngle",
  "DrawCapsule__TransformHeight", "DrawCapsule__Caps",
  "DrawArrow", "DrawDoubleArrow", "DrawSphereArrow", "DrawAxis", "DrawExtrusionShape",
  "DrawText", "GetColorForOption", "SetColorForOption", "DrawAudioSpeaker"
])
{
  CjsSchema.decorateMethod(ITr2DebugRenderer2, method, blue.abstract);
}
// This JavaScript registration supplies one nominal interface identity for named
// declarations and composition. It does not install a renderer implementation.
CjsSchema.exposure.interface("ITr2DebugRenderer2")(ITr2DebugRenderer2);
