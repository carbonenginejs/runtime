// Source: trinity/trinity/Tr2DebugRenderer.h
// Source: trinity/trinity/Tr2DebugRenderer.cpp
// Source: trinity/trinity/Tr2DebugRenderer_Blue.cpp
//
// The concrete debug renderer. Every Draw__* call appends Vertex records to
// a line list or a triangle list, remembering where each owner's primitives
// start; EndRender uploads both lists through a ring vertex buffer and draws
// them with DebugPrimitive.fx, the way Carbon's EndRender does (cpp:827-876).
// Carbon's overloads are one method each (skill rule 11); the variant names
// match ITr2DebugRenderer2.
import { ITr2DebugRenderer2, ITr2DebugRenderable, Tr2DebugColor } from "#interfaces";
import { CjsSchema, meta, type, blue } from "#schema";
import { color as colorMath } from "#math/color";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { RenderingMode } from "#consts/graphics";
import { Topology } from "#consts/render-context";
import { ALResult } from "#trinityal";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2RingVertexBuffer } from "../device/Tr2RingVertexBuffer.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/index.js";
import { Tr2DebugRendererVertex } from "./Tr2DebugRendererVertex.js";
import { TriDebugTextRenderer } from "../TriDebugTextRenderer.js";

/** VERTEX_BUFFER_INITIAL_SIZE (cpp:14). */
const VERTEX_BUFFER_INITIAL_SIZE = 4 * 1024 * 1024;

/** sizeof( Tr2DebugRenderer::Vertex ): 8 floats and 2 packed colours. */
const VERTEX_STRIDE = 40;

// Scratch for the primitive builders (debug drawing is single-threaded). A
// builder never calls another builder while it holds one of these.
const IDENTITY = mat4.create();
const ZERO = vec3.create();
const LINE_TRANSFORM = mat4.create();
const COMPOSED = mat4.create();
const ROTATION_X = mat4.create();
const BOX_CORNER = vec3.create();
const BOX_NX = vec3.create();
const BOX_NY = vec3.create();
const BOX_NZ = vec3.create();
const BOX_NEG = vec3.create();
const DELTA = vec3.create();
const AXIS_END = vec3.create();
const LINE_START = vec3.create();
const LINE_END = vec3.create();
const SPEAKER_BASE = vec3.create();
const SPEAKER_OFFSET = vec3.create();

/** The axis colours DrawAxis passes (cpp:662-664). */
const AXIS_X_COLOR = colorMath.fromValues(1, 0, 0, 1);
const AXIS_Y_COLOR = colorMath.fromValues(0, 1, 0, 1);
const AXIS_Z_COLOR = colorMath.fromValues(0, 0, 1, 1);

let vertexDeclarationHandle = -1;

let debugTextRenderer = null;

/**
 * Carbon's anonymous GetDebugTextRenderer (cpp:55-59): the one text renderer
 * every debug renderer shares, created on first use as Carbon's function-local
 * static is.
 * @returns {TriDebugTextRenderer}
 */
function GetDebugTextRenderer()
{
  if (debugTextRenderer === null)
  {
    debugTextRenderer = new TriDebugTextRenderer();
  }
  return debugTextRenderer;
}

/**
 * Carbon's anonymous LineTransform (cpp:16-32): a frame whose Y axis runs
 * from start to end, centred halfway. Rows are written straight into the
 * shared memory layout (row i of Carbon's Matrix is elements 4i..4i+2).
 * @param {mat4} out
 * @param {vec3} start
 * @param {vec3} end
 * @returns {mat4} out
 */
function LineTransform(out, start, end)
{
  mat4.identity(out);

  const y = vec3.subtract(DELTA, end, start);
  vec3.scale(y, y, 0.5);
  vec3.normalize(y, y);
  out[4] = y[0]; out[5] = y[1]; out[6] = y[2];

  if (Math.abs(y[0]) > 0.9)
  {
    out[0] = 0; out[1] = 0; out[2] = 1;
  }
  else
  {
    out[0] = 1; out[1] = 0; out[2] = 0;
  }

  // Z = normalize( cross( X, Y ) ), then X = cross( Y, Z ).
  const zx = out[1] * out[6] - out[2] * out[5];
  const zy = out[2] * out[4] - out[0] * out[6];
  const zz = out[0] * out[5] - out[1] * out[4];
  const zLength = Math.hypot(zx, zy, zz);
  out[8] = zx / zLength; out[9] = zy / zLength; out[10] = zz / zLength;

  out[0] = out[5] * out[10] - out[6] * out[9];
  out[1] = out[6] * out[8] - out[4] * out[10];
  out[2] = out[4] * out[9] - out[5] * out[8];

  out[12] = (start[0] + end[0]) * 0.5;
  out[13] = (start[1] + end[1]) * 0.5;
  out[14] = (start[2] + end[2]) * 0.5;
  return out;
}

/**
 * Carbon's anonymous LineNormal (cpp:34-38): the left normal of a 2D edge.
 * @param {number[]} p0
 * @param {number[]} p1
 * @returns {number[]}
 */
function LineNormal(p0, p1)
{
  const x = -(p1[1] - p0[1]);
  const y = p1[0] - p0[0];
  const length = Math.hypot(x, y);
  return [ x / length, y / length ];
}

/**
 * XMVector3TransformNormal: the upper 3x3 only, no translation (see the
 * carbon-math-conventions skill). Row-vector v * M on the shared layout.
 * @param {vec3} out
 * @param {vec3} v
 * @param {mat4} m
 * @returns {vec3} out
 */
function TransformNormal(out, v, m)
{
  const x = v[0], y = v[1], z = v[2];
  out[0] = x * m[0] + y * m[4] + z * m[8];
  out[1] = x * m[1] + y * m[5] + z * m[9];
  out[2] = x * m[2] + y * m[6] + z * m[10];
  return out;
}

