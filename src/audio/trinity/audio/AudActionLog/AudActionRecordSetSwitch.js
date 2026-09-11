// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { AudActionRecord } from "./AudActionRecord.js";

/** Records one emitter-local switch group and state change. */
export class AudActionRecordSetSwitch extends AudActionRecord
{

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
