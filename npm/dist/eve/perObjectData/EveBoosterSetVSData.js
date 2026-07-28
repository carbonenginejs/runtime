import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_shipMatrix, _init_extra_shipMatrix, _init_boosterIntensity, _init_extra_boosterIntensity, _init_shipSpeed, _init_extra_shipSpeed, _init_maxBoosterSize, _init_extra_maxBoosterSize, _init_padding, _init_extra_padding, _init_trailsControlPositions, _init_extra_trailsControlPositions, _init_trailsControlNormals, _init_extra_trailsControlNormals;

/**
 * Carbon `EveBoosterSetPerObjectData::VertexShaderData` - the booster set's ship
 * matrix, its intensity/speed/size scalars, and the trail control ring.
 *
 * Named for the struct the producer allocates (`EveBoosterSetVSData`), matching
 * the EveTurretSetVSData/PSData pair rather than Carbon's nested-class spelling.
 */
let _EveBoosterSetVSData;
new class extends _identity {
  static [class EveBoosterSetVSData extends CjsModel {
    static {
      ({
        e: [_init_shipMatrix, _init_extra_shipMatrix, _init_boosterIntensity, _init_extra_boosterIntensity, _init_shipSpeed, _init_extra_shipSpeed, _init_maxBoosterSize, _init_extra_maxBoosterSize, _init_padding, _init_extra_padding, _init_trailsControlPositions, _init_extra_trailsControlPositions, _init_trailsControlNormals, _init_extra_trailsControlNormals],
        c: [_EveBoosterSetVSData, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveBoosterSetVSData",
        family: "eve/attachment/boosters"
      })], [[[type, type.mat4], 16, "shipMatrix"], [[type, type.float32], 16, "boosterIntensity"], [[type, type.float32], 16, "shipSpeed"], [[type, type.float32], 16, "maxBoosterSize"], [[type, type.float32], 16, "padding"], [type.array("vec4"), 0, "trailsControlPositions"], [type.array("vec4"), 0, "trailsControlNormals"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_trailsControlNormals(this);
    }
    /** shipMatrix (Matrix) */
    shipMatrix = _init_shipMatrix(this, mat4.create());

    /** boosterIntensity (float) */
    boosterIntensity = (_init_extra_shipMatrix(this), _init_boosterIntensity(this, 0));

    /** shipSpeed (float) */
    shipSpeed = (_init_extra_boosterIntensity(this), _init_shipSpeed(this, 0));

    /** maxBoosterSize (float) */
    maxBoosterSize = (_init_extra_shipSpeed(this), _init_maxBoosterSize(this, 0));

    /** padding (float) - Carbon's explicit register pad; never written. */
    padding = (_init_extra_maxBoosterSize(this), _init_padding(this, 0));

    /** trailsControlPositions (Vector4[EVE_MAX_CONTROL_POINT_COUNT]) */
    trailsControlPositions = (_init_extra_padding(this), _init_trailsControlPositions(this, Array.from({
      length: _EveBoosterSetVSData.CONTROL_POINT_COUNT
    }, () => vec4.create())));

    /** trailsControlNormals (Vector4[EVE_MAX_CONTROL_POINT_COUNT]) */
    trailsControlNormals = (_init_extra_trailsControlPositions(this), _init_trailsControlNormals(this, Array.from({
      length: _EveBoosterSetVSData.CONTROL_POINT_COUNT
    }, () => vec4.create())));

    /** EveBoosterSet2.h:36 - `const unsigned int EVE_MAX_CONTROL_POINT_COUNT = 5`. */
  }];
  CONTROL_POINT_COUNT = 5;
  constructor() {
    super(_EveBoosterSetVSData), _initClass();
  }
}();

export { _EveBoosterSetVSData as EveBoosterSetVSData };
//# sourceMappingURL=EveBoosterSetVSData.js.map
