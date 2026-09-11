// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.

import { AudActionRecord } from "./AudActionRecord.js";

/** Records one global audio state-group change. */
export class AudActionRecordSetState extends AudActionRecord
{

  /** Creates one global state record. */
  constructor(time = 0, group = "", state = "")
  {
    super();
    this.time = time;
    this.group = String(group);
    this.state = String(state);
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject()
  {
    return [ "AudActionRecordSetState", this.time, this.group, this.state ];
  }

}