/**
 * Carbon's anonymous GetVertexDeclarationHandle (cpp:40-53): position,
 * normal, (object, line) as TEXCOORD0, and the two colours as COLOR1/COLOR2.
 * @returns {number}
 */
function GetVertexDeclarationHandle()
{
  if (vertexDeclarationHandle === -1)
  {
    const definition = new Tr2VertexDefinition();
    definition.Add("FLOAT32_3", "POSITION");
    definition.Add("FLOAT32_3", "NORMAL");
    definition.Add("FLOAT32_2", "TEXCOORD", 0);
    definition.Add("UBYTE_4_NORM", "COLOR", 1);
    definition.Add("UBYTE_4_NORM", "COLOR", 2);
    vertexDeclarationHandle = Tr2EffectStateManager.getVertexDeclarationHandle(definition);
  }
  return vertexDeclarationHandle;
}

/**
 * Packs vertex records into Carbon's 40-byte layout for the upload.
 * @param {Tr2DebugRendererVertex[]} geometry
 * @returns {Uint8Array}
 */
function PackVertices(geometry)
{
  const buffer = new ArrayBuffer(geometry.length * VERTEX_STRIDE);
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);

  for (let i = 0; i < geometry.length; i++)
  {
    const vertex = geometry[i];
    const base = i * 10;
    floats[base] = vertex.position[0];
    floats[base + 1] = vertex.position[1];
    floats[base + 2] = vertex.position[2];
    floats[base + 3] = vertex.normal[0];
    floats[base + 4] = vertex.normal[1];
    floats[base + 5] = vertex.normal[2];
    floats[base + 6] = vertex.object;
    floats[base + 7] = vertex.line;
    words[base + 8] = vertex.color;
    words[base + 9] = vertex.zFailColor;
  }

  return new Uint8Array(buffer);
}

/**
 * Carbon's free function GetDebugRenderOptions (Tr2DebugRenderer_Blue.cpp:7-17,
 * MAP_FUNCTION_AND_WRAP): the debug options an object offers, when it is debug-renderable.
 * @param {object} object Any Blue object.
 * @returns {string[]}
 */
export function GetDebugRenderOptions(object)
{
  const result = [];
  const renderable = CjsSchema.cast(object, ITr2DebugRenderable);
  if (renderable)
  {
    const options = new Set();
    renderable.GetDebugOptions(options);
    result.push(...options);
  }
  return result;
}

/** Resolves which debug visualisations an object draws and draws them. */
@blue.define("Tr2DebugRenderer")
@blue.inherit(ITr2DebugRenderer2)
@blue.interface()
export class Tr2DebugRenderer
{

  /** m_effect (Tr2EffectPtr): DebugPrimitive.fx, created with the renderer (cpp:141-142). */
  @type.rootRef("Tr2Effect")
  _effect = null;

  /** m_pickingEffect (Tr2EffectPtr): DebugPrimitivePicking.fx (cpp:143-144). */
  @type.rootRef("Tr2Effect")
  _pickingEffect = null;

  /** m_lines (std::vector<Vertex>): two vertices per line. */
  _lines = [];

  /** m_triangles (std::vector<Vertex>): three vertices per triangle. */
  _triangles = [];

  /** m_objectLineOffsets: { owner: Tr2DebugObjectReference, offset } where each owner's lines start. */
  _objectLineOffsets = [];

  /** m_objectTriangleOffsets: as _objectLineOffsets, for triangles. */
  _objectTriangleOffsets = [];

  /** m_defaultOptions (Tr2DebugRendererOptions). */
  _defaultOptions = new Set();

  /** m_options (std::map<IRootPtr, Tr2DebugRendererOptions>). */
  _options = new Map();

  /**
   * m_selectedObjects (std::set<Tr2DebugObjectReference>), held as object ->
   * set of areas: Carbon's set orders references by pointer address
   * (Tr2DebugObjectReference::operator<, cpp:89-100), which JavaScript objects
   * do not have.
   */
  _selectedObjects = new Map();

  /** m_optionColors (std::map<Tr2DebugRendererOption, Color>). */
  _optionColors = new Map();

  /** m_vertexBuffer (Tr2RingVertexBuffer). */
  _vertexBuffer = new Tr2RingVertexBuffer();

  constructor()
  {
    // cpp:139-145.
    this._effect = new Tr2Effect();
    this._effect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/DebugPrimitive.fx");
    this._pickingEffect = new Tr2Effect();
    this._pickingEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/DebugPrimitivePicking.fx");
  }

  /**
   * Carbon HasOption (cpp:147-155): the owner's own options when it has any,
   * else the defaults.
   * @param {object} owner
   * @param {string} option
   * @returns {boolean}
   */
  @blue.method
  @meta.implemented
  HasOption(owner, option)
  {
    const found = this._options.get(owner);
    if (found === undefined)
    {
      return this._defaultOptions.has(option);
    }
    return found.has(option);
  }

  /**
   * Carbon IsSelected( IRoot* owner ) (cpp:157-160): the owner converts to
   * the area-0 reference.
   * @param {object} owner
   * @returns {boolean}
   */
  @blue.method
  @meta.implemented
  IsSelected__Root(owner)
  {
    return this._IsSelected(owner, 0);
  }

  /**
   * Carbon IsSelected( Tr2DebugObjectReference owner ) (cpp:162-165).
   * @param {Tr2DebugObjectReference} owner
   * @returns {boolean}
   */
  @blue.method
  @meta.implemented
  IsSelected__Reference(owner)
  {
    return this._IsSelected(owner.object, owner.area);
  }

  /**
   * Lookup in the (object, area) selection.
   * @param {object} object
   * @param {number} area
   * @returns {boolean}
   */
  _IsSelected(object, area)
  {
    const areas = this._selectedObjects.get(object);
    return areas !== undefined && areas.has(area);
  }

