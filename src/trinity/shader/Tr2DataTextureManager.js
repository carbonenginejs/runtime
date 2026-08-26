// Source: trinity/trinity/Shader/Utils/Tr2DataTextureManager.h:10-60
// Hand-maintained from Carbon source.
//
// THE DEVICE HALF IS AN ENGINE ADAPTER, NOT WORK FOR THIS CLASS. Carbon
// derives this from Tr2DeviceResource, which reads as a device class and is
// misleading: the split in its own header is what matters.
//
// PUBLIC, and portable - this is the part that belongs here:
//
//   RequestBlockData(header, blockLength, data, priority) -> block id
//   GetTextureOffset(blockID)                             -> offset
//   SetVariables()      publishes those offsets as shader variables
//   Update(updateContext)
//
// PRIVATE, and device-only - this is the part an engine supplies:
//
//   OnPrepareResources()    creates the backing texture
//   ReleaseResources(s)     releases it
//
// So the shape is CjsBatchManager's: a neutral CPU registry that packs blocks,
// hands back ids and offsets, and publishes them, with the texture creation
// and upload injected. Implementing OnPrepareResources inside Trinity would
// put a GPU texture behind a graph class, which is the one thing this package
// does not do.
//
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** Packs shader-readable data blocks into a shared texture, whose allocation an engine adapter owns. */
@type.define({ className: "Tr2DataTextureManager", family: "shader" })
export class Tr2DataTextureManager extends CjsModel
{

  /** m_textureWidth (uint32_t) [READ] */
  @io.read
  @type.uint32
  textureWidth = 256;

  /** m_textureHeight (uint32_t) [READ] */
  @io.read
  @type.uint32
  textureHeight = 4;

  /** m_blockDataNextIdx (int32_t) [READ] */
  @io.read
  @type.int32
  blockDataNextIdx = 1;

  /** m_maxBlockCount (uint32_t) [READ] */
  @io.read
  @type.uint32
  maxBlockCount = 0;

  /** m_maxPixelCount (uint32_t) [READ] */
  @io.read
  @type.uint32
  maxPixelCount = 0;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  #blocks = new Map();

  #priorities = new Map();

  #offsets = new Map();

  #packedBlocks = [];

  /** Initializes the CPU data-texture block manager. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Queues one data-texture block for the next Update. Rows are copied so an
   * owner can keep mutating its live impact data after submission.
   */
  @carbon.method
  @impl.adapted
  RequestBlockData(header, blockLength, data, priority)
  {
    const normalizedPriority = Number(priority);
    if (normalizedPriority <= 0) return -1;

    const id = this.blockDataNextIdx++;
    const length = Number(blockLength) >>> 0;
    this.#blocks.set(id, {
      header: cloneRows(header, this.textureHeight),
      blockLength: length,
      data: cloneRows(data, length)
    });

    // Carbon's std::map<float, id> gives one block ownership of a duplicate
    // priority. Preserve that exact replacement rule.
    this.#priorities.set(normalizedPriority, id);
    return id;
  }

  /** Returns the last packed pixel offset for a submitted block, or -1. */
  @carbon.method
  @impl.implemented
  GetTextureOffset(blockID)
  {
    return this.#offsets.get(Number(blockID) | 0) ?? -1;
  }

  /**
   * Packs queued blocks by descending priority. The engine reads GetPackedBlocks
   * and uploads the returned CPU rows into its own texture realization.
   */
  @carbon.method
  @impl.adapted
  Update(_updateContext)
  {
    this.#offsets.clear();
    this.#packedBlocks.length = 0;

    let pixelOffset = 0;
    const priorities = Array.from(this.#priorities.entries())
      .sort((left, right) => right[0] - left[0]);

    for (const [ priority, id ] of priorities)
    {
      const block = this.#blocks.get(id);
      if (!block) continue;
      if (pixelOffset + block.blockLength + 1 >= this.textureWidth) break;

      this.#offsets.set(id, pixelOffset);
      this.#packedBlocks.push({ id, priority, offset: pixelOffset, ...block });
      pixelOffset += block.blockLength + 1;
    }

    this.maxPixelCount = pixelOffset;
    this.maxBlockCount = this.#blocks.size;
    this.#blocks.clear();
    this.#priorities.clear();
    return this.#packedBlocks;
  }

  /** Borrowed packed CPU descriptor list for an engine texture adapter. */
  GetPackedBlocks()
  {
    return this.#packedBlocks;
  }

  /**
   * Carbon republishes the realized texture through the global variable store;
   * the GPU-free runtime has no texture object to publish, so this is the
   * portable no-op half of that contract.
   */
  @carbon.method
  @impl.noop
  SetVariables()
  {
  }

}


function cloneRows(rows, count)
{
  const source = Array.from(rows ?? []);
  return Array.from({ length: count }, (_value, index) =>
  {
    const row = source[index];
    if (Array.isArray(row)) return row.map(value => ArrayBuffer.isView(value) ? new Float32Array(value) : value);
    return ArrayBuffer.isView(row) ? new Float32Array(row) : row;
  });
}
