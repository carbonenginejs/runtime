// Source: trinity/trinityal/metal/MetalWorkQueue.h
//
// DROPPED AS A RECORD, LIVE UNDER OUR OWN VOCABULARY. Metal derives per-stage
// bind masks so the work queue can skip rebinding slots a shader does not read.
// CjsWebgpuShaderAL carries the same information - its head comment says so in
// as many words, "METAL'S m_resourceMask, IN THIS BACKEND'S VOCABULARY" - as the
// stage bindings a bind group layout is built from, because WebGPU resolves
// binding validity at layout creation rather than per draw.
//
// The four uint32 masks and the textureTypes array below are what that
// vocabulary replaces, kept here so the correspondence is checkable.
import { meta } from "#schema";

/** Carbon's per-stage bind masks; dropped because WebGPU resolves binding validity in the bind group layout. */
@meta.define({ className: "ShaderResourceMask", carbon: "ShaderResourceMask", family: "trinityal" })
export class ShaderResourceMask
{

  /** constantBufferMask (uint32_t) */
  @meta.type.uint32
  constantBufferMask = 0;

  /** bufferMask (uint32_t) */
  @meta.type.uint32
  bufferMask = 0;

  /** textureMask (uint32_t) */
  @meta.type.uint32
  textureMask = 0;

  /** samplerMask (uint32_t) */
  @meta.type.uint32
  samplerMask = 0;

  /** textureTypes[METAL_MAX_BOUND_TEXTURES] (uint8_t) */
  @meta.type.unknown
  textureTypes = null;

  /** Clears the four bind masks; textureTypes is left alone, as in Carbon. */
  ResetMasks()
  {
    this.constantBufferMask = 0;
    this.bufferMask = 0;
    this.textureMask = 0;
    this.samplerMask = 0;
  }

}