  /**
   * Carbon DrawLine (cpp:167-175): a new owner offset when the owner changes,
   * then the two endpoints.
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} from
   * @param {vec3} to
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawLine(owner, from, to, color)
  {
    const offsets = this._objectLineOffsets;
    if (offsets.length === 0 || offsets[offsets.length - 1].owner.NotEquals(owner))
    {
      offsets.push({ owner, offset: this._lines.length });
    }

    const selected = this.IsSelected__Reference(owner);
    this._lines.push(Tr2DebugRendererVertex.create__Position(from, color, selected, offsets.length - 1));
    this._lines.push(Tr2DebugRendererVertex.create__Position(to, color, selected, offsets.length - 1));
  }

  /**
   * Carbon DrawTriangle with a normal per vertex (cpp:177-194).
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} vertex1
   * @param {vec3} normal1
   * @param {vec3} vertex2
   * @param {vec3} normal2
   * @param {vec3} vertex3
   * @param {vec3} normal3
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawTriangle__VertexNormals(owner, vertex1, normal1, vertex2, normal2, vertex3, normal3, color)
  {
    const offsets = this._objectTriangleOffsets;
    if (offsets.length === 0 || offsets[offsets.length - 1].owner.NotEquals(owner))
    {
      offsets.push({ owner, offset: this._triangles.length });
    }

    const selected = this.IsSelected__Reference(owner);
    this._triangles.push(Tr2DebugRendererVertex.create__PositionNormal(vertex1, normal1, color, selected, offsets.length - 1));
    this._triangles.push(Tr2DebugRendererVertex.create__PositionNormal(vertex2, normal2, color, selected, offsets.length - 1));
    this._triangles.push(Tr2DebugRendererVertex.create__PositionNormal(vertex3, normal3, color, selected, offsets.length - 1));
  }

  /**
   * Carbon DrawTriangle with one face normal (cpp:196-205).
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} vertex1
   * @param {vec3} vertex2
   * @param {vec3} vertex3
   * @param {vec3} normal
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawTriangle__FaceNormal(owner, vertex1, vertex2, vertex3, normal, color)
  {
    this.DrawTriangle__VertexNormals(owner, vertex1, normal, vertex2, normal, vertex3, normal, color);
  }

  /**
   * Carbon DrawBox( min, max ) (cpp:208-211): the transformed box under identity.
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} min
   * @param {vec3} max
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawBox__MinMax(owner, min, max, effect, color)
  {
    this.DrawBox__Transform(owner, IDENTITY, min, max, effect, color);
  }

  /**
   * Carbon DrawBox( transform, min, max ) (cpp:213-276): twelve edges for
   * Wireframe, twelve triangles otherwise - with the transformed axis normals
   * for Lit and zero normals for Solid.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {vec3} min
   * @param {vec3} max
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawBox__Transform(owner, transform, min, max, effect, color)
  {
    const corner = (x, y, z) => vec3.transformMat4(vec3.create(), vec3.set(BOX_CORNER, x, y, z), transform);
    const v000 = corner(min[0], min[1], min[2]);
    const v100 = corner(max[0], min[1], min[2]);
    const v010 = corner(min[0], max[1], min[2]);
    const v110 = corner(max[0], max[1], min[2]);
    const v001 = corner(min[0], min[1], max[2]);
    const v101 = corner(max[0], min[1], max[2]);
    const v011 = corner(min[0], max[1], max[2]);
    const v111 = corner(max[0], max[1], max[2]);

    if (effect === ITr2DebugRenderer2.Effect.Wireframe)
    {
      this.DrawLine(owner, v000, v100, color);
      this.DrawLine(owner, v000, v010, color);
      this.DrawLine(owner, v110, v010, color);
      this.DrawLine(owner, v110, v100, color);

      this.DrawLine(owner, v001, v101, color);
      this.DrawLine(owner, v001, v011, color);
      this.DrawLine(owner, v111, v011, color);
      this.DrawLine(owner, v111, v101, color);

      this.DrawLine(owner, v000, v001, color);
      this.DrawLine(owner, v100, v101, color);
      this.DrawLine(owner, v010, v011, color);
      this.DrawLine(owner, v110, v111, color);
      return;
    }

    const nx = BOX_NX, ny = BOX_NY, nz = BOX_NZ;
    if (effect === ITr2DebugRenderer2.Effect.Lit)
    {
      TransformNormal(nx, vec3.set(BOX_CORNER, 1, 0, 0), transform);
      TransformNormal(ny, vec3.set(BOX_CORNER, 0, 1, 0), transform);
      TransformNormal(nz, vec3.set(BOX_CORNER, 0, 0, 1), transform);
    }
    else
    {
      vec3.set(nx, 0, 0, 0);
      vec3.set(ny, 0, 0, 0);
      vec3.set(nz, 0, 0, 0);
    }
    const negative = n => vec3.negate(BOX_NEG, n);

    this.DrawTriangle__FaceNormal(owner, v000, v010, v100, negative(nz), color);
    this.DrawTriangle__FaceNormal(owner, v100, v010, v110, negative(nz), color);

    this.DrawTriangle__FaceNormal(owner, v001, v101, v011, nz, color);
    this.DrawTriangle__FaceNormal(owner, v101, v111, v011, nz, color);

    this.DrawTriangle__FaceNormal(owner, v000, v001, v010, negative(nx), color);
    this.DrawTriangle__FaceNormal(owner, v001, v011, v010, negative(nx), color);

    this.DrawTriangle__FaceNormal(owner, v100, v110, v101, nx, color);
    this.DrawTriangle__FaceNormal(owner, v101, v110, v111, nx, color);

    this.DrawTriangle__FaceNormal(owner, v000, v100, v001, negative(ny), color);
    this.DrawTriangle__FaceNormal(owner, v001, v100, v101, negative(ny), color);

    this.DrawTriangle__FaceNormal(owner, v010, v011, v110, ny, color);
    this.DrawTriangle__FaceNormal(owner, v011, v111, v110, ny, color);
  }

  /**
   * Carbon DrawSphere( Vector4 sphere ) (cpp:278-281).
   * @param {Tr2DebugObjectReference} owner
   * @param {vec4} sphere Centre, then radius.
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawSphere__Sphere(owner, sphere, segments, effect, color)
  {
    this.DrawSphere__TransformCenterRadius(owner, IDENTITY, vec3.fromValues(sphere[0], sphere[1], sphere[2]), sphere[3], segments, effect, color);
  }

  /**
   * Carbon DrawSphere( center, radius ) (cpp:283-286).
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} center
   * @param {number} radius
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawSphere__CenterRadius(owner, center, radius, segments, effect, color)
  {
    this.DrawSphere__TransformCenterRadius(owner, IDENTITY, center, radius, segments, effect, color);
  }

  /**
   * Carbon DrawSphere( transform ) (cpp:288-291): the unit sphere.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawSphere__Transform(owner, transform, segments, effect, color)
  {
    this.DrawSphere__TransformCenterRadius(owner, transform, ZERO, 1, segments, effect, color);
  }

  /**
   * Carbon DrawSphere( transform, radius ) (cpp:293-296).
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number} radius
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawSphere__TransformRadius(owner, transform, radius, segments, effect, color)
  {
    this.DrawSphere__TransformCenterRadius(owner, transform, ZERO, radius, segments, effect, color);
  }

  /**
   * Carbon DrawSphere( transform, center, radius ) (cpp:298-381): a UV sphere
   * of segments / 2 rings by segments slices, at least 4 segments - two edges
   * per cell for Wireframe, two triangles per cell otherwise, with the
   * transformed unit normals for Lit and zero normals for Solid.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {vec3} center
   * @param {number} radius
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawSphere__TransformCenterRadius(owner, transform, center, radius, segments, effect, color)
  {
    if (segments < 4)
    {
      segments = 4;
    }

    const Coords = (alpha, betta) =>
    {
      const ca = Math.cos(alpha - Math.PI / 2);
      return vec3.fromValues(Math.sin(betta) * ca, Math.sin(alpha - Math.PI / 2), Math.cos(betta) * ca);
    };
    const place = p => vec3.transformMat4(vec3.create(), vec3.scaleAndAdd(vec3.create(), center, p, radius), transform);
    const normal = p => TransformNormal(vec3.create(), p, transform);

    // Carbon's segments / 2 is unsigned integer division.
    const rings = Math.floor(segments / 2);
    for (let j = 0; j < rings; ++j)
    {
      const alpha0 = j / rings * Math.PI;
      const alpha1 = (j + 1) / rings * Math.PI;
      for (let i = 0; i < segments; ++i)
      {
        const betta0 = i / segments * 2 * Math.PI;
        const betta1 = (i + 1) / segments * 2 * Math.PI;

        const p00 = Coords(alpha0, betta0);
        const p10 = Coords(alpha0, betta1);
        const p01 = Coords(alpha1, betta0);
        const p11 = Coords(alpha1, betta1);

        switch (effect)
        {
          case ITr2DebugRenderer2.Effect.Wireframe:
            this.DrawLine(owner, place(p00), place(p01), color);
            this.DrawLine(owner, place(p00), place(p10), color);
            break;
          case ITr2DebugRenderer2.Effect.Solid:
            this.DrawTriangle__FaceNormal(owner, place(p00), place(p10), place(p01), ZERO, color);
            this.DrawTriangle__FaceNormal(owner, place(p10), place(p11), place(p01), ZERO, color);
            break;
          default:
            this.DrawTriangle__VertexNormals(owner, place(p00), normal(p00), place(p10), normal(p10), place(p01), normal(p01), color);
            this.DrawTriangle__VertexNormals(owner, place(p10), normal(p10), place(p11), normal(p11), place(p01), normal(p01), color);
        }
      }
    }
  }

  /**
   * Carbon DrawCylinder( transform, radius, height ) (cpp:383-388): a
   * four-point profile extruded around the Y axis.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number} radius
   * @param {number} height
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawCylinder__TransformHeight(owner, transform, radius, height, segments, effect, color)
  {
    const vertices = [ [ -height / 2, 0 ], [ -height / 2, radius ], [ height / 2, radius ], [ height / 2, 0 ] ];
    const normals = [ [ -1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, 1 ], [ 1, 0 ], [ 1, 0 ] ];
    this.DrawExtrusionShape(owner, transform, vertices, normals, vertices.length, segments, effect, color);
  }

  /**
   * Carbon DrawCylinder( cap0, cap1, radius ) (cpp:390-393).
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} cap0
   * @param {vec3} cap1
   * @param {number} radius
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawCylinder__Caps(owner, cap0, cap1, radius, segments, effect, color)
  {
    this.DrawCylinder__TransformCaps(owner, IDENTITY, cap0, cap1, radius, segments, effect, color);
  }

  /**
   * Carbon DrawCylinder( transform, cap0, cap1, radius ) (cpp:395-400).
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {vec3} cap0
   * @param {vec3} cap1
   * @param {number} radius
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawCylinder__TransformCaps(owner, transform, cap0, cap1, radius, segments, effect, color)
  {
    // Carbon (row-vector): LineTransform( cap0, cap1 ) * transform.
    const t = mat4.multiply(mat4.create(), transform, LineTransform(LINE_TRANSFORM, cap0, cap1));
    this.DrawCylinder__TransformHeight(owner, t, radius, vec3.distance(cap1, cap0), segments, effect, color);
  }

  /**
   * Carbon DrawCone( transform, radius, height ) (cpp:402-409).
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number} radius
   * @param {number} height
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawCone__TransformRadius(owner, transform, radius, height, segments, effect, color)
  {
    const vertices = [ [ -height / 2, 0 ], [ -height / 2, radius ], [ height / 2, 0 ] ];
    const n = LineNormal(vertices[1], vertices[2]);
    const normals = [ [ -1, 0 ], [ -1, 0 ], n, n ];
    this.DrawExtrusionShape(owner, transform, vertices, normals, vertices.length, segments, effect, color);
  }

  /**
   * Carbon DrawCone( base, focal, radius ) (cpp:411-416).
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} base
   * @param {vec3} focal
   * @param {number} radius
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawCone__BaseFocal(owner, base, focal, radius, segments, effect, color)
  {
    const transform = LineTransform(mat4.create(), base, focal);
    this.DrawCone__TransformRadius(owner, transform, radius, vec3.distance(focal, base), segments, effect, color);
  }

  /**
   * Carbon DrawCone( transform, height, angle, segments, coneSegments )
   * (cpp:418-443): a spherical-cap cone opening by angle, tip at the origin,
   * pointing down -Z before the transform.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number} height
   * @param {number} angle
   * @param {number} segments
   * @param {number} coneSegments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawCone__TransformAngle(owner, transform, height, angle, segments, coneSegments, effect, color)
  {
    coneSegments = Math.max(coneSegments, 3);

    const vertices = [];
    const normals = [];
    const tip = [ 0, 0 ];
    vertices.push(tip);
    normals.push([ -1, 0 ]);

    for (let i = 0; i < coneSegments; ++i)
    {
      const alpha = (coneSegments - 1 - i) / (coneSegments - 1) * angle;
      vertices.push([ -Math.cos(alpha) * height + tip[0], Math.sin(alpha) * height + tip[1] ]);
      normals.push([ -Math.cos(alpha), Math.sin(alpha) ]);
      if (i !== coneSegments - 1)
      {
        normals.push([ -Math.cos(alpha), Math.sin(alpha) ]);
      }
    }

    // Carbon (row-vector): RotationXMatrix( -XM_PIDIV2 ) * transform.
    const t = mat4.multiply(COMPOSED, transform, mat4.fromXRotation(ROTATION_X, -Math.PI / 2));
    this.DrawExtrusionShape(owner, t, vertices, normals, vertices.length, segments, effect, color);
  }

  /**
   * Carbon DrawCapsule( transform, radius, height ) (cpp:445-479): two
   * quarter-circle caps joined by the straight side, at least 3 segments.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number} radius
   * @param {number} height
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawCapsule__TransformHeight(owner, transform, radius, height, segments, effect, color)
  {
    if (segments < 3)
    {
      segments = 3;
    }

    const vertices = [];
    const normals = [];

    for (let i = 0; i < segments; ++i)
    {
      const alpha = i / (segments - 1) * Math.PI / 2;
      vertices.push([ -Math.cos(alpha) * radius - height / 2, Math.sin(alpha) * radius ]);
      normals.push([ -Math.cos(alpha), Math.sin(alpha) ]);
      if (i)
      {
        normals.push([ -Math.cos(alpha), Math.sin(alpha) ]);
      }
    }
    for (let i = 0; i < segments; ++i)
    {
      const alpha = Math.PI / 2 - i / (segments - 1) * Math.PI / 2;
      vertices.push([ Math.cos(alpha) * radius + height / 2, Math.sin(alpha) * radius ]);
      normals.push([ Math.cos(alpha), Math.sin(alpha) ]);
      if (i + 1 < segments)
      {
        normals.push([ Math.cos(alpha), Math.sin(alpha) ]);
      }
    }

    this.DrawExtrusionShape(owner, transform, vertices, normals, vertices.length, segments, effect, color);
  }

  /**
   * Carbon DrawCapsule( cap0, cap1, radius ) (cpp:481-485).
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} cap0
   * @param {vec3} cap1
   * @param {number} radius
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawCapsule__Caps(owner, cap0, cap1, radius, segments, effect, color)
  {
    const transform = LineTransform(mat4.create(), cap0, cap1);
    this.DrawCapsule__TransformHeight(owner, transform, radius, vec3.distance(cap1, cap0), segments, effect, color);
  }

  /**
   * Carbon DrawArrow (cpp:487-536): with no radius, a head of
   * length * pointerLength plus a line for the shaft; otherwise a solid shaft
   * and head in one profile.
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} start
   * @param {vec3} end
   * @param {number} radius
   * @param {number} pointerLength Head length as a fraction of the arrow.
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawArrow(owner, start, end, radius, pointerLength, segments, effect, color)
  {
    const transform = LineTransform(mat4.create(), start, end);
    const length = vec3.distance(start, end);

    if (radius <= 0)
    {
      radius = length * pointerLength * 0.15;

      const vertices = [
        [ length / 2 - pointerLength * length, 0 ],
        [ length / 2 - pointerLength * length, radius * 2 ],
        [ length / 2, 0 ]
      ];
      const n = LineNormal(vertices[1], vertices[2]);
      const normals = [ [ -1, 0 ], [ -1, 0 ], n, n ];
      this.DrawExtrusionShape(owner, transform, vertices, normals, vertices.length, segments, effect, color);

      // start + transform.GetY() * length * ( 1 - pointerLength ).
      const shaftEnd = vec3.fromValues(transform[4], transform[5], transform[6]);
      vec3.scaleAndAdd(shaftEnd, start, shaftEnd, length * (1 - pointerLength));
      this.DrawLine(owner, start, shaftEnd, color);
      return;
    }

    const vertices = [
      [ -length / 2, 0 ],
      [ -length / 2, radius ],
      [ length / 2 - pointerLength * length, radius ],
      [ length / 2 - pointerLength * length, radius * 2 ],
      [ length / 2, 0 ]
    ];
    const n = LineNormal(vertices[2], vertices[3]);
    const normals = [
      [ -1, 0 ], [ -1, 0 ],
      [ 0, 1 ], [ 0, 1 ],
      [ 0, 1 ], [ 0, 1 ],
      [ -1, 0 ], [ -1, 0 ],
      n, n
    ];
    this.DrawExtrusionShape(owner, transform, vertices, normals, vertices.length, segments, effect, color);
  }

  /**
   * Carbon DrawDoubleArrow (cpp:538-604): DrawArrow with a head at each end.
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} start
   * @param {vec3} end
   * @param {number} radius
   * @param {number} pointerLength Head length as a fraction of the arrow.
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawDoubleArrow(owner, start, end, radius, pointerLength, segments, effect, color)
  {
    const transform = LineTransform(mat4.create(), start, end);
    const length = vec3.distance(start, end);

    if (radius <= 0)
    {
      radius = length * pointerLength * 0.15;

      const vertices0 = [
        [ -length / 2, 0 ],
        [ -length / 2 + length * pointerLength, radius * 2 ],
        [ -length / 2 + length * pointerLength, 0 ]
      ];
      const n0 = LineNormal(vertices0[0], vertices0[1]);
      const normals0 = [ n0, n0, [ 1, 0 ], [ 1, 0 ] ];
      this.DrawExtrusionShape(owner, transform, vertices0, normals0, vertices0.length, segments, effect, color);

      const vertices1 = [
        [ length / 2 - length * pointerLength, 0 ],
        [ length / 2 - length * pointerLength, radius * 2 ],
        [ length / 2, 0 ]
      ];
      const n1 = LineNormal(vertices1[1], vertices1[2]);
      const normals1 = [ [ -1, 0 ], [ -1, 0 ], n1, n1 ];
      this.DrawExtrusionShape(owner, transform, vertices1, normals1, vertices1.length, segments, effect, color);

      // start + Y * length * pointerLength to start + Y * length * ( 1 - pointerLength ).
      vec3.set(DELTA, transform[4], transform[5], transform[6]);
      const lineStart = vec3.scaleAndAdd(vec3.create(), start, DELTA, length * pointerLength);
      const lineEnd = vec3.scaleAndAdd(vec3.create(), start, DELTA, length * (1 - pointerLength));
      this.DrawLine(owner, lineStart, lineEnd, color);
      return;
    }

    const vertices = [
      [ -length / 2, 0 ],
      [ -length / 2 + length * pointerLength, radius * 2 ],
      [ -length / 2 + length * pointerLength, radius ],
      [ length / 2 - pointerLength * length, radius ],
      [ length / 2 - pointerLength * length, radius * 2 ],
      [ length / 2, 0 ]
    ];
    const n0 = LineNormal(vertices[0], vertices[1]);
    const n1 = LineNormal(vertices[4], vertices[5]);
    const normals = [
      n0, n0,
      [ 1, 0 ], [ 1, 0 ],
      [ 0, 1 ], [ 0, 1 ],
      [ -1, 0 ], [ -1, 0 ],
      n1, n1
    ];
    this.DrawExtrusionShape(owner, transform, vertices, normals, vertices.length, segments, effect, color);
  }

  /**
   * Carbon DrawSphereArrow (cpp:606-658): a sphere profile that runs into an
   * arrow head along the direction, at least 3 segments.
   * @param {Tr2DebugObjectReference} owner
   * @param {vec3} center
   * @param {vec3} direction
   * @param {number} radius
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawSphereArrow(owner, center, direction, radius, segments, effect, color)
  {
    if (segments < 3)
    {
      segments = 3;
    }

    const transform = LineTransform(mat4.create(),
      vec3.subtract(LINE_START, center, direction),
      vec3.add(LINE_END, center, direction));

    const vertices = [];
    const normals = [];

    const arrowRadius = radius / 5;

    const threshold = Math.asin(arrowRadius / radius);
    for (let i = 0; i < segments; ++i)
    {
      let angle = Math.PI - i / (segments - 1) * Math.PI;
      let done = false;
      if (angle < threshold)
      {
        angle = threshold;
        done = true;
      }

      vertices.push([ Math.cos(angle) * radius, Math.sin(angle) * radius ]);
      normals.push([ Math.cos(angle), Math.sin(angle) ]);
      if (i && !done)
      {
        normals.push([ Math.cos(angle), Math.sin(angle) ]);
      }
      if (done)
      {
        break;
      }
    }
    normals.push([ 0, 1 ]);
    vertices.push([ 2 * radius, arrowRadius ]);
    normals.push([ 0, 1 ]);

    normals.push([ -1, 0 ]);
    vertices.push([ 2 * radius, 2 * arrowRadius ]);
    normals.push([ -1, 0 ]);

    vertices.push([ 2 * radius + 3 * arrowRadius, 0 ]);
    const n = LineNormal(vertices[vertices.length - 2], vertices[vertices.length - 1]);
    normals.push(n);
    normals.push(n);

    this.DrawExtrusionShape(owner, transform, vertices, normals, vertices.length, segments, effect, color);
  }

  /**
   * Carbon DrawAxis (cpp:660-665): red, green and blue arrows along the
   * transform's X, Y and Z rows.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number} effect An Effect value.
   */
  @blue.method
  @meta.implemented
  DrawAxis(owner, transform, effect)
  {
    const origin = vec3.fromValues(transform[12], transform[13], transform[14]);

    for (const [ row, axisColor ] of [ [ 0, AXIS_X_COLOR ], [ 4, AXIS_Y_COLOR ], [ 8, AXIS_Z_COLOR ] ])
    {
      vec3.set(AXIS_END, origin[0] + transform[row], origin[1] + transform[row + 1], origin[2] + transform[row + 2]);
      this.DrawArrow(owner, origin, AXIS_END, 0, 0.2, 10, effect, Tr2DebugColor.create__Color(axisColor));
    }
  }

