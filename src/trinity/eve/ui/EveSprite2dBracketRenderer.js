import { vec4 } from "#math/vec4";
// Source: trinity/trinity/EveSprite2dBracketRenderer.h
// Source: trinity/trinity/EveSprite2dBracketRenderer.cpp
// Source: trinity/trinity/EveSprite2dBracketRenderer_Blue.cpp
// Derives from Carbon's Tr2SpriteObject to inherit its Sprite2D contract.
import { meta } from "#schema";
import { Tr2BufferAL, Tr2BufferDescriptionAL, Failed } from "#trinityal";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2SpriteObjectBlendMode, Tr2SpriteObjectEffect, Tr2SpriteTarget, Tr2Sprite2dTextureSettings } from "../../generated/sprite2d/enums.js";
import { Tr2SpriteObject } from "../../sprite2d/Tr2SpriteObject.js";


/**
 * Binds a bracket collection and icon atlas for rendering EVE UI markers in a
 * Sprite2D scene.
 */
@meta.define({ className: "EveSprite2dBracketRenderer", family: "eve/ui" })
@meta.blue.chainTo(Tr2SpriteObject)
export class EveSprite2dBracketRenderer extends Tr2SpriteObject
{

  /** m_iconAtlas (Tr2AtlasTexturePtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.rootRef("Tr2AtlasTexture")
  iconAtlas = null;

  /** m_brackets (PEveSprite2dBracketVector) [READ] */
  @meta.blue.read
  @meta.type.list("EveSprite2dBracket")
  brackets = [];

  /** Carbon submits its own buffers directly rather than joining sprite vertices. */
  @meta.blue.method
  @meta.implemented
  GetVertexCount()
  {
    return 0;
  }

  _vertexBuffer = new Tr2BufferAL();
  _indexBuffer = new Tr2BufferAL();
  _bracketCountInBuffers = 0;
  _textureWindow = vec4.create();

  /** Native atlas batch. DataView replaces writes through C++ vertex pointers.
   * Resource release is explicit until Tr2DeviceResource registration is ported. */
  @meta.blue.method
  @meta.adapted
  GatherSprites(renderer)
  {
    if (!this.display || !this.brackets.length) return;

    const count = this.brackets.length;
    // Carbon's index buffer is uint16. Reject overflow instead of wrapping indices.
    if (count > 16384) throw new RangeError("Bracket batch exceeds uint16 vertex capacity");

    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (this._bracketCountInBuffers !== count)
    {
      this._bracketCountInBuffers = 0;
      const usage = Tr2CpuUsage.READ | Tr2CpuUsage.WRITE;
      if (Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(88, count * 4, Tr2GpuUsage.VERTEX_BUFFER, usage), null, context))) return;
      if (Failed(this._indexBuffer.Create(Tr2BufferDescriptionAL.FromStride(2, count * 6, Tr2GpuUsage.INDEX_BUFFER, usage), null, context))) return;

      const mapping = this._indexBuffer.MapForWriting(context);
      if (Failed(mapping.result)) return;

      try
      {
        const indices = new DataView(mapping.data.buffer, mapping.data.byteOffset, mapping.data.byteLength);
        for (let i = 0; i < count; i++)
        {
          const base = i * 4, offset = i * 12;
          indices.setUint16(offset, base, true);
          indices.setUint16(offset + 2, base + 1, true);
          indices.setUint16(offset + 4, base + 3, true);
          indices.setUint16(offset + 6, base + 3, true);
          indices.setUint16(offset + 8, base + 1, true);
          indices.setUint16(offset + 10, base + 2, true);
        }
      }
      finally
      {
        this._indexBuffer.UnmapForWriting(context);
      }
      this._bracketCountInBuffers = count;
    }

    const mapping = this._vertexBuffer.MapForWriting(context);
    if (Failed(mapping.result)) return;

    let visible = 0;
    this.iconAtlas = null;
    try
    {
      const data = new DataView(mapping.data.buffer, mapping.data.byteOffset, mapping.data.byteLength);
      const parent = renderer.GetTranslation(), clip = renderer.GetClipRectangle();
      const xBase = parent[0] + this.displayX, yBase = parent[1] + this.displayY;
      for (const bracket of this.brackets)
      {
        if (!bracket.IsDisplay()) continue;

        const icon = bracket.GetIcon();
        if (!icon) throw new Error("Displayed bracket requires an atlas icon");
        if (icon.IsLoading()) continue;

        this.iconAtlas ??= icon;
        if (icon.GetTexture() !== this.iconAtlas.GetTexture()) throw new Error("Bracket icons must share one texture atlas");

        icon.GetTextureWindow(this._textureWindow);
        const [u, v, du, dv] = this._textureWindow;
        const color = bracket.GetColor(), position = bracket.translation;
        const x = xBase + position[0], y = yBase + position[1];
        for (let corner = 0; corner < 4; corner++)
        {
          const right = corner === 1 || corner === 2, bottom = corner >= 2;
          const offset = (visible * 4 + corner) * 88;
          // Native default vertex fields, including unused UVs and outline data.
          // Carbon defect fixed, CE-131 (EveSprite2dBracketRenderer.cpp:56-107, 111;
          // operator ruling 2026-10-13): Carbon writes the constant fields and the
          // clip rectangle only when the buffers are rebuilt for a new bracket count,
          // so a changed clip waits for the count to change. This port rewrites them
          // every frame.
          mapping.data.fill(0, offset, offset + 88);
          data.setFloat32(offset, x + (right ? icon.GetWidth() : 0), true);
          data.setFloat32(offset + 4, y + (bottom ? icon.GetHeight() : 0), true);
          for (let c = 0; c < 4; c++) data.setFloat32(offset + 12 + c * 4, color[c], true);
          data.setFloat32(offset + 28, u + (right ? du : 0), true);
          data.setFloat32(offset + 32, v + (bottom ? dv : 0), true);
          data.setFloat32(offset + 44, clip.left, true);
          data.setFloat32(offset + 48, clip.top, true);
          data.setFloat32(offset + 52, clip.right, true);
          data.setFloat32(offset + 56, clip.bottom, true);
          data.setFloat32(offset + 60, 1, true);
          data.setUint8(offset + 65, Tr2SpriteObjectBlendMode.TR2_SBM_BLEND | (Tr2SpriteTarget.COLOR << 3));
          data.setUint8(offset + 66, Tr2SpriteObjectEffect.TR2_SFX_ONE_TEXTURE);
        }
        visible++;
      }
    }
    finally
    {
      this._vertexBuffer.UnmapForWriting(context);
    }

    if (!visible) return;

    // Carbon (EveSprite2dBracketRenderer.cpp:198-199). The buffer overload's stale
    // start index and texture binding are CE-123 and CE-124, at the scene.
    renderer.SetTexture(0, this.iconAtlas, Tr2Sprite2dTextureSettings.S2D_TS_NONE);
    renderer.RenderTriangleVerts__Tr2BufferAL(this._vertexBuffer, visible * 4, this._indexBuffer, visible * 6);
  }

  /** Native device-resource release; callers also use this for explicit teardown. */
  @meta.implemented
  ReleaseResources(_storage)
  {
    this._vertexBuffer.Destroy();
    this._indexBuffer.Destroy();
    this._bracketCountInBuffers = 0;
  }

  /** Native resource preparation requires no additional work. */
  @meta.implemented
  OnPrepareResources()
  {
    return true;
  }

  /** Carbon's bracket renderer is deliberately not point-pickable. */
  @meta.blue.method
  @meta.implemented
  PickPoint(_x, _y, _renderer)
  {
    return null;
  }

}
