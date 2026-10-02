// Source: audio/src/AudStaticDataRepository.h + AudStaticDataRepository.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { meta } from "#schema";


// Wwise AK_INVALID_UNIQUE_ID - the C++ GetEventID default.
const INVALID_UNIQUE_ID = 0;

/**
 * AudStaticDataRepository (audio) - the event-metadata catalog: per-event
 * id/attenuation/loop/2D/vital/stops/bank data extracted from the Wwise
 * project, letting the engine reason about events without Wwise. Populated at
 * runtime (no persisted fields) from a plain audio metadata object.
 */
@meta.define({ className: "AudStaticDataRepository", family: "audio" })
export class AudStaticDataRepository
{

  _events = new Map();

  _soundBanks = new Map();

  _sources = new Map();

  _initialized = false;

  /**
   * Merges event, sound-bank and source metadata into the catalog and marks it initialized.
   * Existing records absent from the input remain present. Missing or non-object
   * sections are warned about and skipped; processing object input still marks
   * initialization complete.
   *
   * Adapted: JavaScript object or Map sections replace Python dictionaries
   * (audio/src/AudStaticDataRepository.cpp:181-304). Records use JavaScript numeric,
   * truth-value and string coercion rather than the donor's Python type checks.
   * List fields accept arrays only; missing lists become empty arrays. An absent
   * or non-object top-level input warns and leaves existing state unchanged.
   *
   * @param {object} audioMetadata Metadata containing Events, SoundBanks and WemFileIDs sections.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  Initialize(audioMetadata)
  {
    if (!audioMetadata || typeof audioMetadata !== "object")
    {
      CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("audio2"), "%s", "AudStaticDataRepository.Initialize expects an audio metadata object.");
      return;
    }

    // Missing or non-object sections warn and are skipped; initialization
    // still completes. Accepted section types differ from Carbon dictionaries.
    const events = SectionEntries(audioMetadata.Events, "Events");
    for (const [eventName, record] of events)
    {
      this._events.set(String(eventName), {
        eventName: String(eventName),
        eventID: ToUint(record?.eventID),
        maxAttenuationRadius: Number(record?.maxRadiusAttenuation) || 0,
        isLoop: !!record?.isLoop,
        is2D: !!record?.is2D,
        isVital: !!record?.isVital,
        eventsStoppedBy: ToStringArray(record?.eventsStoppedBy),
        soundbanks: ToStringArray(record?.soundbanks)
      });
    }

    const soundBanks = SectionEntries(audioMetadata.SoundBanks, "SoundBanks");
    for (const [soundBankName, record] of soundBanks)
    {
      this._soundBanks.set(String(soundBankName), { isEssentialSoundBank: !!record?.EssentialSoundBank });
    }

    const sources = SectionEntries(audioMetadata.WemFileIDs, "WemFileIDs");
    for (const [sourceID, record] of sources)
    {
      this._sources.set(String(sourceID), { isEssential: !!record?.IsEssential });
    }

    this._initialized = true;
  }

  /**
   * Whether object input has completed initialization.
   *
   * @returns {boolean} Whether initialization completed.
   */
  @meta.blue.method
  @meta.implemented
  IsInitialized()
  {
    return this._initialized;
  }

  // Carbon's templated core (AudStaticDataRepository.h:68-91): every typed
  // accessor below is GetAttribute over GetData. The mutex is single-threaded
  // JS's no-op, and C++ pointer-to-member projection is a keyed read.

  /** Carbon GetData<DataType> (h:68-78): the named record, or null. */
  _GetData(map, name)
  {
    return map.get(String(name)) ?? null;
  }

  /** Carbon GetAttribute<DataType, AttrType> (h:82-91): one field of the
   *  named record, or the default when the record is absent. */
  _GetAttribute(map, name, attribute, defaultValue)
  {
    const data = this._GetData(map, name);
    return data ? data[attribute] : defaultValue;
  }

  /**
   * Returns the event uint32 ID, or zero when unknown.
   *
   * @param {string} eventName Event name.
   * @returns {number} Event ID or zero.
   */
  @meta.blue.method
  @meta.implemented
  GetEventID(eventName)
  {
    return this._GetAttribute(this._events, eventName, "eventID", INVALID_UNIQUE_ID);
  }

