import { CjsSchema } from "#schema";
import { exposure as be } from "#be";
import { IInitialize } from "../../blue/exposure/IInitialize.js";
// Source: trinity/trinity/Shader/Utils/Tr2DataTextureManager.h
// Source: trinity/trinity/Shader/Utils/Tr2DataTextureManager.cpp
// Source: trinity/trinity/Shader/Utils/Tr2DataTextureManager_Blue.cpp
// Hand-maintained from Carbon source.
//
// Packs per-object impact blocks into one 256x4 RGBA32F texture, published as
// the global "ImpactShieldDataMap". Each block is a header column followed by
// blockLength data columns; an owner reads its block through the pixel offset
// GetTextureOffset returns after the scene's Update.
//
// Carbon derives this from Tr2DeviceResource, whose constructor registers it
// with TriDevice and whose PrepareResources gates OnPrepareResources. There is
// explicit JS teardown; Release() retains the existing owner-facing entry.
import { type } from "#schema";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { Succeeded } from "../../trinityal/ALResult.js";
import { Tr2TextureSubresource } from "../../trinityal/Tr2HalHelperStructures/Tr2TextureSubresource.js";
import { Tr2SubresourceData } from "../../trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { Tr2TextureReference } from "../core/Tr2TextureReference.js";
import { Tr2VariableStore } from "../core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "../generated/trinityCore/enums.js";
import { Tr2DeviceResource } from "../core/device/Tr2DeviceResource.js";

const IMPACT_SHIELD_DATA_MAP = "ImpactShieldDataMap";
const VEC4_BYTES = 16;

/** Packs shader-readable data blocks into the shared impact data texture. */
@be.define({
  name: "Tr2DataTextureManager",
  inherit: [ IInitialize, Tr2DeviceResource ],
  // Tr2DataTextureManager_Blue.cpp:10-18, in Carbon's order.
  members: [
    [ be.ATTR, "name", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "textureWidth", be.READ ],
    [ be.ATTR, "textureHeight", be.READ ],
    [ be.ATTR, "blockDataNextIdx", be.READ ],
    [ be.ATTR, "maxBlockCount", be.READ ],
    [ be.ATTR, "maxPixelCount", be.READ ]
  ]
})

export class Tr2DataTextureManager
{
  /** @cjs Infrastructure lives until explicit teardown, never idle purge. */
  _neverPurge = true;


  /** m_textureWidth (uint32_t) [READ] */
  @type.uint32
  textureWidth = 256;

  /** m_textureHeight (uint32_t) [READ] */
  @type.uint32
  textureHeight = 4;

  /** m_blockDataNextIdx (int32_t) [READ] */
  @type.int32
  blockDataNextIdx = 1;

  /** m_maxBlockCount (uint32_t) [READ] */
  @type.uint32
  maxBlockCount = 0;

  /** m_maxPixelCount (uint32_t) [READ] */
  @type.uint32
  maxPixelCount = 0;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */

  @type.string
  name = "";

  /** m_blockData: id -> flat Float32Array, header vec4s then data[x*H + y] vec4s. */
  _blockData = new Map();

  /** m_blockPriority, a std::multimap: [priority, id] pairs in insertion order. */
  _blockPriority = [];

  /** m_dataTexture */
  _dataTexture = new Tr2TextureReference();

  /** m_dataTextureOffsets: id -> pixel offset. */
  _dataTextureOffsets = new Map();

  /**
   * Registers the data texture as ImpactShieldDataMap and prepares it, as
   * Carbon's constructor does (Tr2DataTextureManager.cpp:8-20); the
   * Tr2DeviceResource base registers with the device first
   * (Tr2DeviceResource.cpp:10-13), so a scene built before the device gets
   * its texture when the device prepares its resources.
   */
  constructor()
  {
    CjsSchema.getConstructor("TriDevice").RegisterResource(this);
    Tr2VariableStore.globalStore().RegisterVariableInternal(IMPACT_SHIELD_DATA_MAP, TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._dataTexture);
    this.PrepareResources();
  }

  /**
   * Unregisters the variable and the device resource and drops the texture:
   * the destructor (cpp:22-25) plus the base's unregistration
   * (Tr2DeviceResource.cpp:15-18).
   *
   * Carbon: ~Tr2DataTextureManager (trinity/trinity/Shader/Utils/Tr2DataTextureManager.cpp:22-25).
   * @adapted Preserves explicit texture release; the graph dispatches base cleanup.
   */
  _Destructor()
  {
    Tr2VariableStore.globalStore().UnregisterVariable(IMPACT_SHIELD_DATA_MAP);
    this.ReleaseResources();
  }

  /** @adapted Existing owner-facing release forwards to graph teardown. */
  Release()
  {
    this.Destruct();
  }

  /**
   * Nothing to do after loading (Carbon cpp:31-34).
   *
   * @implemented
   */

  Initialize()
  {
    return true;
  }

  /**
   * Creates the zero-filled RGBA32F data texture and announces it, whether or
   * not creation succeeded (Carbon cpp:62-77).
   *
   * Carbon creates in place on the by-value Tr2TextureAL; JS textures come from the
   * render-context factory and are installed on the reference, which broadcasts.
   *
   * @adapted
   */

