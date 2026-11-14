// Source: trinity/trinity/Include/ITriTextureRes.h:6-24
import { exposure as be } from "#be";
import { IRoot } from "#exposure/IRoot";


/**
 * What a texture resource answers: its size, its mip count, whether it loaded, and a name for debugging.
 * A member that holds any texture resource declares this interface.
 *
 * Carbon: ITriTextureRes (trinity/trinity/Include/ITriTextureRes.h:6-24)
 */
@be.interface("ITriTextureRes")
@be.inherit(IRoot)
export class ITriTextureRes extends IRoot
{

  /**
   * Returns the width of mip zero.
   *
   * @abstract
   */
  @be.abstract
  GetWidth()
  {
  }

  /**
   * Returns the height of mip zero.
   *
   * @abstract
   */
  @be.abstract
  GetHeight()
  {
  }

  /**
   * Returns the number of mip levels.
   *
   * @abstract
   */
  @be.abstract
  GetMipLevelCount()
  {
  }

  /**
   * Returns whether the texture can be used.
   *
   * @abstract
   */
  @be.abstract
  IsValid()
  {
  }

  /**
   * Sets the name shown in debugging and memory overviews.
   *
   * @abstract
   */
  @be.abstract
  SetName(_name)
  {
  }

  /**
   * Returns the name shown in debugging and memory overviews.
   *
   * @abstract
   */
  @be.abstract
  GetName()
  {
  }

  /**
   * Writes pixels into a region of the texture. The interface's own body does nothing and fails
   * (ITriTextureRes.h:16-19).
   *
   * @implemented
   * @param {number} _left Left edge of the region.
   * @param {number} _top Top edge of the region.
   * @param {number} _right Right edge of the region.
   * @param {number} _bottom Bottom edge of the region.
   * @param {ArrayBufferView} _source The pixels.
   * @param {number} _sourcePitch Bytes per source row.
   * @returns {number} -1.
   */
  UpdateSubresource(_left, _top, _right, _bottom, _source, _sourcePitch)
  {
    return -1;
  }

  /**
   * Sets the colour the texture averages to. The interface's own body does nothing (ITriTextureRes.h:20-22).
   *
   * @implemented
   * @param {number} _red Red.
   * @param {number} _green Green.
   * @param {number} _blue Blue.
   * @param {number} _alpha Alpha.
   * @returns {void}
   */
  SetAverageColor(_red, _green, _blue, _alpha)
  {
  }

}