  /**
   * Carbon DrawExtrusionShape (cpp:667-720): sweeps a 2D profile (x along
   * the Y axis, y as the distance from it) around Y in segments steps, at
   * least 3. Each profile edge j uses normals 2j and 2j + 1 for Lit.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number[][]} vertices Profile points.
   * @param {number[][]} normals Profile normals, two per edge.
   * @param {number} vertexCount
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawExtrusionShape(owner, transform, vertices, normals, vertexCount, segments, effect, color)
  {
    if (segments < 3)
    {
      segments = 3;
    }

    const Coords = (alpha, e) => vec3.fromValues(Math.sin(alpha) * e[1], e[0], Math.cos(alpha) * e[1]);
    const place = (alpha, e) => vec3.transformMat4(vec3.create(), Coords(alpha, e), transform);
    const normal = (alpha, e) => TransformNormal(vec3.create(), Coords(alpha, e), transform);

    for (let j = 0; j + 1 < vertexCount; ++j)
    {
      const e0 = vertices[j];
      const e1 = vertices[j + 1];
      for (let i = 0; i < segments; ++i)
      {
        const alpha0 = i / segments * 2 * Math.PI;
        const alpha1 = (i + 1) / segments * 2 * Math.PI;

        const p00 = place(alpha0, e0);
        const p10 = place(alpha1, e0);
        const p01 = place(alpha0, e1);
        const p11 = place(alpha1, e1);

        switch (effect)
        {
          case ITr2DebugRenderer2.Effect.Wireframe:
            this.DrawLine(owner, p00, p10, color);
            this.DrawLine(owner, p00, p01, color);
            this.DrawLine(owner, p01, p11, color);
            break;
          case ITr2DebugRenderer2.Effect.Solid:
            this.DrawTriangle__FaceNormal(owner, p00, p10, p01, ZERO, color);
            this.DrawTriangle__FaceNormal(owner, p10, p11, p01, ZERO, color);
            break;
          default:
          {
            const n0 = normals[j * 2];
            const n1 = normals[j * 2 + 1];

            const n00 = normal(alpha0, n0);
            const n10 = normal(alpha1, n0);
            const n01 = normal(alpha0, n1);
            const n11 = normal(alpha1, n1);

            this.DrawTriangle__VertexNormals(owner, p00, n00, p10, n10, p01, n01, color);
            this.DrawTriangle__VertexNormals(owner, p10, n10, p11, n11, p01, n01, color);
          }
        }
      }
    }
  }

  /**
   * Carbon DrawAudioSpeaker (cpp:967-1027): a narrow-to-wide cone and three
   * arcs of sound waves in front of it, at least 3 segments.
   * @param {Tr2DebugObjectReference} owner
   * @param {mat4} transform
   * @param {number} size
   * @param {number} segments
   * @param {number} effect An Effect value.
   * @param {Tr2DebugColor} color
   */
  @blue.method
  @meta.implemented
  DrawAudioSpeaker(owner, transform, size, segments, effect, color)
  {
    if (segments < 3)
    {
      segments = 3;
    }

    const coneWidth = size * 0.3;
    const coneHeight = size * 0.5;
    const waveOffset = size * 0.6;
    const waveSpacing = size * 0.2;
    const halfConeHeight = coneHeight * 0.5;
    const coneWidthNarrow = coneWidth * 0.3;

    const coneVertices = [
      [ -halfConeHeight, coneWidthNarrow ], // Back narrow end
      [ -halfConeHeight, coneWidthNarrow ],
      [ halfConeHeight, coneWidth ], // Front wide end
      [ halfConeHeight, coneWidth ]
    ];
    const coneNormals = [ [ -1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, 1 ] ];

    this.DrawExtrusionShape(owner, transform, coneVertices, coneNormals, coneVertices.length, segments, effect, color);

    const MAX_WAVE_SEGMENTS = 32;
    const waveSegments = Math.min(Math.max(Math.floor(segments / 2), 8), MAX_WAVE_SEGMENTS);

    const arcAngle = Math.PI * 0.6; // 108 degrees total arc
    const halfArcAngle = arcAngle * 0.5;
    const arcStep = arcAngle / waveSegments;

    const transformedWaveBase = vec3.transformMat4(SPEAKER_BASE, vec3.set(SPEAKER_BASE, halfConeHeight, 0, 0), transform);

    for (let wave = 0; wave < 3; ++wave)
    {
      const waveRadius = waveOffset + wave * waveSpacing;
      const arcPoints = [];
      const arcCount = waveSegments + 1;

      for (let i = 0; i < arcCount; ++i)
      {
        const angle = -halfArcAngle + i * arcStep;
        vec3.set(SPEAKER_OFFSET, 0, Math.cos(angle) * waveRadius, Math.sin(angle) * waveRadius);
        const transformedOffset = TransformNormal(SPEAKER_OFFSET, SPEAKER_OFFSET, transform);
        arcPoints.push(vec3.add(vec3.create(), transformedWaveBase, transformedOffset));
      }

      for (let i = 0; i < waveSegments; ++i)
      {
        this.DrawLine(owner, arcPoints[i], arcPoints[i + 1], color);
      }
    }
  }

