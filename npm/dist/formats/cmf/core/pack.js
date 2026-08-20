/**
 * GPU-buffer packing for CMF writing.
 *
 * `buildCmfFromShared` (and hand-built graphs) carry deinterleaved vertex
 * channels and index groups but no GPU bytes. This packer interleaves each
 * LOD's channels per the mesh declaration, packs index groups, assigns
 * unique buffer indices across the whole graph, and returns a graph + buffer
 * list ready for `writeCmf`. Skeletons and animations must already be
 * CMF-native shaped; GR2-shaped skeletons are rejected with a clear error
 * (GR2 bone/track conversion is a separate adapter).
 */

const CHANNEL_NAMES = Object.freeze({
  Position: "position",
  Normal: "normal",
  Tangent: "tangent",
  Binormal: "binormal",
  TexCoord: "texcoord",
  Color: "color",
  BoneIndices: "blendIndice",
  BoneWeights: "blendWeight",
  PackedTangent: "packedTangent",
  PackedTangentLegacy: "packedTangentLegacy"
});
function packError(message) {
  const error = new Error(`CMF pack: ${message}`);
  error.code = "CJS_FORMAT_WRITE_ERROR";
  return error;
}
function channelName(element) {
  const base = CHANNEL_NAMES[element.usage];
  if (!base) throw packError(`unknown vertex usage ${JSON.stringify(element.usage)}`);
  if (element.usage === "TexCoord" || element.usage === "Color") return `${base}${element.usageIndex}`;
  if (element.usageIndex > 0) return `${base}${element.usageIndex}`;
  return base;
}
function elementTypeSize(type) {
  switch (type) {
    case "Float32":
      return 4;
    case "Float16":
    case "UInt16Norm":
    case "UInt16":
    case "Int16Norm":
    case "Int16":
      return 2;
    case "UInt8Norm":
    case "UInt8":
    case "Int8Norm":
    case "Int8":
      return 1;
    default:
      throw packError(`unsupported vertex element type ${JSON.stringify(type)}`);
  }
}
function floatToHalf(value) {
  if (Number.isNaN(value)) return 0x7e00;
  if (value === Infinity) return 0x7c00;
  if (value === -Infinity) return 0xfc00;
  const sign = value < 0 || Object.is(value, -0) ? 0x8000 : 0;
  let v = Math.abs(value);
  if (v >= 65520) return sign | 0x7c00;
  if (v < Math.pow(2, -24)) return sign;
  if (v < Math.pow(2, -14)) {
    return sign | Math.round(v / Math.pow(2, -24));
  }
  const exponent = Math.floor(Math.log2(v));
  const mantissa = Math.round((v / Math.pow(2, exponent) - 1) * 1024);
  if (mantissa === 1024) return sign | exponent + 16 << 10;
  return sign | exponent + 15 << 10 | mantissa;
}
function writeComponent(view, offset, type, value) {
  switch (type) {
    case "Float32":
      view.setFloat32(offset, value || 0, true);
      break;
    case "Float16":
      view.setUint16(offset, floatToHalf(value || 0), true);
      break;
    case "UInt16Norm":
      view.setUint16(offset, clampRound(value * 65535, 0, 65535), true);
      break;
    case "UInt16":
      view.setUint16(offset, clampRound(value, 0, 65535), true);
      break;
    case "Int16Norm":
      view.setInt16(offset, clampRound(value * 32767, -32767, 32767), true);
      break;
    case "Int16":
      view.setInt16(offset, clampRound(value, -32768, 32767), true);
      break;
    case "UInt8Norm":
      view.setUint8(offset, clampRound(value * 255, 0, 255));
      break;
    case "UInt8":
      view.setUint8(offset, clampRound(value, 0, 255));
      break;
    case "Int8Norm":
      view.setInt8(offset, clampRound(value * 127, -127, 127));
      break;
    case "Int8":
      view.setInt8(offset, clampRound(value, -128, 127));
      break;
    default:
      throw packError(`unsupported vertex element type ${JSON.stringify(type)}`);
  }
}
function clampRound(value, min, max) {
  const rounded = Math.round(value || 0);
  return rounded < min ? min : rounded > max ? max : rounded;
}
function vertexCountFor(decl, vertex) {
  let count = 0;
  for (const element of decl) {
    const channel = vertex[channelName(element)];
    if (!Array.isArray(channel) || channel.length === 0) continue;
    const channelCount = Math.floor(channel.length / element.elementCount);
    count = count === 0 ? channelCount : Math.min(count, channelCount);
  }
  return count;
}
function strideFor(decl) {
  return decl.reduce((stride, element) => Math.max(stride, (element.offset || 0) + element.elementCount * elementTypeSize(element.type)), 0);
}

