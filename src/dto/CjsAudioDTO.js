import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsObjectDTO } from "./CjsObjectDTO.js";

/**
 * Audio DTO for decoded or wrapper metadata produced by format readers.
 */
@type.define({ className: "CjsAudioDTO", family: "resource" })
export class CjsAudioDTO extends CjsObjectDTO
{
  @io.persist
  @type.uint32
  sampleRate = 0;

  @io.persist
  @type.uint32
  channels = 0;

  @io.persist
  @type.string
  channelLayout = "";

  @io.persist
  @type.string
  sampleFormat = "";

  @io.persist
  @type.uint64
  frameCount = 0n;

  @io.persist
  @type.float64
  durationSeconds = 0;

  @io.persist
  @type.unknown
  data = null;

  /** Compatibility field; use durationSeconds for canonical decoded audio. */
  @io.persist
  @type.float64
  duration = 0;

  @io.persist
  @type.string
  audioFormat = "";

  @io.persist
  @type.unknown
  /** Compatibility field; canonical decoded audio uses data. */
  samples = null;

  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  static payload = "audio";
}
