import { vec4 } from "#math/vec4";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dDisplayList.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dDisplayList.cpp
import { meta } from "#schema";
import { mat4 } from "#math/mat4";
import { Tr2BufferAL } from "#trinityal";
import { ShaderType, Topology } from "#consts/render-context";
import { Tr2RenderUtils } from "../core/Tr2RenderUtils.js";
import { PER_OBJECT_VS_GUI } from "../core/Tr2Renderer.js";

/** Carbon's captured UI geometry. Device reset callers must explicitly release it;
 * the native Tr2DeviceResource registration base has not been ported yet. */
export class Tr2Sprite2dDisplayList
{
  vertexBuffer = new Tr2BufferAL();
  indexBuffer = new Tr2BufferAL();
  entries = [];
  _owner = null;

  /** Retains the owner to invalidate when captured resources are released. */
  constructor(owner) { this._owner = owner; }

  /** Native release drops geometry and dirties the owner for recapture. */
  @meta.implemented
  ReleaseResources(_storage)
  {
    this.vertexBuffer.Destroy();
    this.indexBuffer.Destroy();
    this.entries.length = 0;
    this._owner.SetDirty();
  }

  /** Explicit equivalent of the native destructor: JS has no deterministic destruction. */
  @meta.ours
  Destroy()
  {
    this.vertexBuffer.Destroy();
    this.indexBuffer.Destroy();
    this.entries.length = 0;
  }
}

/** Carbon's nested Tr2Sprite2dDisplayList::Entry render callback. */
export class Tr2Sprite2dDisplayListEntry
{
  job = null;
  numVertices = 0;
  startIndex = 0;
  primitiveCount = 0;
  texelSize0 = vec4.create();
  texelSize1 = vec4.create();
  texture0 = null;
  texture1 = null;
  effect = null;
  transformArray = Array.from({ length: 32 }, () => mat4.create()); // alloc: per-instance transform palette, retained for subsequent draws
  _uiTransformsCb = null;
  _transposedTransforms = new Float32Array(32 * 16); // alloc: per-instance packed matrix palette, not a vector

  /** Native transpose/upload/draw; typed arrays replace the native stack matrix array. */
  @meta.adapted
  SubmitGeometry(context)
  {
    for (let i = 0; i < 32; i++) mat4.transpose(this._transposedTransforms.subarray(i * 16, (i + 1) * 16), this.transformArray[i]);
    Tr2RenderUtils.fillAndSetConstants(this._uiTransformsCb, this._transposedTransforms, this._transposedTransforms.byteLength, 1 << ShaderType.VERTEX_SHADER, PER_OBJECT_VS_GUI, context);
    context.SetTopology(Topology.TOP_TRIANGLES);
    context.DrawIndexedPrimitive(this.numVertices, this.startIndex, this.primitiveCount);
  }
}
