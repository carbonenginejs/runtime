import { meta } from "#schema";
// Source: trinity/trinity/Sprite2d/ITr2Sprite2dTexture.h:14-18
//
//     class ITr2Sprite2dTextureNotifyTarget
//     {
//     public:
//         virtual void Sprite2dTextureChanged( ITr2Sprite2dTexture* p ) = 0;
//     };
//
// The listener side of ITr2Sprite2dTexture's change notification. Carbon
// declares it as its own plain C++ interface (not a BLUE_INTERFACE), so it has
// no Blue exposure. Implemented in Carbon by Tr2TexturedSpriteObject
// (Tr2SpriteObject.h:121) and Tr2Sprite2dLayer (Tr2Sprite2dLayer.h:18).
import { blue } from "#schema";

/** Receives change notifications from a Sprite2D texture it registered with. */
@blue.define({ className: "ITr2Sprite2dTextureNotifyTarget", abstract: true })
export class ITr2Sprite2dTextureNotifyTarget
{
  /**
   * Carbon pure virtual `Sprite2dTextureChanged`: the texture changed in a way
   * that invalidates whatever was built from it.
   *
   * @param {import("./ITr2Sprite2dTexture.js").ITr2Sprite2dTexture} _texture The texture that changed.
   * @returns {void}
   */
  @meta.abstract
  Sprite2dTextureChanged(_texture) {}
}
