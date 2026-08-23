import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';

let _initClass, _init_positionOffset, _init_extra_positionOffset, _init_boneOffset, _init_extra_boneOffset, _init_boneWeightsOffset, _init_extra_boneWeightsOffset, _init_mesh, _init_extra_mesh, _init_area, _init_extra_area, _init_material, _init_extra_material, _init_perObjectData, _init_extra_perObjectData, _init_vertexBufferData, _init_extra_vertexBufferData, _init_worldTransform, _init_extra_worldTransform, _init_materialIndex, _init_extra_materialIndex, _init_isTransparent, _init_extra_isTransparent, _init_bakedMorphOffset, _init_extra_bakedMorphOffset, _init_geometryData, _init_extra_geometryData, _init_threadLocalGeometryData, _init_extra_threadLocalGeometryData, _init_tlas, _init_extra_tlas, _init_skinVerticesEffect, _init_extra_skinVerticesEffect, _init_skinVerticesData, _init_extra_skinVerticesData, _init_skinnedVertices, _init_extra_skinnedVertices, _init_usedResources, _init_extra_usedResources, _init_threadLocalUsedResources, _init_extra_threadLocalUsedResources, _init_instanceCount, _init_extra_instanceCount, _init_worldTransforms, _init_extra_worldTransforms;

