// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { AudActionRecord } from "./AudActionRecord.js";

/** Records one stop or break action applied to a playing identity. */
export class AudActionRecordExecuteActionOnPlayingID extends AudActionRecord
{

  /** Creates one playing-id action record. */
  constructor(time = 0, emitterID = 0, playID = 0, action = "")
  {
    super();
    this.time = time;
    this.emitterID = emitterID;
    this.playID = playID;
    this.action = String(action);
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject()
  {
    return [ "AudActionRecordExecuteActionOnPlayingID", this.time, this.emitterID, this.playID, this.action ];
  }

}
