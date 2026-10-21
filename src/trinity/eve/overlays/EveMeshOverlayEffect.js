import { exposure as be } from "#be";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveMeshOverlayEffect.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveMeshOverlayEffect.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveMeshOverlayEffect_Blue.cpp
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { ITr2ControllerOwner } from "../../controllers/ITr2ControllerOwner.js";
import { TriBatchType } from "#consts/graphics";
import { meta, type, blue } from "#schema";
import { BLUELISTEVENT } from "#consts/blue";
import { Tr2RenderBatch, TriRenderBatchAreaBlock } from "../../core/batch/TriRenderBatch/index.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { CarbonVertexElements } from "../../core/vertex/vertexUsage.js";


/**
 * Named overlay pass attached to a mesh, holding one effect list per batch type
 * together with the curve set and controllers that animate them.
 */
@be.define("EveMeshOverlayEffect")
@blue.inherit(IInitialize, IListNotify, ITr2ControllerOwner, ITr2CurveSetOwner)
@be.mapInterface(IInitialize)
@be.mapInterface(IListNotify)
@be.mapInterface(ITr2ControllerOwner)
@be.mapInterface(ITr2CurveSetOwner)
export class EveMeshOverlayEffect
{
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.read
  @blue.persist
  @type.list("ITr2Controller")
  controllers = [];

  @blue.readwrite
  @blue.persist
  @type.rootRef("TriCurveSet")
  curveSet = null;

  @blue.read
  @blue.persist
  @type.list("Tr2Effect")
  additiveEffects = [];

  @blue.read
  @blue.persist
  @type.list("Tr2Effect")
  decalEffects = [];

  @blue.read
  @blue.persist
  @type.list("Tr2Effect")
  distortionEffects = [];

  @blue.read
  @blue.persist
  @type.list("Tr2Effect")
  opaqueEffects = [];

  @blue.read
  @blue.persist
  @type.list("Tr2Effect")
  transparentEffects = [];

  @blue.readwrite
  @type.boolean
  update = true;

  @blue.readwrite
  @type.boolean
  display = true;

  /**
   * Returns the effect list for a batch type, or null when the overlay is hidden
   * or the batch type has no list of its own.
   *
   * Adapted: Carbon reports success through a bool out-parameter; JavaScript returns null
   * for unsupported or hidden batches.
   */
  @blue.method
  @meta.adapted
  GetEffects(batchType)
  {
    if (!this.display) return null;

    switch (batchType)
    {
      case TriBatchType.TRIBATCHTYPE_OPAQUE: return this.opaqueEffects;
      case TriBatchType.TRIBATCHTYPE_DECAL: return this.decalEffects;
      case TriBatchType.TRIBATCHTYPE_TRANSPARENT: return this.transparentEffects;
      case TriBatchType.TRIBATCHTYPE_ADDITIVE: return this.additiveEffects;
      case TriBatchType.TRIBATCHTYPE_DISTORTION: return this.distortionEffects;
      default: return null;
    }
  }

  /**
   * Reports whether the overlay applies to the opaque batch alone or to all
   * batches, given the batch type being queried.
   */
  @blue.method
  @meta.implemented
  GetType(batchType)
  {
    return batchType === TriBatchType.TRIBATCHTYPE_OPAQUE
      ? EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY
      : EveMeshOverlayEffect.OverlayType.TYPE_ALL;
  }

  /**
   * Reports whether the overlay contributes any transparent effects, which
   * decides whether it needs a transparent pass.
   */
  @blue.method
  @meta.implemented
  HasTransparentArea()
  {
    return this.transparentEffects.length > 0;
  }

  /** Sets a shader option on every effect across all five batch lists. */
  @blue.method
  @meta.implemented
  SetShaderOption(name, value)
  {
    for (const effects of this._effectLists())
    {
      for (const effect of effects) effect.SetOption(name, value);
    }
  }

