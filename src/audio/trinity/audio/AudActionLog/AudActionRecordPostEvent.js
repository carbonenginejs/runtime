// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { AudActionRecord } from "./AudActionRecord.js";

/** Records one event post with time, emitter, playing, event, and name identities. */
export class AudActionRecordPostEvent extends AudActionRecord
{

  /** Creates one event-post record. */
  constructor(time = 0, emitterID = 0, playID = 0, eventID = 0, name = "")
  {
    super();
    this.time = time;
    this.emitterID = emitterID;
    this.playID = playID;
    this.eventID = eventID;
    this.name = String(name);
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject()
  {
    return [ "AudActionRecordPostEvent", this.time, this.emitterID, this.playID, this.eventID, this.name ];
  }

}
