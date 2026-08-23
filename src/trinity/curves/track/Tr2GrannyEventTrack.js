// Source: trinity/trinity/Curves/Tr2GrannyEventTrack.h
// Source: trinity/trinity/Curves/Tr2GrannyEventTrack.cpp
import { carbon, impl, io, type } from "#schema";
import { CjsGrannyCurves } from "./CjsGrannyCurves.js";
import { Tr2GrannyTrack } from "./Tr2GrannyTrack.js";


/**
 * Granny track that replays a text track's timed entries as engine events,
 * firing each entry once as the playhead crosses it.
 */
@type.define({
  className: "Tr2GrannyEventTrack",
  family: "curves"
})
export class Tr2GrannyEventTrack extends Tr2GrannyTrack
{
  @io.readwrite
  @type.objectRef("IBlueEventListener")
  eventListener = null;

  #entries = null;

  #previousTime = 0;

  #previousIndex = 0;

  /**
   * Checks whether event track handles are ready.
   */
  @carbon.method
  @impl.implemented
  TracksReady()
  {
    return this.#entries !== null;
  }

  /**
   * Clears event track handles.
   */
  @carbon.method
  @impl.implemented
  ResetTracks()
  {
    this.#entries = null;
    this.#previousTime = 0;
    this.#previousIndex = 0;
  }

  /**
   * Applies event track handles.
   */
  @carbon.method
  @impl.adapted
  ApplyTracks(group, duration, _timeStep)
  {
    const track = CjsGrannyCurves.findTextTrack(group, this.name);
    if (!track)
    {
      return;
    }
    this.duration = duration;
    this.#entries = CjsGrannyCurves.getTextTrackEntries(track);
    this.#previousTime = 0;
    this.#previousIndex = 0;
  }

  /**
   * Emits resource events when available.
   */
  @carbon.method
  @impl.adapted
  UpdateValueImpl(time)
  {
    const entries = this.#entries;
    if (!entries)
    {
      return;
    }
    if (time < this.#previousTime)
    {
      this.#previousTime = 0;
      this.#previousIndex = 0;
    }
    while (this.#previousIndex < entries.length)
    {
      const entry = entries[this.#previousIndex];
      if (entry.time >= this.#previousTime && entry.time <= time)
      {
        this.eventListener?.HandleEvent(entry.text);
      }
      else if (entry.time > time)
      {
        break;
      }
      this.#previousIndex++;
    }
    this.#previousTime = time;
  }
}