  /**
   * Links each controller that is not already linked to this overlay so it can
   * resolve the overlay's variables; always succeeds.
   *
   * Adapted: Blue root locking is represented by the hydrated JavaScript object identity.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked()) controller?.Link(this);
    }
    return true;
  }

  /**
   * Applies a Blue list notification for the controller list: links inserted
   * controllers, unlinks removed ones and unlinks all of them on unload start;
   * loading events and notifications for any other list are ignored.
   *
   * Adapted: Plain JavaScript arrays do not raise Blue IList notifications; callers forward
   * the equivalent event explicitly.
   */
  @blue.method
  @meta.adapted
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.controllers)
  {
    if (list !== this.controllers || (event & BLUELISTEVENT.BELIST_LOADING) !== 0) return;

    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        value?.Link(this);
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        value?.Unlink();
        break;
      case BLUELISTEVENT.BELIST_UNLOADSTART:
        for (const controller of this.controllers) controller?.Unlink();
        break;
    }
  }

  /** Forwards a named variable value to every controller. */
  @blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    for (const controller of this.controllers) controller?.SetVariable(name, value);
  }

  /** Forwards a named event to every controller. */
  @blue.method
  @meta.implemented
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller?.HandleEvent(name);
  }

  /** Starts every controller attached to the overlay. */
  @blue.method
  @meta.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start();
  }

  /**
   * Plays the overlay's curve set when its name matches: a named time range
   * plays that range, otherwise the range is reset and the set plays from the
   * start; a name that does not match is ignored.
   */
  @blue.method
  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    const curveSet = this._matchingCurveSet(name);
    if (!curveSet) return;
    if (rangeName) curveSet.PlayTimeRange(rangeName);
    else
    {
      curveSet.ResetTimeRange();
      curveSet.Play();
    }
  }

  /**
   * Stops the overlay's curve set when its name matches, and does nothing
   * otherwise.
   */
  @blue.method
  @meta.implemented
  StopCurveSet(name)
  {
    this._matchingCurveSet(name)?.Stop();
  }

  /**
   * Returns the longest curve duration in the named curve set, or 0 when the
   * name does not match the overlay's set.
   */
  @blue.method
  @meta.implemented
  GetCurveSetDuration(name)
  {
    // Carbon cpp:240-254: max( 0, duration ) when the name matches.
    const curveSet = this._matchingCurveSet(name);
    return curveSet ? Math.max(0, curveSet.GetMaxCurveDuration()) : 0;
  }

  /**
   * Returns the duration of a named time range within the named curve set, or 0
   * when either name does not match.
   */
  @blue.method
  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    // Carbon cpp:256-271.
    const curveSet = this._matchingCurveSet(name);
    return curveSet ? Math.max(0, curveSet.GetRangeDuration(rangeName)) : 0;
  }

  /**
   * Advances the curve set with the supplied real and simulation times and steps
   * every controller, matching Carbon's fixed 0.5 controller step; skipped
   * entirely when updates are disabled or no curve set is assigned.
   */
  @blue.method
  @meta.implemented
  Update(realTime, simTime)
  {
    if (!this.update || !this.curveSet) return;
    this.curveSet.Update__RealTimeSimTime(realTime, simTime);
    for (const controller of this.controllers) controller?.Update(0.5);
  }

  /**
   * Returns the five per-batch effect lists so callers can apply an operation to
   * every effect the overlay owns.
   */
  _effectLists()
  {
    return [
      this.opaqueEffects,
      this.decalEffects,
      this.transparentEffects,
      this.additiveEffects,
      this.distortionEffects
    ];
  }

  /**
   * Returns the owned curve set when its name matches the requested one,
   * otherwise null.
   */
  _matchingCurveSet(name)
  {
    const curveSet = this.curveSet;
    return curveSet?.GetName() === name ? curveSet : null;
  }

  // Carbon's free functions declared in EveMeshOverlayEffect.h:107-133, as statics on their owner.
  // The two EmitOverlayBatches overloads differ only in their vector type, one array in JS.

  /**
   * Builds Carbon's two cached overlay area-block lists for a normal mesh.
   * TYPE_ALL contains opaque, transparent and decal areas; TYPE_OPAQUEONLY
   * contains opaque areas alone. Tr2MeshBase applies Carbon's shadow-casting
   * filter while collecting opaque blocks.
   */
  static collectOverlayAreaBlocks(mesh, out = [ [], [] ])
  {
    for (const blocks of out) blocks.length = 0;

    const all = out[EveMeshOverlayEffect.OverlayType.TYPE_ALL];
    mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_OPAQUE);
    mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_TRANSPARENT);
    mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_DECAL);
    mesh.CollectAreaBlocks(
      out[EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY],
      TriBatchType.TRIBATCHTYPE_OPAQUE);

    for (const blocks of out) TriRenderBatchAreaBlock.Optimize(blocks);
    return out;
  }

  /** Emits one overlay vector over its batch-type-selected area blocks. */
  static emitOverlayBatches(
    accumulator,
    perObjectData,
    batchType,
    overlays,
    areaBlocks,
    geometry,
    meshIndex,
    lod = null)
  {
    let committed = false;

    for (const overlay of overlays)
    {
      const effects = overlay.GetEffects(batchType);
      if (!effects) continue;

      const blocks = areaBlocks[overlay.GetType(batchType)];
      for (const effect of effects)
      {
        // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
        if (!effect.IsGood()) continue;
        for (const block of blocks)
        {
          committed = EveMeshOverlayEffect._commitOverlayBlock(
            accumulator, perObjectData, effect, geometry, meshIndex, block, lod, 0) || committed;
        }
      }
    }

    return committed;
  }

  /** Emits Carbon's maximum-priority armor/hull damage pass over TYPE_ALL. */
  static emitDamageOverlayBatches(
    accumulator,
    perObjectData,
    effect,
    areaBlocks,
    geometry,
    meshIndex,
    lod = null)
  {
    // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
    if (!effect.IsGood()) return false;
    let committed = false;
    for (const block of areaBlocks[EveMeshOverlayEffect.OverlayType.TYPE_ALL])
    {
      committed = EveMeshOverlayEffect._commitOverlayBlock(
        accumulator, perObjectData, effect, geometry, meshIndex, block, lod, 0xffffffff) || committed;
    }
    return committed;
  }

  /**
   * One overlay block batch (EveMeshOverlayEffect.cpp:338-351): the LOD's mesh
   * declaration and allocations, drawn over the block's areas. The declaration
   * is interned from the mesh's decoded elements, as Tr2MeshBase's area batches
   * do; the LOD rides on the geometry source so the render context realizes
   * the same LOD the draw arguments were resolved against.
   */
  static _commitOverlayBlock(
    accumulator,
    perObjectData,
    material,
    geometry,
    meshIndex,
    block,
    lod,
    priority)
  {
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(material);
    if (!batch.IsValid()) return false;

    batch.SetGeometrySource(geometry, meshIndex, block.startIndex, block.count, false, lod);

    const elements = CarbonVertexElements(geometry.GetMeshVertexElements(meshIndex));
    if (elements.length)
    {
      batch.SetVertexDeclaration(Tr2EffectStateManager.getVertexDeclarationHandle(elements));
    }

    batch.SetPerObjectData(perObjectData);
    if (priority !== 0) batch.SetPriority(priority);

    const draw = Tr2RenderBatch.resolveDrawArguments(
      lod, block.startIndex, block.count, false);
    if (!draw) return false;

    batch.SetDrawIndexedInstanced(
      draw.indexCountPerInstance,
      draw.instanceCount,
      draw.startIndexLocation,
      draw.baseVertexLocation,
      draw.startInstanceLocation);

    return accumulator.Commit(batch) === true;
  }

  static OverlayType = Object.freeze({
    TYPE_OPAQUEONLY: 0,
    TYPE_ALL: 1,
    TYPE_COUNT: 2
  });
}
