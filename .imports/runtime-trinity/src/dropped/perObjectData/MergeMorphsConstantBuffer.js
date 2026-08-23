// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveChildMesh.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/perObjectData/MergeMorphsConstantBuffer.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** MergeMorphsConstantBuffer (eve/perObjectData) - generated from schema shapeHash d2be9c7e.... */
@type.define({ className: "MergeMorphsConstantBuffer", family: "eve/perObjectData" })
export class MergeMorphsConstantBuffer extends CjsModel
{

  /** morphTargetVertexDataOffset (uint32_t) */
  @type.uint32
  morphTargetVertexDataOffset = 0;

  /** morphTargetAnimationDataOffset (uint32_t) */
  @type.uint32
  morphTargetAnimationDataOffset = 0;

  /** activeMorphTargetsCount (uint32_t) */
  @type.uint32
  activeMorphTargetsCount = 0;

  /** bakedMorphTargetVertexDataOffset (uint32_t) */
  @type.uint32
  bakedMorphTargetVertexDataOffset = 0;

  /** vertexDataOffset (uint32_t) */
  @type.uint32
  vertexDataOffset = 0;

  /** vertexDataStride (uint32_t) */
  @type.uint32
  vertexDataStride = 0;

  /** vertexDataPositionOffset (uint32_t) */
  @type.uint32
  vertexDataPositionOffset = 0;

  /** vertexDataTangentOffset (uint32_t) */
  @type.uint32
  vertexDataTangentOffset = 0;

  /** vertexCount (uint32_t) */
  @type.uint32
  vertexCount = 0;

  /** padding1 (uint32_t) */
  @type.uint32
  padding1 = 0;

  /** padding2 (uint32_t) */
  @type.uint32
  padding2 = 0;

  /** padding3 (uint32_t) */
  @type.uint32
  padding3 = 0;

}
