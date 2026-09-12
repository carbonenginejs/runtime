// Source: trinity/trinityal/metal/MetalUtils.h
//
// DROPPED AS A CLASS, LIVE AS A FIELD. Carbon's token is the arena region a
// constant buffer was last uploaded to, held as two atomics so several threads
// can publish into the same arena.
//
// CjsWebgpuConstantBufferAL carries it as `m_token = { frame, page, offset, size }`
// and its comment cites Carbon's own `buffer.m_buffer->m_token`. The atomics are
// plain numbers here because JavaScript uploads from one thread, which is the
// whole reason the class did not need to come across.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's atomic constant-arena token; dropped because the port carries it as a plain field on the constant buffer. */
@type.define({ className: "ConstantBufferToken", carbon: "ConstantBufferToken", family: "trinityal" })
export class ConstantBufferToken extends CjsModel
{

  /** offset (std::atomic<uint64_t>) - page index in the high 32 bits, offset in the low 32. */
  @type.unknown
  offset = 0;

  /** frame (std::atomic<uint64_t>) - Invalidate() decrements it; Reset() zeroes both. */
  @type.unknown
  frame = 0;

  /** frame-- : marks the region stale without releasing it. */
  Invalidate()
  {
    this.frame -= 1;
  }

  /** Returns the token to its unused state. */
  Reset()
  {
    this.frame = 0;
    this.offset = 0;
  }

}
