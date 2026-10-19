import { CjsSchema, blue, meta } from "#schema";
// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { AudActionRecord } from "./AudActionRecord.js";

/** Records one global or emitter-local real-time parameter change. */
export class AudActionRecordSetRTPC extends AudActionRecord
{

  /** Carbon's `m_time` (AudActionLog.h:64); the constructor's default argument (AudActionLog.h:70). */
  time = 0;

  /** Carbon's `m_emitterID` (AudActionLog.h:65); the constructor's default argument (AudActionLog.h:70). */
  emitterID = 0;

  /** Carbon's `m_name` (AudActionLog.h:66); the constructor's default argument (AudActionLog.h:70). */
  name = "";

  /** Carbon's `m_value` (AudActionLog.h:67); the constructor's default argument (AudActionLog.h:70). */
  value = 0;

  /** Carbon's `m_playID` (AudActionLog.h:68); the constructor's default argument (AudActionLog.h:70). */
  playID = 0;

  /** Creates one global or emitter-local RTPC record. */
  constructor(time = 0, emitterID = 0, name = "", value = 0, playID = 0)
  {
    super();
    this.time = time;
    this.emitterID = emitterID;
    this.name = String(name);
    this.value = Number(value);
    this.playID = playID;
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject()
  {
    return [ "AudActionRecordSetRTPC", this.time, this.emitterID, this.name, this.value, this.playID ];
  }

}

CjsSchema.blue.define(AudActionRecordSetRTPC, {
    className: "AudActionRecordSetRTPC",
    methods: { ToPyObject: [blue.method, meta.adapted] }
});
