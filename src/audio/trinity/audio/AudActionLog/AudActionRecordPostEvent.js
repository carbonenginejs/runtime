import { CjsSchema, blue, meta } from "#schema";
// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { AudActionRecord } from "./AudActionRecord.js";

/** Records one event post with time, emitter, playing, event, and name identities. */
export class AudActionRecordPostEvent extends AudActionRecord
{

  /** Carbon's `m_time` (AudActionLog.h:20); the constructor's default argument (AudActionLog.h:26). */
  time = 0;

  /** Carbon's `m_emitterID` (AudActionLog.h:21); the constructor's default argument (AudActionLog.h:26). */
  emitterID = 0;

  /** Carbon's `m_playID` (AudActionLog.h:22); the constructor's default argument (AudActionLog.h:26). */
  playID = 0;

  /** Carbon's `m_eventID` (AudActionLog.h:23); the constructor's default argument (AudActionLog.h:26). */
  eventID = 0;

  /** Carbon's `m_name` (AudActionLog.h:24); the constructor's default argument (AudActionLog.h:26). */
  name = "";

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

CjsSchema.decorateMethod(AudActionRecordPostEvent, "ToPyObject", blue.method, meta.adapted);
CjsSchema.meta.carbon("AudActionRecordPostEvent")(AudActionRecordPostEvent);