  _OnPrepareResources()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    const width = this.textureWidth;
    const height = this.textureHeight;
    const zeros = new Float32Array(width * height * 4);
    const texture = renderContext.CreateTexture(
      Tr2BitmapDimensions.create__WidthHeightMipCountFormat(width, height, 1, PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT),
      {
        gpuUsage: Tr2GpuUsage.SHADER_RESOURCE,
        cpuUsage: Tr2CpuUsage.READ | Tr2CpuUsage.WRITE,
        initialData: [ new Tr2SubresourceData(new Uint8Array(zeros.buffer), width * VEC4_BYTES, width * height * VEC4_BYTES) ]
      }
    );
    try
    {
      this._dataTexture.SetTexture(texture);
    }
    finally
    {
      if (texture) texture.Destroy();
    }
    return texture !== null;
  }

  /**
   * Drops the data texture and announces it (Carbon cpp:40-45).
   *
   * Carbon resets the by-value texture to an empty Tr2TextureAL; JS destroys the
   * texture and installs null.
   *
   * @adapted
   */

  ReleaseResources(_storage)
  {
    this._dataTexture.SetTexture(null);
  }

  /**
   * Republishes the data texture as ImpactShieldDataMap (Carbon cpp:84-87).
   *
   * @implemented
   */

  SetVariables()
  {
    Tr2VariableStore.globalStore().RegisterVariableInternal(IMPACT_SHIELD_DATA_MAP, TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._dataTexture);
  }

  /**
   * Writes every queued block into the texture by descending priority and
   * records each block's pixel offset (Carbon cpp:93-164). With nothing
   * queued the previous offsets survive, as in Carbon; offsets are recorded
   * only when the texture maps.
   *
   * @implemented
   */

  Update(_updateContext)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    this.maxPixelCount = 0;
    this.maxBlockCount = 0;
    if (this._blockData.size === 0) return;

    let pixelOffset = 0;
    this._dataTextureOffsets.clear();
    const texture = this._dataTexture.GetTexture();
    const mapped = texture ? texture.MapForWriting(Tr2TextureSubresource.create__MipLevel(0), renderContext) : null;
    if (mapped && Succeeded(mapped.result))
    {
      const floats = new Float32Array(mapped.data.buffer, mapped.data.byteOffset, mapped.data.byteLength >> 2);
      const rowFloats = mapped.pitch >> 2;
      const height = this.textureHeight;

      // multimap rbegin->rend: highest priority first, equal priorities in
      // reverse insertion order.
      const ordered = this._blockPriority.slice().sort((left, right) => left[0] - right[0]).reverse();
      for (const [ , blockID ] of ordered)
      {
        const block = this._blockData.get(blockID);
        if (!block) continue;
        if (pixelOffset + block.blockLength + 1 >= this.textureWidth) break;

        this._dataTextureOffsets.set(blockID, pixelOffset);
        for (let y = 0; y < height; y++)
        {
          floats.set(block.values.subarray(y * 4, y * 4 + 4), y * rowFloats + pixelOffset * 4);
        }
        const dataStart = height * 4;
        for (let y = 0; y < height; y++)
        {
          for (let x = 0; x < block.blockLength; x++)
          {
            const source = dataStart + (x * height + y) * 4;
            floats.set(block.values.subarray(source, source + 4), y * rowFloats + (pixelOffset + 1 + x) * 4);
          }
        }
        pixelOffset += block.blockLength + 1;
      }
      texture.UnmapForWriting(renderContext);
    }

    this.maxPixelCount = pixelOffset;
    this.maxBlockCount = this._blockData.size;
    this._blockData.clear();
    this._blockPriority.length = 0;
  }

  /**
   * Queues a copy of one block for the next Update and returns its id, or -1
   * for a non-positive priority (Carbon cpp:175-203).
   *
   * Carbon reads flat Vector4 arrays; the JS owners keep columns of vec4s, which
   * are copied here into Carbon's flat header-then-data[x*H + y] order.
   *
   * @adapted
   * @param {Float32Array[]} header - textureHeight vec4s, one per texture row
   * @param {Number} blockLength - data columns, not counting the header
   * @param {Float32Array[][]} data - blockLength columns of textureHeight vec4s
   * @param {Number} priority - higher packs first
   */

  RequestBlockData(header, blockLength, data, priority)
  {
    if (priority <= 0) return -1;

    const height = this.textureHeight;
    const length = Number(blockLength) >>> 0;
    const values = new Float32Array((1 + length) * height * 4);
    for (let y = 0; y < height; y++) values.set(header[y], y * 4);
    for (let x = 0; x < length; x++)
    {
      for (let y = 0; y < height; y++) values.set(data[x][y], (height + x * height + y) * 4);
    }

    const blockID = this.blockDataNextIdx++;
    this._blockData.set(blockID, { blockLength: length, values });
    this._blockPriority.push([ Number(priority), blockID ]);
    return blockID;
  }

  /**
   * Returns a block's pixel offset from the last packing Update, or -1 (Carbon cpp:211-220).
   *
   * @implemented
   */

  GetTextureOffset(blockID)
  {
    return this._dataTextureOffsets.get(Number(blockID) | 0) ?? -1;
  }


  /**
   * The development description (Shader/Utils/Tr2DataTextureManager.cpp:52-55).
   *
   * @adapted a C++ output reference becomes the return value
   * @returns {string} The description.
   */
  GetDescription()
  {
    return "Tr2DataTextureManager";
  }
}