/**
 * Interleave deinterleaved channels into vertex-buffer bytes per `decl`.
 *
 * @param {Array<object>} decl Vertex declaration.
 * @param {object} vertex Channel-name-keyed flat arrays.
 * @returns {object} `{ bytes, stride, count }`.
 */
function packVertexBuffer(decl, vertex) {
  const stride = strideFor(decl);
  const count = vertexCountFor(decl, vertex || {});
  const bytes = new Uint8Array(count * stride);
  const view = new DataView(bytes.buffer);
  for (const element of decl) {
    const channel = (vertex || {})[channelName(element)];
    if (!Array.isArray(channel) || channel.length === 0) continue;
    const size = elementTypeSize(element.type);
    for (let i = 0; i < count; i++) {
      const base = i * stride + (element.offset || 0);
      for (let component = 0; component < element.elementCount; component++) {
        writeComponent(view, base + component * size, element.type, channel[i * element.elementCount + component]);
      }
    }
  }
  return {
    bytes,
    stride,
    count
  };
}

/**
 * Concatenate index groups into index-buffer bytes.
 *
 * @param {Array<object>} groups Index groups with `faces` arrays.
 * @returns {object} `{ bytes, stride, count }` (u16 unless any index needs u32).
 */
function packIndexBuffer(groups) {
  const faces = [];
  for (const group of groups || []) {
    for (const index of group.faces || []) faces.push(index);
  }
  const wide = groups?.some(group => group.bytesPerIndex === 4) || faces.some(index => index > 0xffff);
  const stride = wide ? 4 : 2;
  const bytes = new Uint8Array(faces.length * stride);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < faces.length; i++) {
    if (wide) view.setUint32(i * stride, faces[i], true);else view.setUint16(i * stride, faces[i], true);
  }
  return {
    bytes,
    stride,
    count: faces.length
  };
}
function assertCmfNativeSkeleton(skeleton) {
  const bonesAreNames = Array.isArray(skeleton?.bones) && skeleton.bones.every(bone => typeof bone === "string");
  if (!bonesAreNames) {
    throw packError("skeletons must be CMF-native shaped (bones as name strings with parents/restTransforms); " + "GR2-shaped skeletons need conversion before writing");
  }
}

/**
 * Pack a channel-carrying CMF-native graph into a writable graph + buffers.
 *
 * Buffer indices are reassigned uniquely across all meshes/LODs/morph
 * targets; BufferViews are rebuilt from the packed bytes.
 *
 * @param {object} graph CMF-native graph carrying `vertex`/`indices` channel data.
 * @returns {object} `{ graph, buffers }` ready for `writeCmf`.
 */
function packGraphBuffers(graph) {
  const buffers = [null];
  const allocate = bytes => {
    const index = buffers.length;
    buffers.push({
      index,
      data: bytes
    });
    return index;
  };
  for (const skeleton of graph.skeletons || []) assertCmfNativeSkeleton(skeleton);
  const meshes = (graph.meshes || []).map(mesh => {
    const decl = mesh.decl || [];
    const morphDecl = mesh.morphTargets?.decl || [];
    const lods = (mesh.lods || []).map(lod => {
      const vertexSource = lod.vertex ?? mesh.vertex ?? {};
      const indexSource = lod.indices ?? mesh.indices ?? [];
      const packedVb = packVertexBuffer(decl, vertexSource);
      const packedIb = packIndexBuffer(indexSource);
      const vb = packedVb.count ? {
        index: allocate(packedVb.bytes),
        offset: 0,
        size: packedVb.bytes.byteLength,
        stride: packedVb.stride
      } : {
        index: 0,
        offset: 0,
        size: 0,
        stride: 0
      };
      const ib = packedIb.count ? {
        index: allocate(packedIb.bytes),
        offset: 0,
        size: packedIb.bytes.byteLength,
        stride: packedIb.stride
      } : {
        index: 0,
        offset: 0,
        size: 0,
        stride: 0
      };
      const morphTargets = (lod.morphTargets || []).map(target => {
        const packed = packVertexBuffer(morphDecl, target.vertex || {});
        return {
          vb: packed.count ? {
            index: allocate(packed.bytes),
            offset: 0,
            size: packed.bytes.byteLength,
            stride: packed.stride
          } : {
            index: 0,
            offset: 0,
            size: 0,
            stride: 0
          }
        };
      });
      return {
        vb,
        ib,
        areas: lod.areas || [],
        morphTargets,
        threshold: lod.threshold ?? 0xffffffff
      };
    });
    return {
      ...mesh,
      lods
    };
  });
  return {
    graph: {
      ...graph,
      meshes
    },
    buffers
  };
}

export { packGraphBuffers, packIndexBuffer, packVertexBuffer };
//# sourceMappingURL=pack.js.map
