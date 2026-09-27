// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveMeshOverlayEffect.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildMesh.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.cpp
import { TriBatchType } from "#consts/graphics";
import { Tr2RenderBatch, TriRenderBatchAreaBlock } from "../../core/batch/TriRenderBatch/index.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { CarbonVertexElements } from "../../core/vertex/vertexUsage.js";
import { EveMeshOverlayEffect } from "./EveMeshOverlayEffect.js";


/**
 * Builds Carbon's two cached overlay area-block lists for a normal mesh.
 * TYPE_ALL contains opaque, transparent and decal areas; TYPE_OPAQUEONLY
 * contains opaque areas alone. Tr2MeshBase applies Carbon's shadow-casting
 * filter while collecting opaque blocks.
 */
export function CollectOverlayAreaBlocks(mesh, out = [ [], [] ])
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


/**
 * Builds the same cached overlay blocks for an EveChildInstancedMesh record,
 * whose authored areas are plain descriptors rather than Tr2MeshArea objects.
 */
export function CollectInstancedOverlayAreaBlocks(mesh, out = [ [], [] ])
{
  for (const blocks of out) blocks.length = 0;

  for (const area of mesh.areas)
  {
    if (area.batchType === TriBatchType.TRIBATCHTYPE_OPAQUE ||
      area.batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT ||
      area.batchType === TriBatchType.TRIBATCHTYPE_DECAL)
    {
      out[EveMeshOverlayEffect.OverlayType.TYPE_ALL].push(
        new TriRenderBatchAreaBlock(area.areaIndex, area.areaCount));
    }

    if (area.batchType === TriBatchType.TRIBATCHTYPE_OPAQUE)
    {
      out[EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY].push(
        new TriRenderBatchAreaBlock(area.areaIndex, area.areaCount));
    }
  }

  for (const blocks of out) TriRenderBatchAreaBlock.Optimize(blocks);
  return out;
}


/** Emits one overlay vector over its batch-type-selected area blocks. */
export function EmitOverlayBatches(
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
      for (const block of blocks)
      {
        committed = CommitOverlayBlock(
          accumulator, perObjectData, effect, geometry, meshIndex, block, lod, 0) || committed;
      }
    }
  }

  return committed;
}


/** Emits Carbon's maximum-priority armor/hull damage pass over TYPE_ALL. */
export function EmitDamageOverlayBatches(
  accumulator,
  perObjectData,
  effect,
  areaBlocks,
  geometry,
  meshIndex,
  lod = null)
{
  let committed = false;
  for (const block of areaBlocks[EveMeshOverlayEffect.OverlayType.TYPE_ALL])
  {
    committed = CommitOverlayBlock(
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
function CommitOverlayBlock(
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
