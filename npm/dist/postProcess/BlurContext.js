import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { BlurChannel, BlurFinalize, BlurProcess, BlurType } from '../generated/postProcess/enums.js';

let _initClass, _init_channel, _init_extra_channel, _init_finalize, _init_extra_finalize, _init_process, _init_extra_process, _init_type, _init_extra_type;

/** BlurContext (postProcess) - generated from schema shapeHash 5d727dce.... */
let _BlurContext;
new class extends _identity {
  static [class BlurContext extends CjsModel {
    static {
      ({
        e: [_init_channel, _init_extra_channel, _init_finalize, _init_extra_finalize, _init_process, _init_extra_process, _init_type, _init_extra_type],
        c: [_BlurContext, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "BlurContext",
        family: "postProcess"
      })], [[[type, type.int32, void 0, type.enum("BlurChannel")], 16, "channel"], [[type, type.int32, void 0, type.enum("BlurFinalize")], 16, "finalize"], [[type, type.int32, void 0, type.enum("BlurProcess")], 16, "process"], [[type, type.int32, void 0, type.enum("BlurType")], 16, "type"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_type(this);
    }
    /** channel (BlurChannel - enum BlurChannel) */
    channel = _init_channel(this, 4);

    /** finalize (BlurFinalize - enum BlurFinalize) */
    finalize = (_init_extra_channel(this), _init_finalize(this, 0));

    /** process (BlurProcess - enum BlurProcess) */
    process = (_init_extra_finalize(this), _init_process(this, 0));

    /** type (BlurType - enum BlurType) */
    type = (_init_extra_process(this), _init_type(this, 0));

    /** Carbon BlurContext::Hash - the blur-variant cache key. */
    Hash() {
      return this.finalize * 1000 + this.process * 100 + this.type * 10 + this.channel;
    }
  }];
  BlurChannel = BlurChannel;
  BlurFinalize = BlurFinalize;
  BlurProcess = BlurProcess;
  BlurType = BlurType;
  constructor() {
    super(_BlurContext), _initClass();
  }
}();

export { _BlurContext as BlurContext };
//# sourceMappingURL=BlurContext.js.map
