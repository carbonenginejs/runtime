// Source: trinity/trinity/Tr2ImpostorManager.h
import { ITr2ImpostorSourceImpostorHash } from "../mesh/ITr2ImpostorSource/ITr2ImpostorSourceImpostorHash.js";

/** Native private capture record, deliberately not a Blue class. */
export class Impostor
{
  /** Top-left atlas texel center, stored as half-float bits. */
  texcoord = new Uint16Array(2); // alloc: persistent native coordinate pair
  /** Most recently submitted orientation. */
  hash = new ITr2ImpostorSourceImpostorHash();
  /** Orientation last copied into the atlas; native uninitialized storage starts zero in JS. */
  oldHash = new ITr2ImpostorSourceImpostorHash();
  /** Source-computed priority for the next capture. */
  renderPriority = 0;
  /** Whether submitted this frame. */
  used = false;
  /** Newly allocated objects already occupy this frame's render queue. */
  render = false;
}
