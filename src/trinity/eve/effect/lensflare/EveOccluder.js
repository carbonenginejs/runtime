import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/EveOccluder.h
// Source: trinity/trinity/Eve/EveOccluder.cpp
import { meta, type, blue } from "#schema";
import { RenderingMode, TriBatchType } from "#consts/graphics";
import { EffectKeyGenerator, TriRenderBatchAccumulator } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2VariableStore } from "../../../core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "../../../generated/trinityCore/enums.js";
import { EveUpdateContext } from "../../EveUpdateContext.js";

/** The bits of a uint32 read as a float32: Carbon's `*reinterpret_cast<float*>( &bufferOffset )`. */
const bitsAsFloat = value => new Float32Array(new Uint32Array([ value >>> 0 ]).buffer)[0];

/**
 * A lens flare's occlusion test: sprites drawn against the scene depth whose
 * shader counts, into the flare's FlareOcclusionBuffer slot, how many of
 * their pixels pass. Tr2OcclusionBuffer's CopyCounters turns the counts into
 * the visibility the flare and the god rays read.
 */
@blue.define({ className: "EveOccluder", purpose: "Groups sprite occlusion elements that can be displayed as one named EVE scene effect." })
@blue.inherit(IRoot)
export class EveOccluder
{

  /** m_sprites (PEveTransformVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveTransform")
  sprites = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  display = true;

  /** m_batches (h:82): the accumulator the sprites' batches are drawn from (cpp:115-119). */
  _batches = new TriRenderBatchAccumulator(EffectKeyGenerator);

  /**
   * Carbon EveOccluder::RunQuery (cpp:150-185): publishes the counter slot and
   * the fog weight, then draws each sprite opaque against the bound depth.
   * The sprites' shader (lensflareoccluder) adds each covered pixel, and each
   * pixel with nothing in front, into the two counters at the slot.
   *
   * Adapted: the accumulator's pool allocator is bound per call from the
   * render context (Carbon's constructor takes Tr2Renderer's, cpp:136-137).
   * The two globals are Carbon's float overload, so their type is stated.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {EveUpdateContext} updateContext The scene's update context.
   * @param {Float32Array} transform The lensflare's transform.
   * @param {number} bufferOffset The counter slot (Tr2OcclusionBuffer.getOccluderOffset).
   * @param {number} fogWeight 1 for foreground occluders, 0 for background.
   * @returns {void}
   */

  @meta.adapted
  RunQuery(renderContext, updateContext, transform, bufferOffset, fogWeight)
  {
    if (!this.display) return;

    const store = Tr2VariableStore.globalStore();
    store.RegisterVariableType("OcclusionBufferOffset", TriVariableContentType.TRIVARIABLE_FLOAT).SetValue(bitsAsFloat(bufferOffset));
    store.RegisterVariableType("OcclusionFogWeight", TriVariableContentType.TRIVARIABLE_FLOAT).SetValue(fogWeight);

    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_OPAQUE);

    // The sprites' own view update goes through the parent transform; the
    // synchronous pass gets an empty context, as Carbon's dummyContext.
    const renderables = [];
    const dummyContext = EveOccluder._dummyContext;
    for (const sprite of this.sprites)
    {
      sprite.UpdateSyncronous(dummyContext);
      sprite.UpdateVisibility(updateContext, transform);
      sprite.GetRenderables__Impostors(renderables, null);
    }

    // Only the opaque areas matter for an occlusion query (cpp:173-179).
    // Carbon's accumulator takes Tr2Renderer's pool allocator at construction
    // (cpp:117-118); ours lives on the render context, so it is bound here.
    const batches = this._batches;
    batches.SetTriPoolAllocator(renderContext.GetTriPoolAllocator());
    for (const renderable of renderables)
    {
      const objectData = renderable.GetPerObjectData(batches);
      renderable.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, objectData);
    }
    batches.Finalize();

    renderContext.RenderBatches(batches);
    batches.Clear();
  }

  /** Carbon's stack-local `EveUpdateContext dummyContext` (cpp:166). */
  static _dummyContext = new EveUpdateContext();

}
