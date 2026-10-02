// Source: trinity/trinity/Tr2CurveLineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { INotify, IsMatch } from "#blue";
import { color } from "#math/color";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { Tr2PickType, TR2_PICK_TYPE_DEFAULT } from "../view/Tr2PickType.js";
import { ITr2Renderable } from "../ITr2Renderable.js";


const LINE_STRIDE = 80;
const FLOAT_MAX = 3.4028234663852886e38;

/** Native SwizzleColor (Tr2CurveLineSet.cpp:160); ARGB word to RGBA bytes. */
function swizzleColor(value)
{
  const word = color.toARGB(value);
  return ((word & 0xff0000) >>> 16) | (word & 0xff00ff00) | ((word & 0xff) << 16);
}

/** Extends the native axis-aligned bound with one point. */
function includeBox(min, max, point)
{
  vec3.min(min, min, point);
  vec3.max(max, max, point);
}


function includePoint(sphere, point)
{
  const dx = point[0] - sphere[0];
  const dy = point[1] - sphere[1];
  const dz = point[2] - sphere[2];
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  if (distanceSquared <= sphere[3] * sphere[3] + 1e-4)
  {
    return;
  }
  const distance = Math.sqrt(distanceSquared);
  const factor = 0.5 * (1 - sphere[3] / distance);
  sphere[0] += factor * dx;
  sphere[1] += factor * dy;
  sphere[2] += factor * dz;
  sphere[3] = 0.5 * (sphere[3] + distance);
}


function hermite(out, start, tangentStart, end, tangentEnd, time)
{
  const t2 = time * time;
  const t3 = t2 * time;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + time;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  out[0] = h00 * start[0] + h10 * tangentStart[0] + h01 * end[0] + h11 * tangentEnd[0];
  out[1] = h00 * start[1] + h10 * tangentStart[1] + h01 * end[1] + h11 * tangentEnd[1];
  out[2] = h00 * start[2] + h10 * tangentStart[2] + h01 * end[2] + h11 * tangentEnd[2];
  return out;
}


function rotateAroundAxis(out, value, axis, angle)
{
  const axisLength = Math.hypot(axis[0], axis[1], axis[2]);
  const x = axis[0] / axisLength;
  const y = axis[1] / axisLength;
  const z = axis[2] / axisLength;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const dot = x * value[0] + y * value[1] + z * value[2];
  out[0] = value[0] * cosine + (y * value[2] - z * value[1]) * sine + x * dot * (1 - cosine);
  out[1] = value[1] * cosine + (z * value[0] - x * value[2]) * sine + y * dot * (1 - cosine);
  out[2] = value[2] * cosine + (x * value[1] - y * value[0]) * sine + z * dot * (1 - cosine);
  return out;
}


function sphericalToCartesian(value, center)
{
  const phi = value[0];
  const theta = value[1];
  const radius = value[2];
  return vec3.fromValues(
    radius * Math.sin(phi) * Math.sin(theta) + center[0],
    radius * Math.cos(theta) + center[1],
    radius * Math.cos(phi) * Math.sin(theta) + center[2]
  );
}

/** A line set that draws curved and sphere-projected lines by tessellating them into straight segments. */
@meta.define({ className: "Tr2CurveLineSet", family: "trinityCore" })
@meta.blue.inherit(ITr2Renderable, INotify)
export class Tr2CurveLineSet
{

  /** Carbon LineData records tessellated into the owned AL vertex buffer. */
  @meta.type.list("LineData")
  lines = [];

  /** Reusable invalid line slots, matching Carbon's stable ID behavior. */
  @meta.type.array("uint32")
  emptyLineID = [];

  /** Number of straight segments represented by the last submission. */
  @meta.type.uint32
  currentSubmittedLineCount = 0;

  /** Logical local-to-world transform used by renderable consumers. */
  worldTransform = mat4.create();

  /** Carbon's incrementally grown local-space line bound. */
  boundingSphere = vec4.create();

  /** Whether the last submission changed the local bounds. */
  boundsDirty = false;

  /** Selects WRITE_OFTEN rather than WRITE when allocating the vertex stream. */
  dynamic = false;

