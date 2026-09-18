// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve.h
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { edit, type } from "#schema";


/**
 * One key of a matrix curve: a time in seconds and the 4x4 matrix value at that
 * time.
 */
@type.define({
  className: "Tr2MatrixKey",
  family: "curves"
})
export class Tr2MatrixKey extends CjsModel
{
  @edit.persist
  @type.float32
  time = 0;

  @edit.persist
  @type.mat4
  value = mat4.create();

}
