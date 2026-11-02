// Source: trinity/trinity/Utilities/GeometryUtils.cpp
// Source: trinity/trinity/Utilities/GeometryUtils.h
//
// Carbon's free functions over Granny vertex data, ported against the GR2 reader's granny_file_info
// view: a mesh's `PrimaryVertexData.Vertices` is `{ bytes, stride, count, type }`, the vertex bytes as
// Granny stores them and the reflected member list (granny_data_type_definition). Output parameters
// become return values or caller-owned out vectors. Names keep Carbon's casing, as the sibling
// vertexUsage.js does.
import { ConvertGrannyTypeToDataType } from "../core/vertex/vertexUsage.js";

/** Bytes per element of each Granny member type (GrannyGetTotalTypeSize for flat members). */
const GRANNY_MEMBER_BYTES = { 10: 4, 11: 1, 12: 1, 13: 1, 14: 1, 15: 2, 16: 2, 17: 2, 18: 2, 19: 4, 20: 4, 21: 2 };

/**
 * Granny's GrannyGetTotalTypeSize for one flat vertex member: element bytes times width.
 *
 * @param {{type: number, arrayWidth: number}} member Reflected Granny member.
 * @returns {number} Bytes.
 */
export function GrannyGetTotalTypeSize(member)
{
  return (GRANNY_MEMBER_BYTES[member.type] ?? 0) * Math.max(1, member.arrayWidth);
}

/**
 * IEEE half to float, for Vector3_16 and FLOAT16 data.
 *
 * @param {number} h Half bits.
 * @returns {number} The value.
 */
function HalfToFloat(h)
{
  const sign = h & 0x8000 ? -1 : 1, exponent = (h >> 10) & 0x1f, fraction = h & 0x3ff;
  if (exponent === 0) return sign * fraction * 2 ** -24;
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
}

/**
 * Carbon ConvertShort4ToVector3 (GeometryUtils.cpp:44-51): x, y, z divided by w.
 *
 * @implemented
 * @param {DataView} view Vertex bytes.
 * @param {number} offset Byte offset of the element.
 * @param {Float32Array|number[]} out Destination.
 * @returns {Float32Array|number[]} out
 */
export function ConvertShort4ToVector3(view, offset, out)
{
  const rcp = Math.fround(1 / view.getInt16(offset + 6, true));
  out[0] = view.getInt16(offset, true) * rcp;
  out[1] = view.getInt16(offset + 2, true) * rcp;
  out[2] = view.getInt16(offset + 4, true) * rcp;
  return out;
}

/**
 * Carbon ConvertUByte4ToVector3 (GeometryUtils.cpp:53-59): BGRA bytes to a signed unit vector, x from byte 2.
 *
 * @implemented
 * @param {DataView} view Vertex bytes.
 * @param {number} offset Byte offset of the element.
 * @param {Float32Array|number[]} out Destination.
 * @returns {Float32Array|number[]} out
 */
export function ConvertUByte4ToVector3(view, offset, out)
{
  out[0] = view.getUint8(offset + 2) / 255 * 2 - 1;
  out[1] = view.getUint8(offset + 1) / 255 * 2 - 1;
  out[2] = view.getUint8(offset) / 255 * 2 - 1;
  return out;
}

/**
 * Carbon ConvertDataToVector3 (GeometryUtils.cpp:263-296): one element as a Vector3, zero for an
 * unsupported type.
 *
 * @implemented
 * @param {string} elementType Data type name ("FLOAT32_3").
 * @param {DataView} view Vertex bytes.
 * @param {number} offset Byte offset of the element.
 * @param {Float32Array|number[]} out Destination.
 * @returns {Float32Array|number[]} out
 */
export function ConvertDataToVector3(elementType, view, offset, out)
{
  switch (elementType)
  {
    case "FLOAT16_4":
      out[0] = HalfToFloat(view.getUint16(offset, true));
      out[1] = HalfToFloat(view.getUint16(offset + 2, true));
      out[2] = HalfToFloat(view.getUint16(offset + 4, true));
      return out;
    case "FLOAT32_3":
    case "FLOAT32_4":
      out[0] = view.getFloat32(offset, true);
      out[1] = view.getFloat32(offset + 4, true);
      out[2] = view.getFloat32(offset + 8, true);
      return out;
    case "SHORT_4":
      return ConvertShort4ToVector3(view, offset, out);
    case "UBYTE_4":
      return ConvertUByte4ToVector3(view, offset, out);
    default:
      out[0] = out[1] = out[2] = 0;
      return out;
  }
}

/**
 * Carbon GetVertexPositionOffsetAndType (GeometryUtils.cpp:11-38): where the member named
 * "Position" lies in a Granny mesh's vertex, and its data type.
 *
 * @adapted the two output references are the returned object.
 * @param {object|null} grannyMesh Granny mesh from the file info.
 * @returns {{positionOffset: number, positionType: string}} Offset 0 and DT_UNKNOWN_TYPE without one.
 */
export function GetVertexPositionOffsetAndType(grannyMesh)
{
  const members = grannyMesh?.PrimaryVertexData?.Vertices?.type;
  if (!members) return { positionOffset: 0, positionType: "DT_UNKNOWN_TYPE" };
  let positionOffset = 0;
  for (const member of members)
  {
    if (member.name === "Position") return { positionOffset, positionType: ConvertGrannyTypeToDataType(member) };
    positionOffset += GrannyGetTotalTypeSize(member);
  }
  return { positionOffset: 0, positionType: "DT_UNKNOWN_TYPE" };
}

/**
 * Carbon GetMeshVertexPosition (GeometryUtils.cpp:64-90): one vertex's position.
 *
 * Carbon reads FLOAT16_4, FLOAT32_3 and SHORT_4 positions and asserts on any other, leaving the
 * position as it was; so does this (a quirk: a four-wide float position, as traffic meshes carry, is
 * not read).
 *
 * @adapted the position is written to `out`, which is returned.
 * @param {object} grannyMesh Granny mesh from the file info.
 * @param {number} index Vertex index.
 * @param {Float32Array|number[]} out Destination.
 * @param {number} grannyBytesPerVertex Vertex stride.
 * @param {number} positionOffset From GetVertexPositionOffsetAndType.
 * @param {string} positionType From GetVertexPositionOffsetAndType.
 * @returns {Float32Array|number[]} out
 */
export function GetMeshVertexPosition(grannyMesh, index, out, grannyBytesPerVertex, positionOffset, positionType)
{
  if (!grannyBytesPerVertex) return out;
  const bytes = grannyMesh.PrimaryVertexData.Vertices.bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = index * grannyBytesPerVertex + positionOffset;
  switch (positionType)
  {
    case "FLOAT16_4":
    case "FLOAT32_3":
    case "SHORT_4":
      return ConvertDataToVector3(positionType, view, offset, out);
    default:
      return out;
  }
}