/** Tr2RaytracingGeometry (raytracing) - generated from schema shapeHash f1bf3788.... */
let _Tr2RaytracingGeometr;
new class extends _identity {
  static [class Tr2RaytracingGeometry extends CjsModel {
    static {
      ({
        e: [_init_positionOffset, _init_extra_positionOffset, _init_boneOffset, _init_extra_boneOffset, _init_boneWeightsOffset, _init_extra_boneWeightsOffset, _init_mesh, _init_extra_mesh, _init_area, _init_extra_area, _init_material, _init_extra_material, _init_perObjectData, _init_extra_perObjectData, _init_vertexBufferData, _init_extra_vertexBufferData, _init_worldTransform, _init_extra_worldTransform, _init_materialIndex, _init_extra_materialIndex, _init_isTransparent, _init_extra_isTransparent, _init_bakedMorphOffset, _init_extra_bakedMorphOffset, _init_geometryData, _init_extra_geometryData, _init_threadLocalGeometryData, _init_extra_threadLocalGeometryData, _init_tlas, _init_extra_tlas, _init_skinVerticesEffect, _init_extra_skinVerticesEffect, _init_skinVerticesData, _init_extra_skinVerticesData, _init_skinnedVertices, _init_extra_skinnedVertices, _init_usedResources, _init_extra_usedResources, _init_threadLocalUsedResources, _init_extra_threadLocalUsedResources, _init_instanceCount, _init_extra_instanceCount, _init_worldTransforms, _init_extra_worldTransforms],
        c: [_Tr2RaytracingGeometr, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2RaytracingGeometry",
        family: "raytracing"
      })], [[[type, type.uint32], 16, "positionOffset"], [[type, type.uint32], 16, "boneOffset"], [[type, type.uint32], 16, "boneWeightsOffset"], [type.objectRef("Tr2RaytracingMesh"), 0, "mesh"], [type.objectRef("Tr2RaytracingMeshArea"), 0, "area"], [type.objectRef("Tr2Material"), 0, "material"], [type.objectRef("Tr2ConstantBufferAL"), 0, "perObjectData"], [type.objectRef("Tr2ConstantBufferAL"), 0, "vertexBufferData"], [[type, type.mat4], 16, "worldTransform"], [[type, type.uint32], 16, "materialIndex"], [[type, type.boolean], 16, "isTransparent"], [[type, type.uint32], 16, "bakedMorphOffset"], [type.list("GeometryData"), 0, "geometryData"], [type.list("std::vector<GeometryData>"), 0, "threadLocalGeometryData"], [type.rawStruct("Tr2RtTopLevelAccelerationStructureAL"), 0, "tlas"], [type.objectRef("Tr2Effect"), 0, "skinVerticesEffect"], [type.rawStruct("Tr2ConstantBufferAL"), 0, "skinVerticesData"], [type.rawStruct("Tr2BufferAL"), 0, "skinnedVertices"], [type.rawStruct("Tr2BindlessResourcesAL"), 0, "usedResources"], [type.rawStruct("Tr2EnumerableThreadSpecific<Tr2BindlessResourcesAL>"), 0, "threadLocalUsedResources"], [[type, type.uint32], 16, "instanceCount"], [type.objectRef("Float4x3"), 0, "worldTransforms"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_worldTransforms(this);
    }
    /** positionOffset (uint32_t) */
    positionOffset = _init_positionOffset(this, 0);

    /** boneOffset (uint32_t) */
    boneOffset = (_init_extra_positionOffset(this), _init_boneOffset(this, 0));

    /** boneWeightsOffset (uint32_t) */
    boneWeightsOffset = (_init_extra_boneOffset(this), _init_boneWeightsOffset(this, 0));

    /** mesh (Tr2RaytracingMesh*) */
    mesh = (_init_extra_boneWeightsOffset(this), _init_mesh(this, null));

    /** area (Tr2RaytracingMeshArea*) */
    area = (_init_extra_mesh(this), _init_area(this, null));

    /** material (const Tr2Material*) */
    material = (_init_extra_area(this), _init_material(this, null));

    /** perObjectData (const Tr2ConstantBufferAL*) */
    perObjectData = (_init_extra_material(this), _init_perObjectData(this, null));

    /** vertexBufferData (const Tr2ConstantBufferAL*) */
    vertexBufferData = (_init_extra_perObjectData(this), _init_vertexBufferData(this, null));

    /** worldTransform (Matrix) */
    worldTransform = (_init_extra_vertexBufferData(this), _init_worldTransform(this, mat4.create()));

    /** materialIndex (uint32_t) */
    materialIndex = (_init_extra_worldTransform(this), _init_materialIndex(this, 0));

    /** isTransparent (bool) */
    isTransparent = (_init_extra_materialIndex(this), _init_isTransparent(this, false));

    /** bakedMorphOffset (uint32_t) */
    bakedMorphOffset = (_init_extra_isTransparent(this), _init_bakedMorphOffset(this, 0));

    /** m_geometryData (std::vector<GeometryData>) */
    geometryData = (_init_extra_bakedMorphOffset(this), _init_geometryData(this, []));

    /** m_threadLocalGeometryData (Tr2EnumerableThreadSpecific<std::vector<GeometryData>>) */
    threadLocalGeometryData = (_init_extra_geometryData(this), _init_threadLocalGeometryData(this, []));

    /** m_tlas (Tr2RtTopLevelAccelerationStructureAL) */
    tlas = (_init_extra_threadLocalGeometryData(this), _init_tlas(this, null));

    /** m_skinVerticesEffect (Tr2EffectPtr) */
    skinVerticesEffect = (_init_extra_tlas(this), _init_skinVerticesEffect(this, null));

    /** m_skinVerticesData (Tr2ConstantBufferAL) */
    skinVerticesData = (_init_extra_skinVerticesEffect(this), _init_skinVerticesData(this, null));

    /** m_skinnedVertices (Tr2BufferAL) */
    skinnedVertices = (_init_extra_skinVerticesData(this), _init_skinnedVertices(this, null));

    /** m_usedResources (Tr2BindlessResourcesAL) */
    usedResources = (_init_extra_skinnedVertices(this), _init_usedResources(this, null));

    /** m_threadLocalUsedResources (Tr2EnumerableThreadSpecific<Tr2BindlessResourcesAL>) */
    threadLocalUsedResources = (_init_extra_usedResources(this), _init_threadLocalUsedResources(this, null));

    /** instanceCount (uint32_t) */
    instanceCount = (_init_extra_threadLocalUsedResources(this), _init_instanceCount(this, 1));

    /** worldTransforms (const Float4x3*) */
    worldTransforms = (_init_extra_instanceCount(this), _init_worldTransforms(this, null));

    /** INVALID_MATERIAL (static const uint32_t) */
  }];
  INVALID_MATERIAL = 0xffffffff;
  constructor() {
    super(_Tr2RaytracingGeometr), _initClass();
  }
}();

export { _Tr2RaytracingGeometr as Tr2RaytracingGeometry };
//# sourceMappingURL=Tr2RaytracingGeometry.js.map
