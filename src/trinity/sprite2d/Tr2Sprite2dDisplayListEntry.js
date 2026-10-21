// Source: trinity/trinity/Sprite2d/Tr2Sprite2dDisplayList.h:23-43
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dDisplayList.cpp:121-139
// Carbon's nested struct Tr2Sprite2dDisplayList::Entry; split out of
// Tr2Sprite2dDisplayList.js so the class is findable by its own name.
import { vec4 } from "#math/vec4";
import { meta, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { ShaderType, Topology } from "#consts/render-context";
import { Tr2RenderUtils } from "../core/Tr2RenderUtils.js";
import { PER_OBJECT_VS_GUI } from "../core/Tr2Renderer.js";

/** Carbon's nested Tr2Sprite2dDisplayList::Entry render callback. */
@meta.define({"className":"Tr2Sprite2dDisplayListEntry","carbon":"Tr2Sprite2dDisplayList::Entry"})
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
  /** Carbon's public Entry::m_uiTransformsCb (Tr2Sprite2dDisplayList.h:38): the scene's transform constant buffer. @type {object|null} */
  uiTransformsCb = null;
  _transposedTransforms = new Float32Array(32 * 16); // alloc: per-instance packed matrix palette, not a vector

  /** Native transpose/upload/draw; typed arrays replace the native stack matrix array. */
  @meta.adapted
  @blue.method
  SubmitGeometry(context)
  {
    for (let i = 0; i < 32; i++) mat4.transpose(this._transposedTransforms.subarray(i * 16, (i + 1) * 16), this.transformArray[i]);
    Tr2RenderUtils.fillAndSetConstants(this.uiTransformsCb, this._transposedTransforms, this._transposedTransforms.byteLength, 1 << ShaderType.VERTEX_SHADER, PER_OBJECT_VS_GUI, context);
    context.SetTopology(Topology.TOP_TRIANGLES);
    context.DrawIndexedPrimitive(this.numVertices, this.startIndex, this.primitiveCount);
  }
}