  /**
   * Carbon BeginRender (cpp:819-825): call every frame before any Draw
   * method; drops last frame's primitives.
   */
  @blue.method
  @meta.implemented
  BeginRender()
  {
    this._lines.length = 0;
    this._triangles.length = 0;
    this._objectLineOffsets.length = 0;
    this._objectTriangleOffsets.length = 0;
  }

  /**
   * Carbon EndRender (cpp:827-876): call every frame after all Draw methods.
   * Draws and clears the queued debug text first, then uploads the lines, then the triangles, through the ring vertex buffer and
   * draws each with every pass of DebugPrimitive.fx under alpha blending.
   * @param {Tr2RenderContext} renderContext
   */
  @blue.method
  @meta.implemented
  EndRender(renderContext)
  {
    GetDebugTextRenderer().Render(renderContext);
    GetDebugTextRenderer().Clear();

    const shader = this._effect.GetShaderStateInterface();
    if (!shader)
    {
      return;
    }
    if (this._lines.length === 0 && this._triangles.length === 0)
    {
      return;
    }
    if (!this._vertexBuffer.IsValid() && !this._vertexBuffer.Create(VERTEX_BUFFER_INITIAL_SIZE))
    {
      return;
    }

    const esm = renderContext.GetEffectStateManager();
    esm.ApplyStandardStates(RenderingMode.RM_ALPHA);

    const handle = GetVertexDeclarationHandle();
    const passCount = shader.GetPassCount(0);

    const draw = (geometry, topology, verticesPerPrimitive) =>
    {
      if (geometry.length === 0)
      {
        return;
      }

      const data = PackVertices(geometry);
      const { result, offset } = this._vertexBuffer.PutData(data, data.byteLength, 4, renderContext);
      if (result === ALResult.S_OK)
      {
        esm.ApplyVertexDeclaration(handle);
        esm.ApplyStreamSource(0, this._vertexBuffer.GetBuffer(), offset, VERTEX_STRIDE);
        renderContext.SetTopology(topology);

        for (let passIx = 0; passIx < passCount; ++passIx)
        {
          shader.ApplyAllStateForPass(0, passIx, renderContext);
          this._effect.ApplyMaterialDataForPass(0, passIx, renderContext);
          renderContext.DrawPrimitive(0, Math.floor(geometry.length / verticesPerPrimitive));
        }
      }
      this._vertexBuffer.DoneUsingData(renderContext);
    };

    draw(this._lines, Topology.TOP_LINES, 2);
    draw(this._triangles, Topology.TOP_TRIANGLES, 3);
  }

