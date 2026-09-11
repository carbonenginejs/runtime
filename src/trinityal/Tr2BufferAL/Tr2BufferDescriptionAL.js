// Source: trinity/trinityal/include/Tr2BufferAL.h
// Source: trinity/trinityal/src/Tr2BufferAL.cpp (the description constructors)
import { GetBytesPerPixel, PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "../../global/consts/renderContext/index.js";

/**
 * How a buffer is laid out and what may touch it.
 *
 * Carbon's two non-default constructors differ only in where the stride comes
 * from: `FromFormat` derives it from the pixel format, `FromStride` is given
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
   * A typed buffer, whose stride follows from its format.
   *
   * @param {number} format A `PixelFormat` value.
   * @param {number} count Elements.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @returns {Tr2BufferDescriptionAL} The description.
   */
  static FromFormat(format, count, gpuUsage, cpuUsage)
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
   * A structured buffer, whose stride is given.
   *
   * @param {number} stride Bytes per element.
   * @param {number} count Elements.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @returns {Tr2BufferDescriptionAL} The description.
   */
  static FromStride(stride, count, gpuUsage, cpuUsage)
  {
    const description = new Tr2BufferDescriptionAL();

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
