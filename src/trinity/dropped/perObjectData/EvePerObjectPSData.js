// Source: trinity/trinity/Eve/EveConstantBufferFormats.h
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { type } from "#schema";


/**
 * Minimal pixel-stage per-object record carrying only the world matrix, matching
 * Carbon's shared Eve constant-buffer format.
 */
@type.define({
  className: "EvePerObjectPSData",
  family: "eve"
})
export class EvePerObjectPSData extends CjsModel
{
  @type.mat4
  WorldMat = mat4.create();
}