  /** Native device storage and grow-only segment capacity. */
  _vertexBuffer = new Tr2BufferAL();

  _vertexBufferSize = 0;

  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  minBounds = vec3.create();

  maxBounds = vec3.create();

  /** Reused byte staging replaces Carbon's untyped pool allocation. */
  _vertexBytes = null;

  _vertexView = null;

  /** Registers the inherited device-resource lifetime and prepares the empty set. */
  constructor()
  {
    TriDevice.RegisterResource(this);
    this.PrepareResources();
  }

  /** Explicit final-owner cleanup replaces the native destructor. */
  @meta.ours
  Destroy()
  {
    this.ReleaseResources();
    TriDevice.UnregisterResource(this);
  }

  /** Inherited Tr2DeviceResource.cpp:21-32 creation guard. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Explicit AL release replaces assigning the native empty buffer value. */
  @meta.blue.method
  @meta.adapted
  ReleaseResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
  }

  /** Registers Carbon's 80-byte LineVertex declaration, then fills the stream. */
  @meta.blue.method
  @meta.implemented
  OnPrepareResources()
  {
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      const declaration = Tr2CurveLineSet.#declaration;
      if (declaration.empty())
      {
        declaration.Add("FLOAT32_3", "POSITION");
        declaration.Add("FLOAT32_4", "TEXCOORD", 0);
        declaration.Add("FLOAT32_4", "TEXCOORD", 1);
        declaration.Add("FLOAT32_3", "TEXCOORD", 2);
        declaration.Add("FLOAT32_3", "TEXCOORD", 3);
        for (let index = 0; index < 3; index++) declaration.Add("UBYTE_4_NORM", "COLOR", index);
      }
      this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(declaration);
      if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;
    }
    return this.FillVertexBuffer();
  }

  /** Only the mapped width factor requires a vertex refill (cpp:50-58). */
  @meta.blue.method
  @meta.implemented
  OnModified(name)
  {
    if (IsMatch(name, "lineWidthFactor")) this.FillVertexBuffer();
    return true;
  }

  /** Counts all live segments while retaining stable line identifiers. */
  @meta.blue.method
  @meta.implemented
  GetNumOfLines()
  {
    let count = 0;
    for (const line of this.lines)
    {
      if (line.type !== Tr2CurveLineSet.LineType.LINETYPE_INVALID) count += line.numOfSegments;
    }
    return count;
  }

  /** m_additive (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  additive = false;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_lineWidthFactor (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lineWidthFactor = 1;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  depthOffset = 0;

  /** m_lineEffect (Tr2MaterialPtr) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Material")
  lineEffect = null;

  /** m_pickEffect (Tr2MaterialPtr) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Material")
  pickEffect = null;

  /** Carbon method AddCurvedLineCrt (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.adapted
  AddCurvedLineCrt(position1, color1, position2, color2, middle, width, segments = 20)
  {
    return this.#addLineData(this.#createLine(
      Tr2CurveLineSet.LineType.LINETYPE_CURVED,
      position1,
      color1,
      position2,
      color2,
      middle,
      width,
      segments > 0 ? Math.trunc(segments) : 1
    ));
  }

  /** Carbon method AddCurvedLineSph (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  AddCurvedLineSph(position1, color1, position2, color2, center, middle, width)
  {
    return this.AddCurvedLineCrt(
      sphericalToCartesian(position1, center),
      color1,
      sphericalToCartesian(position2, center),
      color2,
      sphericalToCartesian(middle, center),
      width
    );
  }

  /** Carbon method AddSpheredLineCrt (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  AddSpheredLineCrt(position1, color1, position2, color2, center, width)
  {
    return this.#addLineData(this.#createLine(
      Tr2CurveLineSet.LineType.LINETYPE_SPHERED,
      position1,
      color1,
      position2,
      color2,
      center,
      width,
      20
    ));
  }

  /** Carbon method AddSpheredLineSph (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  AddSpheredLineSph(position1, color1, position2, color2, center, width)
  {
    return this.AddSpheredLineCrt(
      sphericalToCartesian(position1, center),
      color1,
      sphericalToCartesian(position2, center),
      color2,
      center,
      width
    );
  }

  /** Carbon method AddStraightLine (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  AddStraightLine(position1, color1, position2, color2, width)
  {
    return this.#addLineData(this.#createLine(
      Tr2CurveLineSet.LineType.LINETYPE_STRAIGHT,
      position1,
      color1,
      position2,
      color2,
      vec3.create(),
      width,
      1
    ));
  }

  /** Carbon method ChangeLineIntermediateSph (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLineIntermediateSph(id, intermediatePosition, center)
  {
    this.ChangeLineIntermediateCrt(id, sphericalToCartesian(intermediatePosition, center));
  }

  /** Carbon method ChangeLineIntermediateCrt (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLineIntermediateCrt(id, intermediatePosition)
  {
    if (this.#isValidLineID(id))
    {
      vec3.copy(this.lines[id].intermediatePosition, intermediatePosition);
    }
  }

  /** Carbon method ChangeLinePositionSph (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLinePositionSph(id, position1, position2, center)
  {
    this.ChangeLinePositionCrt(id, sphericalToCartesian(position1, center), sphericalToCartesian(position2, center));
  }

  /** Carbon method ChangeLinePositionCrt (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLinePositionCrt(id, position1, position2)
  {
    if (this.#isValidLineID(id))
    {
      vec3.copy(this.lines[id].position1, position1);
      vec3.copy(this.lines[id].position2, position2);
    }
  }

  /** Carbon method ChangeLineAnimation (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLineAnimation(id, color, speed, scale)
  {
    if (this.#isValidLineID(id))
    {
      vec4.copy(this.lines[id].overlayColor, color);
      this.lines[id].animationSpeed = speed;
      this.lines[id].animationScale = scale;
    }
  }

  /** Carbon method ChangeLineMultiColor (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLineMultiColor(id, color, border)
  {
    if (this.#isValidLineID(id))
    {
      vec4.copy(this.lines[id].multiColor, color);
      this.lines[id].multiColorBorder = border;
    }
  }

  /** Carbon method ChangeLineSegmentation (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLineSegmentation(id, numOfSegments)
  {
    if (this.#isValidLineID(id) && this.lines[id].type !== Tr2CurveLineSet.LineType.LINETYPE_STRAIGHT)
    {
      this.lines[id].numOfSegments = Math.max(0, Math.trunc(numOfSegments));
    }
  }

  /** Carbon method ChangeLineColor (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLineColor(id, color1, color2)
  {
    if (this.#isValidLineID(id))
    {
      vec4.copy(this.lines[id].color1, color1);
      vec4.copy(this.lines[id].color2, color2);
    }
  }

  /** Carbon method ChangeLineWidth (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  ChangeLineWidth(id, width)
  {
    if (this.#isValidLineID(id))
    {
      this.lines[id].width = width;
    }
  }

  /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  ClearLines()
  {
    this.lines.length = 0;
    this.emptyLineID.length = 0;
  }

  /** Carbon method RemoveLine (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  RemoveLine(id)
  {
    if (this.#isValidLineID(id))
    {
      this.lines[id].type = Tr2CurveLineSet.LineType.LINETYPE_INVALID;
      this.emptyLineID.push(id);
    }
  }

  /** Native submission intentionally reports success even when filling fails. */
  @meta.blue.method
  @meta.implemented
  SubmitChanges()
  {
    this.FillVertexBuffer();
    return true;
  }

  /**
   * Tessellates and maps the native six-vertex segments (cpp:357-592).
   * JS uses number intermediates and typed-array stores, not SIMD float math.
   * The existing TriPoolAllocator only leases named RawData structs; reusable
   * bytes on this owner replace its native untyped allocation. Unused capacity
   * retains earlier bytes (initially zero), rather than unspecified pool memory.
   */
  @meta.blue.method
  @meta.adapted
  FillVertexBuffer()
  {
    this.currentSubmittedLineCount = 0;
    vec4.set(this.boundingSphere, 0, 0, 0, 0);
    this.minBounds.fill(FLOAT_MAX);
    this.maxBounds.fill(-FLOAT_MAX);
    this.boundsDirty = true;
    if (!this.lines.length) return true;

    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const count = this.GetNumOfLines();
    if (!this._vertexBuffer.IsValid() || count > this._vertexBufferSize)
    {
      const result = this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
        LINE_STRIDE, count * 6, Tr2GpuUsage.VERTEX_BUFFER,
        this.dynamic ? Tr2CpuUsage.WRITE_OFTEN : Tr2CpuUsage.WRITE
      ), null, context);
      if (Failed(result)) return false;
      this._vertexBufferSize = count;
    }
    const byteSize = this._vertexBufferSize * 6 * LINE_STRIDE;
    if (!this._vertexBytes || this._vertexBytes.length !== byteSize)
    {
      this._vertexBytes = new Uint8Array(byteSize); // alloc: retained staging capacity, resized only with the owned buffer
      this._vertexView = new DataView(this._vertexBytes.buffer);
    }
    const buffer = this._vertexView;
    const { vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5, vec3_6, vec4_0, vec4_1 } = Tr2CurveLineSet.scratch;
    const segmentPoints = Tr2CurveLineSet.#segmentPoints;
    const absolutePoints = Tr2CurveLineSet.#absolutePoints;
    const types = Tr2CurveLineSet.LineType;
    for (let id = 0; id < this.lines.length; id++)
    {
      const line = this.lines[id], segments = line.numOfSegments;
      let offset = this.currentSubmittedLineCount * 6 * LINE_STRIDE;
      if (line.type === types.LINETYPE_STRAIGHT)
      {
        vec3.scale(vec3_3, line.position1, 2);
        vec3.subtract(vec3_3, vec3_3, line.position2);
        vec3.scale(vec3_6, line.position2, 2);
        vec3.subtract(vec3_6, vec3_6, line.position1);
        this.WriteLineVerticesToBuffer(line.position1, line.color1, 0, line.position2,
          line.color2, 1, vec3_3, vec3_6, id, buffer, offset);
        includePoint(this.boundingSphere, line.position1);
        includePoint(this.boundingSphere, line.position2);
        includeBox(this.minBounds, this.maxBounds, line.position1);
        includeBox(this.minBounds, this.maxBounds, line.position2);
        this.currentSubmittedLineCount++;
      }
      else if (line.type === types.LINETYPE_CURVED || line.type === types.LINETYPE_SPHERED)
      {
        const curved = line.type === types.LINETYPE_CURVED;
        let angle = 0;
        if (curved)
        {
          vec3.subtract(vec3_1, line.intermediatePosition, line.position1);
          vec3.subtract(vec3_2, line.position2, line.intermediatePosition);
          hermite(vec3_3, line.position1, vec3_1, line.position2, vec3_2, -1 / segments);
          vec3.copy(vec3_4, line.position1);
          hermite(vec3_5, line.position1, vec3_1, line.position2, vec3_2, 1 / segments);
        }
        else
        {
          vec3.subtract(vec3_4, line.position1, line.intermediatePosition);
          vec3.subtract(vec3_5, line.position2, line.intermediatePosition);
          vec3.cross(vec3_0, vec3_4, vec3_5);
          vec3.normalize(vec3_1, vec3_4);
          vec3.normalize(vec3_2, vec3_5);
          angle = Math.acos(vec3.dot(vec3_1, vec3_2)) / segments;
          rotateAroundAxis(vec3_3, vec3_4, vec3_0, -angle);
          rotateAroundAxis(vec3_5, vec3_4, vec3_0, angle);
        }
        vec4.copy(vec4_0, line.color1);
        for (let segment = 0; segment < segments; segment++)
        {
          const fraction = (segment + 1) / segments;
          if (curved) hermite(vec3_6, line.position1, vec3_1, line.position2, vec3_2, (segment + 2) / segments);
          else rotateAroundAxis(vec3_6, vec3_5, vec3_0, angle);
          vec4.lerp(vec4_1, line.color1, line.color2, fraction);
          // Native temporary sums leave the relative directions untouched.
          // Translating float32 directions back would lose low bits each step.
          const points = curved ? segmentPoints : absolutePoints;
          if (!curved)
          {
            for (let index = 0; index < 4; index++) vec3.add(points[index], segmentPoints[index], line.intermediatePosition);
          }
          this.WriteLineVerticesToBuffer(points[1], vec4_0, segment / segments, points[2],
            vec4_1, fraction, points[0], points[3], id, buffer, offset);
          offset += 6 * LINE_STRIDE;
          includePoint(this.boundingSphere, points[1]);
          includePoint(this.boundingSphere, points[2]);
          // Native quirk cpp:489-491: sphere-line AABB includes only the center.
          includeBox(this.minBounds, this.maxBounds, curved ? vec3_4 : line.intermediatePosition);
          includeBox(this.minBounds, this.maxBounds, curved ? vec3_5 : line.intermediatePosition);
          vec3.copy(vec3_3, vec3_4);
          vec3.copy(vec3_4, vec3_5);
          vec3.copy(vec3_5, vec3_6);
          vec4.copy(vec4_0, vec4_1);
        }
        this.currentSubmittedLineCount += segments;
      }
      else if (line.type === types.LINETYPE_PARTICLE)
      {
        for (let segment = 0; segment < segments; segment++)
        {
          this.WriteParticleVerticesToBuffer(line.position1, line.color1, segment / segments,
            line.position2, line.color2, segment / segments, id, buffer, offset);
          offset += 6 * LINE_STRIDE;
        }
        includePoint(this.boundingSphere, line.position1);
        includePoint(this.boundingSphere, line.position2);
        includeBox(this.minBounds, this.maxBounds, line.position1);
        includeBox(this.minBounds, this.maxBounds, line.position2);
        this.currentSubmittedLineCount += segments;
      }
    }
    const mapped = this._vertexBuffer.MapForWriting(context);
    if (Failed(mapped.result)) return false;
    mapped.data.set(this._vertexBytes);
    this._vertexBuffer.UnmapForWriting(context);
    return true;
  }

  /**
   * Writes native LineVertex records; a DataView and byte offset replace the
   * LineVertex pointer. Integer color words and float stores retain the layout.
   */
  @meta.blue.method
  @meta.adapted
  WriteLineVerticesToBuffer(pos1, col1, length1, pos2, col2, length2, posPrev, posNext, lineID, buffer, offset = 0)
  {
    const line = this.lines[lineID], width = this.lineWidthFactor * line.width;
    const color1 = swizzleColor(col1), color2 = swizzleColor(col2);
    const multi = swizzleColor(line.multiColor), overlay = swizzleColor(line.overlayColor);
    for (let corner = 0; corner < 6; corner++, offset += LINE_STRIDE)
    {
      const end = corner === 2 || corner >= 4;
      const position = end ? pos2 : pos1, neighbor = end ? posNext : posPrev;
      for (let axis = 0; axis < 3; axis++)
      {
        buffer.setFloat32(offset + axis * 4, position[axis], true);
        buffer.setFloat32(offset + 12 + axis * 4, (pos2[axis] - pos1[axis]) * (end ? -1 : 1), true);
        buffer.setFloat32(offset + 56 + axis * 4, neighbor[axis], true);
      }
      buffer.setFloat32(offset + 24, corner === 0 || corner === 2 || corner === 5 ? -width : width, true);
      buffer.setFloat32(offset + 28, end ? 1 : 0, true);
      buffer.setFloat32(offset + 32, end ? length2 : length1, true);
      buffer.setFloat32(offset + 36, line.multiColorBorder, true);
      buffer.setFloat32(offset + 40, length2 - length1, true);
      buffer.setFloat32(offset + 44, line.animationSpeed, true);
      buffer.setFloat32(offset + 48, line.animationScale, true);
      buffer.setFloat32(offset + 52, lineID, true);
      buffer.setUint32(offset + 68, end ? color2 : color1, true);
      buffer.setUint32(offset + 72, multi, true);
      buffer.setUint32(offset + 76, overlay, true);
    }
  }

  /**
   * Writes particle quads with Math.random in place of the platform C rand
   * stream. DataView replaces the native pointer; the native unwritten
   * nextLineDir bytes are zeroed deterministically, with no seeded guarantee.
   */
  @meta.blue.method
  @meta.adapted
  WriteParticleVerticesToBuffer(pos1, col1, length1, pos2, col2, length2, lineID, buffer, offset = 0)
  {
    const line = this.lines[lineID], width = this.lineWidthFactor * line.width;
    const random = Math.random(), color1 = swizzleColor(col1), color2 = swizzleColor(col2);
    const multi = swizzleColor(line.multiColor), overlay = swizzleColor(line.overlayColor);
    for (let corner = 0; corner < 6; corner++, offset += LINE_STRIDE)
    {
      const end = corner === 2 || corner >= 4;
      for (let axis = 0; axis < 3; axis++)
      {
        buffer.setFloat32(offset + axis * 4, pos1[axis], true);
        buffer.setFloat32(offset + 12 + axis * 4, pos2[axis] - pos1[axis], true);
        buffer.setFloat32(offset + 44 + axis * 4, line.intermediatePosition[axis], true);
        buffer.setFloat32(offset + 56 + axis * 4, 0, true);
      }
      buffer.setFloat32(offset + 24, corner === 0 || corner === 2 || corner === 5 ? -width : width, true);
      buffer.setFloat32(offset + 28, end ? width : -width, true);
      buffer.setFloat32(offset + 32, end ? length2 : length1, true);
      buffer.setFloat32(offset + 36, random, true);
      buffer.setFloat32(offset + 40, length2 - length1, true);
      // Native quirk cpp:328: the fourth vertex omits the color swizzle.
      buffer.setUint32(offset + 68, corner === 3 ? color.toARGB(col1) : end ? color2 : color1, true);
      buffer.setUint32(offset + 72, multi, true);
      buffer.setUint32(offset + 76, overlay, true);
    }
  }

  /** Carbon's line sets participate in transparent sorting. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Collects transparent, additive, or picking lines through the native gates. */
  @meta.blue.method
  @meta.implemented
  GetBatches(accumulator, batchType, perObjectData, _reason)
  {
    if (!this.display) return;
    if ((batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT && !this.additive) ||
      (batchType === TriBatchType.TRIBATCHTYPE_ADDITIVE && this.additive))
    {
      this.GetBatchImpl(accumulator, perObjectData, this.lineEffect);
    }
    else if (batchType === TriBatchType.TRIBATCHTYPE_PICKING && this.pickEffect)
    {
      this.GetBatchImpl(accumulator, perObjectData, this.pickEffect);
    }
  }

  /**
   * Submits the native non-indexed triangle batch. Renderer camera state lives
   * on the main context in JS. Native cpp:1117 uses the LOCAL sphere center for
   * packed depth, unlike GetSortValue's transformed center; preserve that quirk.
   */
  @meta.blue.method
  @meta.adapted
  GetBatchImpl(accumulator, perObjectData, effect)
  {
    if (!effect || !this._vertexBuffer.IsValid() || this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    batch.SetPerObjectData(perObjectData);
    const context = Tr2RenderContext_GetMainThreadRenderContext(), view = context.GetViewPosition();
    const distance = Math.hypot(this.boundingSphere[0] - view[0], this.boundingSphere[1] - view[1], this.boundingSphere[2] - view[2]);
    const z = Math.min(Math.max(Math.fround((distance + this.depthOffset) / context.GetFrustumRadius()), 0), 1);
    batch.depth = Math.fround(Math.fround(0xFFFFFFF) * Math.fround(1 - z)) >>> 0;
    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetStreamSource(0, this._vertexBuffer, LINE_STRIDE);
    batch.SetDrawInstanced(6 * this.currentSubmittedLineCount, 1, 0, 0);
    accumulator.Commit(batch);
  }

  /** Assigns the native line material without refilling the vertex stream. */
  @meta.blue.method
  @meta.implemented
  SetLineEffect(effect)
  {
    this.lineEffect = effect;
  }

  /** Assigns the native picking material without refilling the vertex stream. */
  @meta.blue.method
  @meta.implemented
  SetPickEffect(effect)
  {
    this.pickEffect = effect;
  }

  /** Distance from the transformed local bound to the active view. */
  @meta.blue.method
  @meta.blue.contextual(["camera"])
  @meta.adapted
  @meta.reason("Carbon reads the renderer-global view position; the collector supplies its active render context explicitly.")
  GetSortValue(context)
  {
    const { vec3_11 } = Tr2CurveLineSet.scratch;
    const viewPosition = context.GetViewPosition();
    vec3_11[0] = this.boundingSphere[0];
    vec3_11[1] = this.boundingSphere[1];
    vec3_11[2] = this.boundingSphere[2];
    vec3.transformMat4(vec3_11, vec3_11, this.worldTransform);
    const dx = viewPosition[0] - vec3_11[0];
    const dy = viewPosition[1] - vec3_11[1];
    const dz = viewPosition[2] - vec3_11[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz) + this.depthOffset;
  }

  /** Carbon's base intentionally supplies no scene-specific constants. */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(_accumulator)
  {
    return null;
  }

  /** Carbon ITr2Pickable identity for every line primitive. */
  @meta.blue.method
  @meta.implemented
  GetID(_areaId)
  {
    return this;
  }

  /** Dispatches the selected pick categories through the same batch contract. */
  @meta.blue.method
  @meta.implemented
  GetPickingBatches(batches, pickTypes = TR2_PICK_TYPE_DEFAULT, perObjectData = null)
  {
    if (pickTypes & Tr2PickType.PICK_TYPE_PICKING)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    }
    if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
    }
    if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_TRANSPARENT, perObjectData);
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_ADDITIVE, perObjectData);
    }
  }

  /** Sets Carbon's additive-pass selector. */
  @meta.blue.method
  @meta.implemented
  SetAdditiveFlag(value)
  {
    this.additive = !!value;
  }

  /** Sets Carbon's dynamic CPU-update policy. */
  @meta.blue.method
  @meta.implemented
  SetDynamicFlag(value)
  {
    this.dynamic = !!value;
  }

  /**
   * Appends one tessellated segment's vertices to the line buffer.
   */
  #addLineData(line)
  {
    if (this.emptyLineID.length === 0)
    {
      this.lines.push(line);
      return this.lines.length - 1;
    }
    const id = this.emptyLineID.pop();
    this.lines[id] = line;
    return id;
  }

  /**
   * Builds a line record from its endpoints, colours and width.
   */
  #createLine(type, position1, color1, position2, color2, intermediatePosition, width, numOfSegments)
  {
    return {
      type,
      position1: vec3.clone(position1),
      color1: vec4.clone(color1),
      position2: vec3.clone(position2),
      color2: vec4.clone(color2),
      intermediatePosition: vec3.clone(intermediatePosition),
      width,
      multiColor: vec4.create(),
      multiColorBorder: -1,
      overlayColor: vec4.create(),
      animationSpeed: 0,
      animationScale: 1,
      numOfSegments
    };
  }

  /**
   * Whether a line identifier still refers to a live line.
   */
  #isValidLineID(id)
  {
    return Number.isInteger(id) && id >= 0 && id < this.lines.length && this.lines[id].type !== Tr2CurveLineSet.LineType.LINETYPE_INVALID;
  }

  static scratch = {
    vec3_0: vec3.create(),
    vec3_1: vec3.create(),
    vec3_2: vec3.create(),
    vec3_3: vec3.create(),
    vec3_4: vec3.create(),
    vec3_5: vec3.create(),
    vec3_6: vec3.create(),
    vec3_7: vec3.create(),
    vec3_8: vec3.create(),
    vec3_9: vec3.create(),
    vec3_10: vec3.create(),
    vec3_11: vec3.create(),
    vec4_0: vec4.create(),
    vec4_1: vec4.create()
  };

  static #segmentPoints = [3, 4, 5, 6].map(index => Tr2CurveLineSet.scratch[`vec3_${index}`]);

  static #absolutePoints = [7, 8, 9, 10].map(index => Tr2CurveLineSet.scratch[`vec3_${index}`]);

  static #declaration = new Tr2VertexDefinition();

  static LineType = Object.freeze({
    LINETYPE_INVALID: 0,
    LINETYPE_STRAIGHT: 1,
    LINETYPE_SPHERED: 2,
    LINETYPE_CURVED: 3,
    LINETYPE_PARTICLE: 4,
  });

}

// ITr2Pickable is not yet a registered JS contract; keep its existing methods.
meta.blue.interfaceTable({ interfaces: [ITr2Renderable, INotify], chainTo: null })(Tr2CurveLineSet, { kind: "class" });
