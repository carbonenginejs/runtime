// Source: audio/src/AudActionLog.h + AudActionLog.cpp
// Hand-owned behavior port. Verify against audio/AudActionLogCB.json and the
// AudActionRecord*.json schema documents.



/** Provides the base value contract for one queued Carbon audio action. */
export class AudActionRecord
{

  /** Carbon's Python bridge returns a tuple; JavaScript uses the equivalent array. */
  ToPyObject()
  {
    return [];
  }

}
