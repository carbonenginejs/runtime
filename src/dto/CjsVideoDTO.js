import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsObjectDTO } from "./CjsObjectDTO.js";

/**
 * Sparse video DTO for dynamic media carried by a texture resource.
 *
 * Runtime-resource only records raw-ish media facts. Engine-gpu owns playback,
 * decode, upload, timing, audio sync, and texture update policy.
 */
@type.define({ className: "CjsVideoDTO", family: "resource" })
export class CjsVideoDTO extends CjsObjectDTO
{
  @io.persist
  @type.string
  sourceKind = "";

  @io.persist
  @type.string
  sourceUri = "";

  /** Opaque handler-owned state; runtime-resource never creates or interprets it. */
  @io.persist
  @type.unknown
  backendHandle = null;

  @io.persist
  @type.uint32
  durationTimescale = 0;

  @io.persist
  @type.list("unknown")
  tracks = [];

  @io.persist
  @type.list("unknown")
  keyframes = [];

  @io.persist
  @type.string
  colorSpace = "";

  @io.persist
  @type.unknown
  sourceBytes = null;

  @io.persist
  @type.string
  codec = "";

  @io.persist
  @type.uint32
  width = 0;

  @io.persist
  @type.uint32
  height = 0;

  @io.persist
  @type.uint64
  duration = 0;

  @io.persist
  @type.float64
  durationSeconds = 0;

  @io.persist
  @type.float64
  frameRate = 0;

  @io.persist
  @type.boolean
  seekable = false;

  @io.persist
  @type.boolean
  hasAlpha = false;

  @io.persist
  @type.boolean
  looped = false;

  @io.persist
  @type.uint32
  audioTrack = 0;

  @io.persist
  @type.string
  state = "";

  @io.persist
  @type.uint64
  mediaTime = 0;

  @io.persist
  @type.uint64
  downloadedMediaTime = 0;

  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  static payload = "video";
}
