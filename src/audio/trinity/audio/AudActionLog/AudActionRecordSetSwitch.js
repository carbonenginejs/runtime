import { CjsSchema, blue, meta } from "#schema";
// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { AudActionRecord } from "./AudActionRecord.js";

/** Records one emitter-local switch group and state change. */
export class AudActionRecordSetSwitch extends AudActionRecord
{

  /** Carbon's `m_time` (AudActionLog.h:43); the constructor's default argument (AudActionLog.h:48). */
  time = 0;

  /** Carbon's `m_emitterID` (AudActionLog.h:44); the constructor's default argument (AudActionLog.h:48). */
  emitterID = 0;

  /** Carbon's `m_group` (AudActionLog.h:45); the constructor's default argument (AudActionLog.h:48). */
  group = "";

  /** Carbon's `m_state` (AudActionLog.h:46); the constructor's default argument (AudActionLog.h:48). */
  state = "";

  /** Creates one emitter-local switch record. */
  constructor(time = 0, emitterID = 0, group = "", state = "")
  {
    super();
    this.time = time;
    this.emitterID = emitterID;
    this.group = String(group);
    this.state = String(state);
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject()
  {
    return [ "AudActionRecordSetSwitch", this.time, this.emitterID, this.group, this.state ];
  }

}

CjsSchema.decorateMethod(AudActionRecordSetSwitch, "ToPyObject", blue.method, meta.adapted);
CjsSchema.meta.carbon("AudActionRecordSetSwitch")(AudActionRecordSetSwitch);
