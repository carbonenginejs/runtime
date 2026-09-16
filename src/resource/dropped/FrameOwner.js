// Source: videoplayer/Metadata.h:120-129
//
// DROPPED: GARBAGE COLLECTION IS THE OWNER. Carbon's frame queues hand out raw
// `Frame*`, so something must say what happens when a frame is finished with -
// return it to the pool that made it, or delete it. `FrameOwner` is that
// something: one virtual `ReleaseFrame`, implemented by a decoder that recycles
// its frame buffers.
//
// A JavaScript frame is reclaimed when nothing holds it, so the interface has no
// job. A decoder that wants to reuse its buffers keeps its own free list, which
// is a private decision rather than a contract between the queue and the owner.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's frame-pool owner interface; dropped because GC reclaims frames. */
export class FrameOwner extends CjsModel
{

}

CjsSchema.define(FrameOwner, {
  className: "FrameOwner", carbon: "FrameOwner", family: "videoPlayer",
  fields: {}
});
