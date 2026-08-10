// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Shader/Utils/Tr2DataTextureManager.h:10-60
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
// Nothing is implemented yet. When it is, the CPU registry lands here and the
// engine passes its texture adapter in.
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

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

}
