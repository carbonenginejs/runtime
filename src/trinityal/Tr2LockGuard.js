// Source: trinity/trinityal/Tr2LockGuard.h
// Source: trinity/trinityal/Tr2LockGuard.cpp
//
// A debugging aid for locks that hand back device memory: the caller is given a
// SCRATCH block filled with 0xde instead, and the scratch is copied into the
// real memory only on unlock. Code that reads what it never wrote therefore
// sees 0xde rather than whatever the driver left there, and code that writes
// after unlock writes to a block that no longer exists.
//
// Carbon's DX11 buffers, constant buffers and textures own one
// (`Tr2BufferALDx11.h:54`, `Tr2ConstantBufferALDx11.h:45`,
// `Tr2TextureALDx11.h:130`); the stub backend does not.
//
// Adapted: the scratch is `CCPMallocWithGuard`, which brackets the block with
// guard pages so an overrun faults at once. JavaScript has no raw memory and
// bounds-checks every typed-array access, so the scratch is a plain Uint8Array
// and the overrun it would catch throws a RangeError instead. The
// `CCP_LOGWARN` diagnostics and the debug-only `CCP_ASSERT`s are not carried:
// the runtime has no AL log channel here, and the control flow they sit in is
// reproduced exactly, including the paths that go on after warning.
//
// The file declares its methods by call rather than decorator because the
// layer is imported straight from source by its tests and raw Node cannot parse
// decorator syntax.

import { CjsSchema } from "#schema";


/**
 * A scratch block standing in for locked device memory.
 *
 * Carbon: Tr2LockGuard (trinity/trinityal/Tr2LockGuard.h:7)
 *
 * @adapted
 */
export class Tr2LockGuard
{
  /**
   * Registered name; `constructor.name` does not survive minification.
   *
   * @cjs
   * @implemented
   */
  static className = "Tr2LockGuard";

  /**
   * m_originalMemory: the real memory, written on unlock.
   *
   * @implemented
   */
  _originalMemory = null;

  /**
   * m_memory: the scratch block handed to the caller.
   *
   * @implemented
   */
  _memory = null;

  /**
   * m_size
   *
   * @implemented
   */
  _size = 0;

  /**
   * Builds a guard holding nothing.
   *
   * Carbon: Tr2LockGuard::Tr2LockGuard (trinity/trinityal/Tr2LockGuard.cpp:6-11)
   */
  constructor()
  {
  }

  /**
   * Releases the scratch block, as the C++ destructor does.
   *
   * Carbon: Tr2LockGuard::~Tr2LockGuard (trinity/trinityal/Tr2LockGuard.cpp:13-16)
   *
   * @adapted JavaScript has no deterministic destructor; the owner calls this
   *   when it releases the resource.
   */
  Destruct()
  {
    this._memory = null;
  }

  /**
   * Hands out a scratch block of `size` bytes, filled with 0xde, to be copied
   * into `originalMemory` on unlock.
   *
   * Carbon: Tr2LockGuard::Lock (trinity/trinityal/Tr2LockGuard.cpp:18-50)
   *
   * Locking a guard that is already locked drops the earlier scratch and starts
   * again (the C++ warns, then frees and reallocates); a zero size still
   * produces an (empty) block.
   *
   * @adapted
   * @param {number} size Bytes.
   * @param {Uint8Array} originalMemory The real memory written on unlock.
   */
  Lock(size, originalMemory)
  {
    this._memory = new Uint8Array(size).fill(0xde);
    this._originalMemory = originalMemory;
    this._size = size;
  }

  /**
   * Copies the scratch block into the real memory and drops it.
   *
   * Carbon: Tr2LockGuard::Unlock (trinity/trinityal/Tr2LockGuard.cpp:52-70)
   *
   * Nothing locked, or no real memory to write to, returns without doing
   * anything (the C++ warns); in the second case the scratch is kept, as in
   * Carbon.
   *
   * @adapted
   */
  Unlock()
  {
    if (!this._memory) return;

    if (!this._originalMemory) return;

    this._originalMemory.set(this._memory.subarray(0, this._size));
    this._memory = null;
    this._originalMemory = null;
  }

  /**
   * The scratch block, or null when nothing is locked.
   *
   * Carbon: Tr2LockGuard::GetMemory (trinity/trinityal/Tr2LockGuard.cpp:72-75)
   *
   * @implemented
   * @returns {Uint8Array|null} The scratch block.
   */
  GetMemory()
  {
    return this._memory;
  }
}

// States: m_originalMemory, m_memory and m_size are Tr2LockGuard.h:7 members; className is the registered name this port adds. The class is adapted
// because its methods are (the scratch block is a Uint8Array and there is no destructor).
CjsSchema.meta.carbon("Tr2LockGuard")(Tr2LockGuard);
