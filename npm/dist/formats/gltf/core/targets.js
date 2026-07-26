const CMF_CLASS_KEYS = Object.freeze(["Root", "Section", "Metadata", "MetadataEntry", "Mesh", "IndexGroup", "VertexElement", "MeshLod", "MeshArea", "LodMeshArea", "BoneBinding", "MorphTargets", "MorphTarget", "LodMorphTarget", "AudioOcclusionMesh", "Skeleton", "BoneMask", "BoneWeight", "Animation", "AnimationChannel", "AnimationCurve"]);

/**
 * Builds a CMF document from normalized shared geometry for the glTF
 * shared-geometry adapter.
 */
function buildCmfFromShared(root) {
  return {
    version: 1,
    metadata: null,
    meshes: (root.meshes ?? []).map(mesh => buildMesh(mesh)),
    skeletons: [],
    animations: []
  };
}
function buildMesh(mesh) {
  const vertex = mesh.vertex ?? {},
    indices = mesh.indices ?? [],
    stride = estimateVertexStride(vertex),
    vertexCount = stride === 0 ? 0 : Math.floor((vertex.position ?? []).length / 3);
  return {
    name: mesh.name ?? "",
    decl: buildDecl(vertex),
    lods: [{
      vb: {
        index: 1,
        offset: 0,
        size: vertexCount * stride,
        stride
      },
      ib: {
        index: 2,
        offset: 0,
        size: totalIndexCount(indices) * bytesPerIndex(indices),
        stride: bytesPerIndex(indices)
      },
      areas: indices.map((group, index) => ({
        firstElement: firstTriangle(indices, index),
        elementCount: Math.floor((group.faces ?? []).length / 3)
      })),
      morphTargets: [],
      threshold: 0xffffffff,
      vertex,
      indices
    }],
    areas: indices.map(group => ({
      name: group.name ?? "",
      bounds: bounds(mesh),
      bones: [],
      affectedByBones: false,
      affectedByMorphTargets: false
    })),
    boneBindings: [],
    morphTargets: {
      decl: [],
      targets: []
    },
    uvDensities: [],
    bounds: bounds(mesh),
    audioOcclusionMesh: {
      vertices: [],
      indices: [],
      bounds: {
        min: [0, 0, 0],
        max: [0, 0, 0]
      }
    },
    topology: "TriangleList",
    skeleton: null,
    vertex,
    indices
  };
}
function buildDecl(vertex) {
  const decl = [];
  let offset = 0;
  for (const channel of [["position", "Position", 3], ["normal", "Normal", 3], ["tangent", "Tangent", 3], ["binormal", "Binormal", 3], ["texcoord0", "TexCoord", 2, 0], ["texcoord1", "TexCoord", 2, 1], ["color0", "Color", 4, 0], ["blendIndice", "BoneIndices", 4, 0, "UInt16"], ["blendWeight", "BoneWeights", 4, 0]]) {
    const [name, usage, elementCount, usageIndex = 0, type = "Float32"] = channel;
    if (!Array.isArray(vertex[name]) || vertex[name].length === 0) continue;
    decl.push({
      usage,
      usageIndex,
      type,
      elementCount,
      offset
    });
    offset += elementCount * elementTypeSize(type);
  }
  return decl;
}
function estimateVertexStride(vertex) {
  return buildDecl(vertex).reduce((stride, element) => Math.max(stride, element.offset + element.elementCount * elementTypeSize(element.type)), 0);
}
function elementTypeSize(type) {
  return type === "Float32" ? 4 : type.includes("16") ? 2 : 1;
}
function totalIndexCount(indices) {
  return indices.reduce((total, group) => total + (group.faces?.length ?? 0), 0);
}
function bytesPerIndex(indices) {
  return indices.some(group => group.bytesPerIndex === 4 || (group.faces ?? []).some(index => index > 0xffff)) ? 4 : 2;
}
function firstTriangle(indices, areaIndex) {
  let first = 0;
  for (let i = 0; i < areaIndex; i++) first += Math.floor((indices[i].faces ?? []).length / 3);
  return first;
}
function bounds(mesh) {
  return {
    min: mesh.minBounds ?? [0, 0, 0],
    max: mesh.maxBounds ?? [0, 0, 0]
  };
}

/**
 * Hydrates a CMF document through the configured runtime-class resolver for the
 * glTF shared-geometry adapter.
 */
function hydrateCmf(root, classes, hydrationOptions = {}) {
  const hydrationClasses = createHydrationClasses(classes, hydrationOptions);
  return hydrate("Root", {
    ...root,
    metadata: root.metadata ? hydrate("Metadata", root.metadata, hydrationClasses) : null,
    meshes: root.meshes.map(mesh => hydrateMesh(mesh, hydrationClasses)),
    skeletons: root.skeletons.map(skeleton => hydrate("Skeleton", skeleton, hydrationClasses)),
    animations: root.animations.map(animation => hydrate("Animation", animation, hydrationClasses))
  }, hydrationClasses, hydrationOptions);
}
function hydrateMesh(mesh, classes) {
  return hydrate("Mesh", {
    ...mesh,
    decl: mesh.decl.map(element => hydrate("VertexElement", element, classes)),
    lods: mesh.lods.map(lod => hydrate("MeshLod", {
      ...lod,
      areas: lod.areas.map(area => hydrate("LodMeshArea", area, classes)),
      morphTargets: lod.morphTargets.map(target => hydrate("LodMorphTarget", target, classes))
    }, classes)),
    areas: mesh.areas.map(area => hydrate("MeshArea", area, classes)),
    boneBindings: mesh.boneBindings.map(binding => hydrate("BoneBinding", binding, classes)),
    morphTargets: hydrate("MorphTargets", {
      decl: mesh.morphTargets.decl.map(element => hydrate("VertexElement", element, classes)),
      targets: mesh.morphTargets.targets.map(target => hydrate("MorphTarget", target, classes))
    }, classes),
    audioOcclusionMesh: hydrate("AudioOcclusionMesh", mesh.audioOcclusionMesh, classes)
  }, classes);
}
function hydrate(type, fields, classes, hydrationOptions = {}) {
  const Class = classes?.[type];
  const options = Object.keys(hydrationOptions).length > 0 ? hydrationOptions : classes?.__hydrationOptions || {};
  return Class ? populate(new Class(), fields, options) : fields;
}
function populate(instance, fields, hydrationOptions = {}) {
  if (!instance || typeof instance.SetValues !== "function") {
    throw new TypeError("CjsGltfFormat CMF class population requires classes to implement SetValues(values)");
  }
  instance.SetValues(fields, {
    ...hydrationOptions,
    skipUpdate: true,
    skipEvents: true
  });
  return instance;
}
function createHydrationClasses(classes, hydrationOptions) {
  const map = Object.create(classes || null);
  Object.defineProperty(map, "__hydrationOptions", {
    value: hydrationOptions,
    enumerable: false
  });
  return map;
}

export { CMF_CLASS_KEYS, buildCmfFromShared, hydrateCmf };
//# sourceMappingURL=targets.js.map