  /**
   * Returns the squared maximum attenuation radius, or zero for an unknown event.
   *
   * Adapted: JavaScript multiplies Number values without Carbon's float32
   * narrowing of the radius and result (audio/src/AudStaticDataRepository.cpp:106-116).
   *
   * @param {string} eventName Event name.
   * @returns {number} Squared attenuation radius.
   */
  @meta.blue.method
  @meta.adapted
  GetEventRadiusSq(eventName)
  {
    const eventData = this._GetData(this._events, eventName);
    if (!eventData)
    {
      return 0;
    }
    return eventData.maxAttenuationRadius * eventData.maxAttenuationRadius;
  }

  /**
   * Returns the authored loop flag, or false when unknown.
   *
   * @param {string} eventName Event name.
   * @returns {boolean} Whether the event loops.
   */
  @meta.blue.method
  @meta.implemented
  EventIsLoop(eventName)
  {
    return this._GetAttribute(this._events, eventName, "isLoop", false);
  }

  /**
   * Returns the authored 2D flag, or false when unknown.
   *
   * @param {string} eventName Event name.
   * @returns {boolean} Whether the event is 2D.
   */
  @meta.blue.method
  @meta.implemented
  EventIs2D(eventName)
  {
    return this._GetAttribute(this._events, eventName, "is2D", false);
  }

  /**
   * Returns the authored vital flag, or false when unknown.
   *
   * @param {string} eventName Event name.
   * @returns {boolean} Whether the event is vital.
   */
  @meta.blue.method
  @meta.implemented
  EventIsVital(eventName)
  {
    return this._GetAttribute(this._events, eventName, "isVital", false);
  }

  /**
   * Checks whether the second event appears in the first event's stop list.
   *
   * @param {string} eventPotentiallyStopped Event whose stop list is queried.
   * @param {string} eventPotentiallyStopping Potential stopping event.
   * @returns {boolean} Whether the second event stops the first; false if the first is unknown.
   */
  @meta.blue.method
  @meta.implemented
  EventIsStopped(eventPotentiallyStopped, eventPotentiallyStopping)
  {
    const eventData = this._GetData(this._events, eventPotentiallyStopped);
    return !!eventData && eventData.eventsStoppedBy.includes(String(eventPotentiallyStopping));
  }

  /**
   * Returns the essential flag for a numeric WEM ID, or false when unknown.
   *
   * @param {number} sourceID WEM source ID.
   * @returns {boolean} Whether the source is essential.
   */
  @meta.blue.method
  @meta.implemented
  SourceIsEssential(sourceID)
  {
    return this._GetAttribute(this._sources, sourceID, "isEssential", false);
  }

  /**
   * Returns the essential flag for a sound bank, or false when unknown.
   *
   * @param {string} soundBankName Sound-bank name.
   * @returns {boolean} Whether the bank is essential.
   */
  @meta.blue.method
  @meta.implemented
  SoundBankIsEssential(soundBankName)
  {
    return this._GetAttribute(this._soundBanks, soundBankName, "isEssentialSoundBank", false);
  }

  /**
   * Returns the retained bank array, or a shared frozen empty array when unknown.
   * Callers must not mutate the returned array.
   *
   * @param {string} eventName Event name.
   * @returns {ReadonlyArray<string>} Required sound-bank names.
   */
  @meta.blue.method
  @meta.implemented
  SoundBanksRequiredForEvent(eventName)
  {
    return this._GetAttribute(this._events, eventName, "soundbanks", []);
  }

}

function SectionEntries(section, sectionName)
{
  if (section instanceof Map)
  {
    return section.entries();
  }
  if (section && typeof section === "object")
  {
    return Object.entries(section);
  }
  CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("audio2"), "%s", `AudStaticDataRepository: audio metadata section "${sectionName}" is missing or not an object; skipped.`);
  return [];
}

function ToUint(value)
{
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number >>> 0 : 0;
}

function ToStringArray(value)
{
  return Array.isArray(value) ? value.map(String) : [];
}

// Exact native exposure identities; no inherited lifecycle policy.
meta.blue.interfaceTable({ interfaces: [ AudStaticDataRepository ], chainTo: null })(AudStaticDataRepository, { kind: "class" });
