import { STRUCT_SIZE, FILE_SIGNATURE, FILE_VERSION, SectionCompression, SectionType, MeshTopology, ElementType, Usage, AnimationChannelTargetType, Interpolation } from './constants.js';
import { BinaryReader, crc32, enumName, readBounds, readVector3, readMatrix, readQuaternion } from './binary.js';
import { decodeGeometrySync, decodeGeometryAsync } from './buffers.js';

function readCmf(input, options = {}) {
  const reader = new BinaryReader(input);
  const header = readHeader(reader);
  validateHeader(reader, header, options);
  const dataSection = header.sections[0];
  const root = readData(reader, dataSection.offset);
  const metadataSection = header.sections.find(section => section.type === "Metadata");
  const metadata = metadataSection ? readMetadata(reader, metadataSection.offset) : null;
  const result = {
    signature: header.signature,
    version: header.version,
    headerSize: header.headerSize,
    crc32: header.crc32,
    sections: header.sections,
    metadata,
    meshes: root.meshes,
    skeletons: root.skeletons,
    animations: root.animations
  };
  return options.decodeBuffers ? decodeGeometrySync(result, reader.bytes) : result;
}
async function readCmfAsync(input, options = {}) {
  const reader = new BinaryReader(input);
  const header = readHeader(reader);
  validateHeader(reader, header, options);
  const dataSection = header.sections[0];
  const root = readData(reader, dataSection.offset);
  const metadataSection = header.sections.find(section => section.type === "Metadata");
  const metadata = metadataSection ? readMetadata(reader, metadataSection.offset) : null;
  const result = {
    signature: header.signature,
    version: header.version,
    headerSize: header.headerSize,
    crc32: header.crc32,
    sections: header.sections,
    metadata,
    meshes: root.meshes,
    skeletons: root.skeletons,
    animations: root.animations
  };
  return options.decodeBuffers ? await decodeGeometryAsync(result, reader.bytes) : result;
}
function readHeader(reader) {
  const signature = reader.u32(0);
  const version = reader.u32(4);
  const headerSize = reader.u32(8);
  const fileCrc32 = reader.u32(12);
  const sectionsSpan = readSpan(reader, 16, STRUCT_SIZE.Section);
  const sections = readArray(reader, sectionsSpan, readSection);
  return {
    signature,
    signatureText: "cmff",
    version,
    headerSize,
    crc32: fileCrc32,
    sections
  };
}
function inspectCmf(result) {
  return {
    signature: result.signature,
    version: result.version,
    headerSize: result.headerSize,
    crc32: result.crc32,
    sections: result.sections.map((section, index) => ({
      index,
      type: section.type,
      compression: section.compression,
      compressedSize: section.compressedSize,
      uncompressedSize: section.uncompressedSize,
      gpuAlignment: section.gpuAlignment
    })),
    metadataEntries: result.metadata?.entries.length ?? 0,
    meshes: result.meshes.map(mesh => ({
      name: mesh.name,
      topology: mesh.topology,
      lods: mesh.lods.length,
      areas: mesh.areas.length,
      vertexElements: mesh.decl.length,
      morphTargets: mesh.morphTargets.targets.length,
      skeleton: mesh.skeleton
    })),
    skeletons: result.skeletons.map(skeleton => ({
      name: skeleton.name,
      bones: skeleton.bones.length,
      boneMasks: skeleton.boneMasks.length
    })),
    animations: result.animations.map(animation => ({
      name: animation.name,
      duration: animation.duration,
      channels: animation.channels.length,
      curves: animation.curves.length
    }))
  };
}
function validateHeader(reader, header, options) {
  if (header.signature !== FILE_SIGNATURE) {
    throw new Error(`Invalid CMF signature 0x${header.signature.toString(16)}`);
  }
  if (header.version !== FILE_VERSION) {
    throw new Error(`Unsupported CMF version ${header.version}`);
  }
  if (header.headerSize > reader.bytes.byteLength) {
    throw new Error("CMF headerSize exceeds file size");
  }
  if (header.sections.length === 0) {
    throw new Error("CMF header contains no sections");
  }
  if (header.sections[0].type !== "Data") {
    throw new Error("CMF first section must be Data");
  }
  for (let i = 0; i < header.sections.length; i++) {
    const section = header.sections[i];
    if (section.offset + section.compressedSize > reader.bytes.byteLength) {
      throw new Error(`CMF section ${i} exceeds file bounds`);
    }
    if (section.type === "Metadata" && i !== header.sections.length - 1) {
      throw new Error("CMF Metadata section must be last");
    }
  }
  if (options.validateCrc !== false && header.crc32 !== 0) {
    const actual = crc32(reader.bytes, 16, reader.bytes.byteLength);
    if (actual !== header.crc32) {
      throw new Error(`CMF CRC mismatch: expected 0x${header.crc32.toString(16)}, got 0x${actual.toString(16)}`);
    }
  }
}
function readSection(reader, offset) {
  return {
    offset: reader.u32(offset),
    compressedSize: reader.u32(offset + 4),
    uncompressedSize: reader.u32(offset + 8),
    gpuAlignment: reader.u16(offset + 12),
    type: enumName(SectionType, reader.u8(offset + 14)),
    compression: enumName(SectionCompression, reader.u8(offset + 15))
  };
}
function readData(reader, offset) {
  return {
    meshes: readArray(reader, readSpan(reader, offset, STRUCT_SIZE.Mesh), readMesh),
    skeletons: readArray(reader, readSpan(reader, offset + 16, STRUCT_SIZE.Skeleton), readSkeleton),
    animations: readArray(reader, readSpan(reader, offset + 32, STRUCT_SIZE.Animation), readAnimation)
  };
}
function readMetadata(reader, offset) {
  return {
    entries: readArray(reader, readSpan(reader, offset, STRUCT_SIZE.MetadataEntry), readMetadataEntry)
  };
}
function readMetadataEntry(reader, offset) {
  return {
    key: readString(reader, offset),
    value: readString(reader, offset + 16)
  };
}
function readMesh(reader, offset) {
  return {
    name: readString(reader, offset),
    decl: readArray(reader, readSpan(reader, offset + 16, STRUCT_SIZE.VertexElement), readVertexElement),
    lods: readArray(reader, readSpan(reader, offset + 32, STRUCT_SIZE.MeshLod), readMeshLod),
    areas: readArray(reader, readSpan(reader, offset + 48, STRUCT_SIZE.MeshArea), readMeshArea),
    boneBindings: readArray(reader, readSpan(reader, offset + 64, STRUCT_SIZE.BoneBinding), readBoneBinding),
    morphTargets: readMorphTargets(reader, offset + 80),
    uvDensities: readFloatArray(reader, readSpan(reader, offset + 112, 4)),
    bounds: readBounds(reader, offset + 128),
    audioOcclusionMesh: readAudioOcclusionMesh(reader, offset + 152),
    topology: enumName(MeshTopology, reader.u8(offset + 208)),
    skeleton: readSkeletonIndex(reader.u8(offset + 209))
  };
}
function readVertexElement(reader, offset) {
  return {
    usage: enumName(Usage, reader.u8(offset)),
    usageIndex: reader.u8(offset + 1),
    type: enumName(ElementType, reader.u8(offset + 2)),
    elementCount: reader.u8(offset + 3),
    offset: reader.u32(offset + 4)
  };
}
function readMeshArea(reader, offset) {
  return {
    name: readString(reader, offset),
    bounds: readBounds(reader, offset + 16),
    bones: readUint16Array(reader, readSpan(reader, offset + 40, 2)),
    affectedByBones: !!reader.u8(offset + 56),
    affectedByMorphTargets: !!reader.u8(offset + 57)
  };
}
function readLodMeshArea(reader, offset) {
  return {
    firstElement: reader.u32(offset),
    elementCount: reader.u32(offset + 4)
  };
}
function readBoneBinding(reader, offset) {
  return {
    name: readString(reader, offset),
    bounds: readBounds(reader, offset + 16)
  };
}
function readMorphTargets(reader, offset) {
  return {
    decl: readArray(reader, readSpan(reader, offset, STRUCT_SIZE.VertexElement), readVertexElement),
    targets: readArray(reader, readSpan(reader, offset + 16, STRUCT_SIZE.MorphTarget), readMorphTarget)
  };
}
function readMorphTarget(reader, offset) {
  return {
    name: readString(reader, offset),
    maxDisplacement: reader.f32(offset + 16)
  };
}
function readMeshLod(reader, offset) {
  return {
    vb: readBufferView(reader, offset),
    ib: readBufferView(reader, offset + 16),
    areas: readArray(reader, readSpan(reader, offset + 32, STRUCT_SIZE.LodMeshArea), readLodMeshArea),
    morphTargets: readArray(reader, readSpan(reader, offset + 48, STRUCT_SIZE.LodMorphTarget), readLodMorphTarget),
    threshold: reader.u32(offset + 64)
  };
}
function readLodMorphTarget(reader, offset) {
  return {
    vb: readBufferView(reader, offset)
  };
}
function readAudioOcclusionMesh(reader, offset) {
  const verticesSpan = readSpan(reader, offset, 12);
  return {
    vertices: readArray(reader, verticesSpan, readVector3),
    indices: readUint16Array(reader, readSpan(reader, offset + 16, 2)),
    bounds: readBounds(reader, offset + 32)
  };
}
function readSkeleton(reader, offset) {
  return {
    name: readString(reader, offset),
    bones: readArray(reader, readSpan(reader, offset + 16, 16), readString),
    parents: readUint32Array(reader, readSpan(reader, offset + 32, 4)),
    restTransforms: readArray(reader, readSpan(reader, offset + 48, STRUCT_SIZE.Transform), readTransform),
    invBindTransforms: readArray(reader, readSpan(reader, offset + 64, 64), readMatrix),
    boneMasks: readArray(reader, readSpan(reader, offset + 80, STRUCT_SIZE.BoneMask), readBoneMask)
  };
}
function readTransform(reader, offset) {
  return {
    position: readVector3(reader, offset),
    rotation: readQuaternion(reader, offset + 12),
    scale: readVector3(reader, offset + 28)
  };
}
function readBoneMask(reader, offset) {
  return {
    name: readString(reader, offset),
    weights: readArray(reader, readSpan(reader, offset + 16, STRUCT_SIZE.BoneWeight), readBoneWeight)
  };
}
function readBoneWeight(reader, offset) {
  return {
    index: reader.u32(offset),
    weight: reader.f32(offset + 4)
  };
}
function readAnimation(reader, offset) {
  return {
    name: readString(reader, offset),
    channels: readArray(reader, readSpan(reader, offset + 16, STRUCT_SIZE.AnimationChannel), readAnimationChannel),
    curves: readArray(reader, readSpan(reader, offset + 32, STRUCT_SIZE.AnimationCurve), readAnimationCurve),
    duration: reader.f32(offset + 48)
  };
}
function readAnimationChannel(reader, offset) {
  return {
    target: readString(reader, offset),
    targetType: enumName(AnimationChannelTargetType, reader.u8(offset + 16)),
    curveIndex: reader.u32(offset + 20)
  };
}
function readAnimationCurve(reader, offset) {
  return {
    valueDimension: reader.u8(offset),
    interpolation: enumName(Interpolation, reader.u8(offset + 1)),
    knotType: enumName(ElementType, reader.u8(offset + 2)),
    valueType: enumName(ElementType, reader.u8(offset + 3)),
    knotCount: reader.u32(offset + 4),
    knots: readByteArray(reader, readSpan(reader, offset + 8, 1)),
    values: readByteArray(reader, readSpan(reader, offset + 24, 1))
  };
}
function readBufferView(reader, offset) {
  return {
    index: reader.u32(offset),
    offset: reader.u32(offset + 4),
    size: reader.u32(offset + 8),
    stride: reader.u32(offset + 12)
  };
}
function readSpan(reader, offset, elementSize) {
  const rawOffset = reader.i64(offset);
  const byteSize = reader.u64(offset + 8);
  const isOffset = (rawOffset & 1) !== 0;
  const dataOffset = byteSize === 0 ? null : isOffset ? offset + (rawOffset & -2) : rawOffset;
  if (byteSize % elementSize !== 0) {
    throw new Error(`CMF span byteSize ${byteSize} is not a multiple of element size ${elementSize}`);
  }
  if (dataOffset !== null) {
    reader.require(dataOffset, byteSize, "span");
  }
  return {
    offset: dataOffset,
    byteSize,
    count: byteSize / elementSize,
    elementSize,
    addressMode: isOffset ? "offset" : "pointer"
  };
}
function readArray(reader, span, readElement) {
  const values = [];
  if (span.count === 0) {
    return values;
  }
  for (let i = 0; i < span.count; i++) {
    values.push(readElement(reader, span.offset + i * span.elementSize));
  }
  return values;
}
function readString(reader, offset) {
  const span = readSpan(reader, offset, 1);
  return span.offset === null ? "" : reader.string(span.offset, span.byteSize);
}
function readByteArray(reader, span) {
  return span.offset === null ? [] : Array.from(reader.bytesAt(span.offset, span.byteSize));
}
function readUint16Array(reader, span) {
  const values = [];
  for (let i = 0; i < span.count; i++) {
    values.push(reader.u16(span.offset + i * 2));
  }
  return values;
}
function readUint32Array(reader, span) {
  const values = [];
  for (let i = 0; i < span.count; i++) {
    values.push(reader.u32(span.offset + i * 4));
  }
  return values;
}
function readFloatArray(reader, span) {
  const values = [];
  for (let i = 0; i < span.count; i++) {
    values.push(reader.f32(span.offset + i * 4));
  }
  return values;
}
function readSkeletonIndex(value) {
  return value === 0xff ? null : value;
}

export { inspectCmf, readCmf, readCmfAsync, readHeader };
//# sourceMappingURL=schema.js.map
