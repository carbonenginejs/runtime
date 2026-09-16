// Source: videoplayer/Metadata.h:131-158
//
// DROPPED WITH ITS OWNER. The deleter is the callable `std::unique_ptr` invokes
// when a frame goes out of scope: it returns the frame to its `FrameOwner` when
// there is one, and otherwise deletes it. Both halves of that decision are C++
// lifetime management, which JavaScript does not have and does not need.
//
// Nothing of the behaviour survives elsewhere, unlike a flattened record: there
// is no JavaScript place where "release or delete" has to be chosen.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's unique_ptr frame deleter; dropped with FrameOwner, because GC reclaims frames. */
export class FrameDeleter extends CjsModel
{

  /** m_owner (FrameOwner<Frame>*) - the pool to return the frame to, or null to delete it. */
  owner = null;

}

CjsSchema.define(FrameDeleter, {
  className: "FrameDeleter", carbon: "FrameDeleter", family: "videoPlayer",
  fields: {
    owner: type.objectRef("FrameOwner")
  }
});
