// Source: trinity/trinity/Curves/Tr2GrannyEventTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyEventTrack.cpp
import { exposure as be } from "#be";
import { type } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that replays a text track's timed entries as engine events,
 * firing each entry once as the playhead crosses it.
 */
@be.define({
  name: "Tr2GrannyEventTrack",
  // Tr2GrannyEventTrack_Blue.cpp:10-13, in Carbon's order.
  members: [
    [ be.ATTR, "eventListener", be.READWRITE ]
  ],
  chainTo: Tr2GrannyTrack
})
export class Tr2GrannyEventTrack extends Tr2GrannyTrack
{
  @type.object.ref("IBlueEventListener")
  eventListener = null;

  _entries = null;

  _previousTime = 0;

  _previousIndex = 0;

  /**
   * Checks whether event track handles are ready.
   *
   * @implemented
   */

  TracksReady()
  {
    return this._entries !== null;
  }

  /**
   * Clears event track handles.
   *
   * @implemented
   */

  ResetTracks()
  {
    this._entries = null;
    this._previousTime = 0;
    this._previousIndex = 0;
  }

  /**
   * Applies event track handles.
   *
   * @adapted
   */

  ApplyTracks(group, duration, _timeStep)
  {
    const track = CjsGrannyCurves.findTextTrack(group, this.name);
    if (!track)
    {
      return;
    }
    this.duration = duration;
    this._entries = CjsGrannyCurves.getTextTrackEntries(track);
    this._previousTime = 0;
    this._previousIndex = 0;
  }

  /**
   * Emits resource events when available.
   *
   * @adapted
   */

  UpdateValueImpl(time)
  {
    const entries = this._entries;
    if (!entries)
    {
      return;
    }
    if (time < this._previousTime)
    {
      this._previousTime = 0;
      this._previousIndex = 0;
    }
    while (this._previousIndex < entries.length)
    {
      const entry = entries[this._previousIndex];
      if (entry.time >= this._previousTime && entry.time <= time)
      {
        this.eventListener?.HandleEvent(entry.text);
      }
      else if (entry.time > time)
      {
        break;
      }
      this._previousIndex++;
    }
    this._previousTime = time;
  }
}
