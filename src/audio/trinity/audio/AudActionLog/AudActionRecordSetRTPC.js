// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { AudActionRecord } from "./AudActionRecord.js";

/** Records one global or emitter-local real-time parameter change. */
export class AudActionRecordSetRTPC extends AudActionRecord
{

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