  /**
   * Carbon DrawText (cpp:723-745): projects the world position to the screen
   * and queues the formatted text there on the shared text renderer, when the
   * point is between the clip planes.
   *
   * Not implemented: it needs Tr2Renderer::ProjectWorldToScreen (Tr2Renderer.cpp:493-506)
   * and the view and projection statics it reads, which are not ported.
   * @param {number} _font A TriDebugFont value.
   * @param {vec3} _pos
   * @param {Float32Array} _color
   * @param {string} _msg printf format.
   * @param {...*} _args
   */
  @blue.method
  @meta.notImplemented
  DrawText(_font, _pos, _color, _msg, ..._args)
  {
    throw new Error("Tr2DebugRenderer.DrawText is not implemented: Tr2Renderer.ProjectWorldToScreen is not ported.");
  }

  /**
   * Carbon Pick (cpp:747-817) draws every owner's primitives with
   * DebugPrimitivePicking.fx, keyed by the owner's object pointer split into
   * two 32-bit words.
   *
   * Not supported: JavaScript objects have no address to encode into the
   * picking target.
   */
  @blue.method
  @meta.notImplemented
  Pick(_readback, _renderContext)
  {
    throw new Error("Tr2DebugRenderer.Pick is not implemented: Carbon encodes object pointers, which JavaScript does not have.");
  }

