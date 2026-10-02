// Source: trinity/trinity/Tr2ImpostorManager.h
// Source: trinity/trinity/Tr2ImpostorManager.cpp
import { toHalfFloat } from "#math/num";

/** Native private atlas pool; coordinates retain their float16 bit patterns. */
export class ImpostorAtlas
{
  /** Row-major free slots, reserved from the back. */
  _free = [];

  /** Rebuilds the native grid; invalid zero tile sizes throw instead of dividing by zero. */
  Resize(width, height, itemWidth, itemHeight)
  {
    this._free.length = 0;
    if (!itemWidth || !itemHeight) throw new RangeError("Impostor tile dimensions must be nonzero.");
    const xCount = Math.floor(width / itemWidth), yCount = Math.floor(height / itemHeight);
    for (let j = 0; j < yCount; j++)
    {
      for (let i = 0; i < xCount; i++)
      {
        const uint16_0 = new Uint16Array(2); // alloc: each free slot owns its native half-float pair
        uint16_0[0] = toHalfFloat(Math.fround(Math.fround(i * itemWidth + 0.5) / width));
        uint16_0[1] = toHalfFloat(Math.fround(Math.fround(j * itemHeight + 0.5) / height));
        this._free.push(uint16_0);
      }
    }
  }

  /** Copies the last free coordinate, returning false when full. */
  Reserve(coord)
  {
    if (!this._free.length) return false;
    coord.set(this._free.pop());
    return true;
  }

  /** Returns a value copy to the free stack, matching the native by-value argument. */
  Drop(coord)
  {
    this._free.push(coord.slice()); // alloc: returned native coordinate value
  }
}
