// Source: trinity/trinity/Font/Tr2FontMeasurer.h:20-24
//
//     class ITr2FontMeasurerNotifyTarget
//     {
//     public:
//         virtual void FontMeasurerChanged( Tr2FontMeasurer* p ) = 0;
//     };
//
// The listener side of Tr2FontMeasurer's change notification
// (RegisterForChangeNotification / UnregisterForChangeNotification,
// Font/Tr2FontMeasurer.cpp:1176-1184; notified at :1186-1192). Carbon declares
// it as its own plain C++ interface (not a BLUE_INTERFACE), so it has no Blue
// exposure. Implemented in Carbon by Tr2Sprite2dTextObject
// (Sprite2d/Tr2Sprite2dTextObject.h:17).
import { meta, blue } from "#schema";

/** Receives change notifications from a font measurer it registered with. */
@blue.define({ className: "ITr2FontMeasurerNotifyTarget", abstract: true })
export class ITr2FontMeasurerNotifyTarget
{
  /**
   * Carbon pure virtual `FontMeasurerChanged`: the measurer's text changed in
   * a way that invalidates whatever was built from it.
   *
   * @param {import("./Tr2FontMeasurer.js").Tr2FontMeasurer} _measurer The measurer that changed.
   * @returns {void}
   */
  @meta.abstract
  FontMeasurerChanged(_measurer)
  {
    throw new Error("ITr2FontMeasurerNotifyTarget.FontMeasurerChanged must be implemented by a concrete listener.");
  }
}
