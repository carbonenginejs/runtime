import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsObjectDTO as _CjsObjectDTO } from './CjsObjectDTO.js';

let _initClass, _init_sampleRate, _init_extra_sampleRate, _init_channels, _init_extra_channels, _init_channelLayout, _init_extra_channelLayout, _init_sampleFormat, _init_extra_sampleFormat, _init_frameCount, _init_extra_frameCount, _init_durationSeconds, _init_extra_durationSeconds, _init_data, _init_extra_data, _init_duration, _init_extra_duration, _init_audioFormat, _init_extra_audioFormat, _init_samples, _init_extra_samples;

/**
 * Audio DTO for decoded or wrapper metadata produced by format readers.
 */
let _CjsAudioDTO;
new class extends _identity {
  static [class CjsAudioDTO extends _CjsObjectDTO {
    static {
      ({
        e: [_init_sampleRate, _init_extra_sampleRate, _init_channels, _init_extra_channels, _init_channelLayout, _init_extra_channelLayout, _init_sampleFormat, _init_extra_sampleFormat, _init_frameCount, _init_extra_frameCount, _init_durationSeconds, _init_extra_durationSeconds, _init_data, _init_extra_data, _init_duration, _init_extra_duration, _init_audioFormat, _init_extra_audioFormat, _init_samples, _init_extra_samples],
        c: [_CjsAudioDTO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsAudioDTO",
        family: "resource"
      })], [[[io, io.persist, type, type.uint32], 16, "sampleRate"], [[io, io.persist, type, type.uint32], 16, "channels"], [[io, io.persist, type, type.string], 16, "channelLayout"], [[io, io.persist, type, type.string], 16, "sampleFormat"], [[io, io.persist, type, type.uint64], 16, "frameCount"], [[io, io.persist, type, type.float64], 16, "durationSeconds"], [[io, io.persist, type, type.unknown], 16, "data"], [[io, io.persist, type, type.float64], 16, "duration"], [[io, io.persist, type, type.string], 16, "audioFormat"], [[io, io.persist, type, type.unknown], 16, "samples"]], 0, void 0, _CjsObjectDTO));
    }
    sampleRate = _init_sampleRate(this, 0);
    channels = (_init_extra_sampleRate(this), _init_channels(this, 0));
    channelLayout = (_init_extra_channels(this), _init_channelLayout(this, ""));
    sampleFormat = (_init_extra_channelLayout(this), _init_sampleFormat(this, ""));
    frameCount = (_init_extra_sampleFormat(this), _init_frameCount(this, 0n));
    durationSeconds = (_init_extra_frameCount(this), _init_durationSeconds(this, 0));
    data = (_init_extra_durationSeconds(this), _init_data(this, null));

    /** Compatibility field; use durationSeconds for canonical decoded audio. */
    duration = (_init_extra_data(this), _init_duration(this, 0));
    audioFormat = (_init_extra_duration(this), _init_audioFormat(this, ""));
    /** Compatibility field; canonical decoded audio uses data. */
    samples = (_init_extra_audioFormat(this), _init_samples(this, null));
    constructor(values = null) {
      super(), _init_extra_samples(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }
  }];
  payload = "audio";
  constructor() {
    super(_CjsAudioDTO), _initClass();
  }
}();

export { _CjsAudioDTO as CjsAudioDTO };
//# sourceMappingURL=CjsAudioDTO.js.map
