import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsObjectDTO as _CjsObjectDTO } from './CjsObjectDTO.js';

let _initClass, _init_sourceKind, _init_extra_sourceKind, _init_sourceUri, _init_extra_sourceUri, _init_backendHandle, _init_extra_backendHandle, _init_durationTimescale, _init_extra_durationTimescale, _init_tracks, _init_extra_tracks, _init_keyframes, _init_extra_keyframes, _init_colorSpace, _init_extra_colorSpace, _init_sourceBytes, _init_extra_sourceBytes, _init_codec, _init_extra_codec, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_duration, _init_extra_duration, _init_durationSeconds, _init_extra_durationSeconds, _init_frameRate, _init_extra_frameRate, _init_seekable, _init_extra_seekable, _init_hasAlpha, _init_extra_hasAlpha, _init_looped, _init_extra_looped, _init_audioTrack, _init_extra_audioTrack, _init_state, _init_extra_state, _init_mediaTime, _init_extra_mediaTime, _init_downloadedMediaTime, _init_extra_downloadedMediaTime;

/**
 * Sparse video DTO for dynamic media carried by a texture resource.
 *
 * Runtime-resource only records raw-ish media facts. Engine-gpu owns playback,
 * decode, upload, timing, audio sync, and texture update policy.
 */
let _CjsVideoDTO;
new class extends _identity {
  static [class CjsVideoDTO extends _CjsObjectDTO {
    static {
      ({
        e: [_init_sourceKind, _init_extra_sourceKind, _init_sourceUri, _init_extra_sourceUri, _init_backendHandle, _init_extra_backendHandle, _init_durationTimescale, _init_extra_durationTimescale, _init_tracks, _init_extra_tracks, _init_keyframes, _init_extra_keyframes, _init_colorSpace, _init_extra_colorSpace, _init_sourceBytes, _init_extra_sourceBytes, _init_codec, _init_extra_codec, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_duration, _init_extra_duration, _init_durationSeconds, _init_extra_durationSeconds, _init_frameRate, _init_extra_frameRate, _init_seekable, _init_extra_seekable, _init_hasAlpha, _init_extra_hasAlpha, _init_looped, _init_extra_looped, _init_audioTrack, _init_extra_audioTrack, _init_state, _init_extra_state, _init_mediaTime, _init_extra_mediaTime, _init_downloadedMediaTime, _init_extra_downloadedMediaTime],
        c: [_CjsVideoDTO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsVideoDTO",
        family: "resource"
      })], [[[io, io.persist, type, type.string], 16, "sourceKind"], [[io, io.persist, type, type.string], 16, "sourceUri"], [[io, io.persist, type, type.unknown], 16, "backendHandle"], [[io, io.persist, type, type.uint32], 16, "durationTimescale"], [[io, io.persist, void 0, type.list("unknown")], 16, "tracks"], [[io, io.persist, void 0, type.list("unknown")], 16, "keyframes"], [[io, io.persist, type, type.string], 16, "colorSpace"], [[io, io.persist, type, type.unknown], 16, "sourceBytes"], [[io, io.persist, type, type.string], 16, "codec"], [[io, io.persist, type, type.uint32], 16, "width"], [[io, io.persist, type, type.uint32], 16, "height"], [[io, io.persist, type, type.uint64], 16, "duration"], [[io, io.persist, type, type.float64], 16, "durationSeconds"], [[io, io.persist, type, type.float64], 16, "frameRate"], [[io, io.persist, type, type.boolean], 16, "seekable"], [[io, io.persist, type, type.boolean], 16, "hasAlpha"], [[io, io.persist, type, type.boolean], 16, "looped"], [[io, io.persist, type, type.uint32], 16, "audioTrack"], [[io, io.persist, type, type.string], 16, "state"], [[io, io.persist, type, type.uint64], 16, "mediaTime"], [[io, io.persist, type, type.uint64], 16, "downloadedMediaTime"]], 0, void 0, _CjsObjectDTO));
    }
    sourceKind = _init_sourceKind(this, "");
    sourceUri = (_init_extra_sourceKind(this), _init_sourceUri(this, ""));

    /** Opaque handler-owned state; runtime-resource never creates or interprets it. */
    backendHandle = (_init_extra_sourceUri(this), _init_backendHandle(this, null));
    durationTimescale = (_init_extra_backendHandle(this), _init_durationTimescale(this, 0));
    tracks = (_init_extra_durationTimescale(this), _init_tracks(this, []));
    keyframes = (_init_extra_tracks(this), _init_keyframes(this, []));
    colorSpace = (_init_extra_keyframes(this), _init_colorSpace(this, ""));
    sourceBytes = (_init_extra_colorSpace(this), _init_sourceBytes(this, null));
    codec = (_init_extra_sourceBytes(this), _init_codec(this, ""));
    width = (_init_extra_codec(this), _init_width(this, 0));
    height = (_init_extra_width(this), _init_height(this, 0));
    duration = (_init_extra_height(this), _init_duration(this, 0));
    durationSeconds = (_init_extra_duration(this), _init_durationSeconds(this, 0));
    frameRate = (_init_extra_durationSeconds(this), _init_frameRate(this, 0));
    seekable = (_init_extra_frameRate(this), _init_seekable(this, false));
    hasAlpha = (_init_extra_seekable(this), _init_hasAlpha(this, false));
    looped = (_init_extra_hasAlpha(this), _init_looped(this, false));
    audioTrack = (_init_extra_looped(this), _init_audioTrack(this, 0));
    state = (_init_extra_audioTrack(this), _init_state(this, ""));
    mediaTime = (_init_extra_state(this), _init_mediaTime(this, 0));
    downloadedMediaTime = (_init_extra_mediaTime(this), _init_downloadedMediaTime(this, 0));
    constructor(values = null) {
      super(), _init_extra_downloadedMediaTime(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }
  }];
  payload = "video";
  constructor() {
    super(_CjsVideoDTO), _initClass();
  }
}();

export { _CjsVideoDTO as CjsVideoDTO };
//# sourceMappingURL=CjsVideoDTO.js.map
