// Source: trinity/trinity/Tr2AtlasTexture.h:17-21
//
//     class ITr2AtlasTextureNotifyTarget
//     {
//     public:
//         virtual void AtlasTextureChanged( Tr2AtlasTexture* p ) = 0;
//     };
//
// The listener side of Tr2AtlasTexture's change notification
// (RegisterForChangeNotification / UnregisterForChangeNotification,
// Tr2AtlasTexture.cpp:463-471; notified at :491-497). Carbon declares it as its
// own plain C++ interface (not a BLUE_INTERFACE), so it has no Blue exposure.
// Implemented in Carbon by Tr2Sprite2dTexture (Sprite2d/Tr2Sprite2dTexture.h:20).
import { meta, blue } from "#schema";

/** Receives change notifications from an atlas texture it registered with. */
@blue.define({ className: "ITr2AtlasTextureNotifyTarget", abstract: true })
export class ITr2AtlasTextureNotifyTarget
{
  /**
   * Carbon pure virtual `AtlasTextureChanged`: the atlas texture changed in a
   * way that invalidates whatever was built from it.
   *
   * @param {import("./Tr2AtlasTexture.js").Tr2AtlasTexture} _texture The atlas texture that changed.
   * @returns {void}
   */
  @meta.abstract
  AtlasTextureChanged(_texture) {}
}
