import { IRoot } from "#blue/IRoot";
// Source: trinity/trinity/Include/ITriMatrix.h:6-24
import { CjsSchema, meta } from "#schema";

/**
 * Carbon's matrix interface: construction, data access and Identity.
 *
 * @abstract
 */
export class ITriMatrix extends IRoot
{
  /**
   * Sets all sixteen elements, row by row.
   *
   * @abstract
   * @param {...number} elements _11 .. _44.
   */
  SetPivots(...elements) {}

  /**
   * Copies a matrix into this one.
   *
   * @abstract
   * @param {ArrayLike<number>} m The source matrix.
   */
  SetMatrix(m) {}

  /**
   * Returns the matrix storage itself.
   *
   * @abstract
   * @returns {ArrayLike<number>} The stored matrix.
   */
  GetMatrix() {}

  /**
   * Copies the matrix into `out`.
   *
   * @abstract
   * @param {ArrayLike<number>} out The destination.
   * @returns {ArrayLike<number>} `out`.
   */
  CopyMatrix(out) {}

  /**
   * Resets the matrix to identity.
   *
   * @abstract
   */
  Identity() {}
}

for (const name of [ "SetPivots", "SetMatrix", "GetMatrix", "CopyMatrix", "Identity" ])
{
  CjsSchema.decorateMethod(ITriMatrix, name, meta.abstract);
}

CjsSchema.meta.abstract(ITriMatrix);
CjsSchema.exposure.interface("ITriMatrix")(ITriMatrix);
