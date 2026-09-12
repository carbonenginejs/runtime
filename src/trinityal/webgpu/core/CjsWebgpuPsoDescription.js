// Source: trinity/trinityal/dx12/util/PsoDescription.h
//   trinity/trinityal/dx12/util/PsoDescription.cpp
//   trinity/trinityal/dx12/Tr2RenderContextDx12.cpp (the setters and SetAllState)
//
// The pipeline description a draw resolves, and the fourth piece of the
// immediate-draw route.
//
// WHAT CARBON DOES. Its backend does not assemble a pipeline per draw. The
// setters describe one incrementally and mark it dirty
// (`Tr2RenderContextDx12.cpp:315-338`: each compares before dirtying, so a
// redundant apply costs nothing), and the draw resolves it:
//
//     m_psoDescription.UpdateHash();                                  // cpp:793
//     auto found = m_ownerDevice->m_pipelineStates.find( m_psoDescription );
//     if( found != end ) return found->second;
//     m_psoDescription.CreatePipelineState( device, pipelineState );
//     m_ownerDevice->m_pipelineStates[ m_psoDescription ] = pipelineState;
//
// THE CACHE IS ON THE DEVICE, NOT THE CONTEXT (`Tr2PrimaryRenderContextDx12.h:319`),
// which is why two contexts drawing the same material share one pipeline. Ours
// is `CjsWebgpuPipelineCache`, already on `CjsWebgpuDevice` and already serving
// the batch path - this describes, and hands the description to that.
//
// Carbon's fields, and where each lives here:
//
//   m_vertexLayout        -> vertexBufferLayouts, from the bound layout
//   m_shaderProgram       -> shaderProgram, a CjsWebgpuShaderProgramAL
//   m_topologyType        -> topology, mapped through the AL's own table
//   m_blendDesc           }
//   m_rasterizerDesc      }  all three -> renderStateSetup + overrides, which
//   m_depthStencilDesc    }  `GetWebgpuRecipe` projects. WebGPU folds state into
//                            a pipeline at creation, so the three descriptors
//                            are one projection rather than three structs.
//   m_renderTargetFormats -> colorFormats
//   m_depthStencilFormat  -> depthFormat
//   m_sampleDesc          -> sampleCount
//   m_vertexStreamMask    -> derived from vertexBufferLayouts
//
// THE PROJECTION IS NOT REIMPLEMENTED HERE. `Tr2RenderStateSetup.GetWebgpuRecipe`
// already turns an interpreted setup into WebGPU state, applies the render-state
// overrides while doing it, and refuses a fill mode WebGPU cannot rasterize. A
// second translator is the mistake this whole lane exists to undo.
import { CjsSchema } from "#schema";
import { RenderPipelineKey } from "./CjsWebgpuPipelineCache.js";
import { TOPOLOGIES } from "./topology.js";


/**
 * A pipeline description, filled by the abstraction layer's setters.
 *
 * Carbon's `PSODescription` is a plain struct with an `operator==` and a hash;
 * this is the same, with `GetKey` standing in for both because a canonical key
 * compares and hashes at once.
 */
export class CjsWebgpuPsoDescription
{
  /** m_shaderProgram */
  shaderProgram = null;

  /** m_vertexLayout, as WebGPU buffer layouts. */
  vertexBufferLayouts = [];

  /** m_topologyType, in the abstraction layer's vocabulary. */
  topology = null;

  /** The authored state, projected at resolve time. */
  renderStateSetup = null;

  /** The state manager's overrides, applied by the projection. */
  renderStateOverrides = null;

  /** m_renderTargetFormats[MAX_RENDER_TARGET] */
  colorFormats = [];

  /** m_depthStencilFormat; null means no depth attachment. */
  depthFormat = null;

  /** m_sampleDesc, reduced to the one field WebGPU exposes. */
  sampleCount = 1;

  /**
   * Whether the description names everything a pipeline needs.
   *
   * Carbon's `GetPipelineState` returns null and `SetAllState` fails
   * (`cpp:847-851`) rather than creating a partial pipeline; this is the same
   * check, made before the attempt so the caller can say what is missing.
   *
   * @returns {string|null} What is missing, or null when complete.
   */
  GetMissing()
  {
    if (!this.shaderProgram || !this.shaderProgram.IsValid()) return "a linked shader program";
    if (!this.renderStateSetup) return "a render-state setup";
    if (this.topology === null || TOPOLOGIES[this.topology] === undefined) return "a topology WebGPU can draw";
    if (this.colorFormats.length === 0 && this.depthFormat === null) return "a colour or depth attachment";

    return null;
  }

  /**
   * The WebGPU pipeline descriptor this description resolves to.
   *
   * Carbon's `CreatePipelineState` builds a `D3D12_GRAPHICS_PIPELINE_STATE_DESC`
   * from the same fields. Ours produces the recipe shape the device's pipeline
   * factory already takes from the batch path, so both paths create pipelines
   * the same way.
   *
   * @returns {object} The recipe.
   */
  BuildRecipe()
  {
    const projected = this.renderStateSetup.GetWebgpuRecipe({
      depthFormat: this.depthFormat,
      invertedDepthTest: !!this.renderStateOverrides?.invertedDepthTest,
      invertedCullMode: !!this.renderStateOverrides?.invertedCullMode
    });

    return {
      ...projected,
      primitive: { ...projected.primitive, topology: TOPOLOGIES[this.topology] },
      vertex: { buffers: this.vertexBufferLayouts },
      fragment: {
        targets: this.colorFormats.map(format => ({ format, blend: projected.blend ?? undefined }))
      },
      multisample: { count: this.sampleCount }
    };
  }

  /**
   * The cache key, which is Carbon's `UpdateHash` plus `operator==` at once.
   *
   * Two descriptions with the same key resolve to the same pipeline, which is
   * the whole point of describing rather than assembling: a frame that draws
   * two hundred objects through one material creates one pipeline.
   *
   * @returns {string|null} The key, or null when the description is incomplete.
   */
  GetKey()
  {
    if (this.GetMissing()) return null;

    // A real program names itself; a stand-in keys on its own fields. Metal
    // hashes the function pointers for this (`MetalWorkQueue.mm:1610-1611`),
    // and canonicalising a program's modules would serialise device objects.
    const identity = typeof this.shaderProgram.GetIdentity === "function"
      ? this.shaderProgram.GetIdentity()
      : this.shaderProgram;

    return RenderPipelineKey(identity, this.BuildRecipe());
  }

  /**
   * Whether two descriptions resolve to the same pipeline.
   *
   * @param {CjsWebgpuPsoDescription} other The description to compare.
   * @returns {boolean} True when both are complete and equal.
   */
  Equals(other)
  {
    if (!other) return false;

    const key = this.GetKey();

    return key !== null && key === other.GetKey();
  }
}


// DECLARED AS A CALL, NOT A DECORATOR. The abstraction layer is imported
// straight from source by its tests - `#trinityal/...` resolves to `src/` - and
// raw Node cannot parse decorator syntax, so a decorator here breaks every test
// that reaches this file without a build first. `CjsSchema.define` is the same
// metadata through the door the schema already provides for exactly this, and
// it keeps the layer free of the decorator chain it has never carried.
CjsSchema.define(CjsWebgpuPsoDescription, { className: "CjsWebgpuPsoDescription", carbon: "PSODescription" });
