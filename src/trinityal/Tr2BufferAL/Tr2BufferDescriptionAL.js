// Source: trinity/trinityal/include/Tr2BufferAL.h
import { CjsSchema, type } from "#schema";
// Source: trinity/trinityal/src/Tr2BufferAL.cpp (the description constructors)
import { GetBytesPerPixel, PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "../../global/consts/renderContext/index.js";

/**
 * How a buffer is laid out and what may touch it.
 *
 * The field initialisers are Carbon's default constructor (Tr2BufferAL.cpp:11-18).
 * Carbon's two other constructors differ only in where the stride comes from:
 * `create__Format` derives it from the pixel format, `create__Stride` is given
 * it outright for a structured buffer.
 */
export class Tr2BufferDescriptionAL
{
  /** A `PixelFormat` value; unknown for a structured buffer. */
  format = PixelFormat.PIXEL_FORMAT_UNKNOWN;

  /** Bytes per element. */
  stride = 0;

  /** Elements. */
  count = 0;

  /** A `Tr2GpuUsage` bit set. */
  gpuUsage = Tr2GpuUsage.NONE;

  /** A `Tr2CpuUsage` bit set. */
  cpuUsage = Tr2CpuUsage.NONE;

  /**
   * Carbon's `Tr2BufferDescriptionAL( format, count, gpuUsage, cpuUsage )`
   * (Tr2BufferAL.cpp:20-31): a typed buffer, whose stride follows from its
   * format.
   *
   * @param {number} format A `PixelFormat` value.
   * @param {number} count Elements.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @returns {Tr2BufferDescriptionAL} The description.
   */
  static create__Format(format, count, gpuUsage, cpuUsage)
  {
    const description = new Tr2BufferDescriptionAL();

    description.format = format;
    description.stride = GetBytesPerPixel(format);
    description.count = count;
    description.gpuUsage = gpuUsage;
    description.cpuUsage = cpuUsage;

    return description;
  }

  /**
   * Carbon's `Tr2BufferDescriptionAL( stride, count, gpuUsage, cpuUsage )`
   * (Tr2BufferAL.cpp:33-44): a structured buffer, whose stride is given and
   * whose format is `PIXEL_FORMAT_UNKNOWN`.
   *
   * @param {number} stride Bytes per element.
   * @param {number} count Elements.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @returns {Tr2BufferDescriptionAL} The description.
   */
  static create__Stride(stride, count, gpuUsage, cpuUsage)
  {
    const description = new Tr2BufferDescriptionAL();

    description.format = PixelFormat.PIXEL_FORMAT_UNKNOWN;
    description.stride = stride;
    description.count = count;
    description.gpuUsage = gpuUsage;
    description.cpuUsage = cpuUsage;

    return description;
  }

  /**
   * The buffer's size in bytes.
   *
   * @returns {number} Stride times count.
   */
  GetSizeInBytes()
  {
    return this.stride * this.count;
  }
}

CjsSchema.decorateField(Tr2BufferDescriptionAL, "format", type.uint32);
CjsSchema.decorateField(Tr2BufferDescriptionAL, "stride", type.uint32);
CjsSchema.decorateField(Tr2BufferDescriptionAL, "count", type.uint32);
CjsSchema.decorateField(Tr2BufferDescriptionAL, "gpuUsage", type.int32);
CjsSchema.decorateField(Tr2BufferDescriptionAL, "cpuUsage", type.int32);
CjsSchema.meta.carbon("Tr2BufferDescriptionAL")(Tr2BufferDescriptionAL);