  /**
   * Carbon SetSelectedObjects (cpp:878-888): (object, sub-object id) pairs;
   * null objects are skipped.
   * @param {Array<[object, number]>} objects
   */
  @blue.method
  @meta.implemented
  SetSelectedObjects(objects)
  {
    this._selectedObjects.clear();
    for (const [ object, area ] of objects)
    {
      if (object)
      {
        let areas = this._selectedObjects.get(object);
        if (areas === undefined)
        {
          areas = new Set();
          this._selectedObjects.set(object, areas);
        }
        areas.add(area >>> 0);
      }
    }
  }

  /**
   * Carbon SetOptions (cpp:890-906): an empty list removes the owner's
   * options, so it falls back to the defaults.
   * @param {object} owner
   * @param {string[]} options
   */
  @blue.method
  @meta.implemented
  SetOptions(owner, options)
  {
    if (options.length === 0)
    {
      this._options.delete(owner);
      return;
    }

    this._options.set(owner, new Set(options));
  }

  /**
   * Carbon GetColorForOption (cpp:908-917), with its output parameter as the
   * return value (skill rule 11), which is also what the exposed
   * PyGetColorForOption returns (cpp:925-941).
   * @param {string} option
   * @returns {Float32Array|null} A copy of the colour, or null when none is set.
   */
  @blue.method
  @meta.implemented
  GetColorForOption(option)
  {
    const found = this._optionColors.get(option);
    return found === undefined ? null : vec4.clone(found);
  }

  /**
   * Carbon SetColorForOption (cpp:919-923).
   * @param {string} option
   * @param {Float32Array} color
   */
  @blue.method
  @meta.implemented
  SetColorForOption(option, color)
  {
    this._optionColors.set(option, vec4.clone(color));
  }

  /**
   * Carbon GetOptions (cpp:943-952): the owner's own options, if any.
   * @param {object} owner
   * @returns {string[]}
   */
  @blue.method
  @meta.implemented
  GetOptions(owner)
  {
    const found = this._options.get(owner);
    return found === undefined ? [] : Array.from(found);
  }

  /**
   * Carbon SetDefaultOptions (cpp:954-958).
   * @param {string[]} options
   */
  @blue.method
  @meta.implemented
  SetDefaultOptions(options)
  {
    this._defaultOptions = new Set(options);
  }

  /**
   * Carbon GetDefaultOptions (cpp:960-965).
   * @returns {string[]}
   */
  @blue.method
  @meta.implemented
  GetDefaultOptions()
  {
    return Array.from(this._defaultOptions);
  }

  /** Carbon Tr2DebugRenderer::Vertex (private, Tr2DebugRenderer.h:112-124). */
  static Vertex = Tr2DebugRendererVertex;

}
