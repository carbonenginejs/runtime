// Source: audio/src/AudStaticDataRepository.h + AudStaticDataRepository.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudStaticDataRepository.json.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";

// Wwise AK_INVALID_UNIQUE_ID - the C++ GetEventID default.
const INVALID_UNIQUE_ID = 0;
const EMPTY_SOUNDBANKS = Object.freeze([]);

/**
 * AudStaticDataRepository (audio) - the event-metadata catalog: per-event
 * id/attenuation/loop/2D/vital/stops/bank data extracted from the Wwise
 * project, letting the engine reason about events without Wwise. Populated at
 * runtime (no persisted fields) from a plain audio metadata object.
 */
@type.define({ className: "AudStaticDataRepository", family: "audio" })
export class AudStaticDataRepository extends CjsModel
{

  #events = new Map();

  #soundBanks = new Map();

  #sources = new Map();

  #initialized = false;

  /** Carbon method Initialize (MAP_METHOD_AND_WRAP). Loads the metadata catalog. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon receives a Python dict; CarbonEngineJS receives the equivalent plain object with Events, SoundBanks, and WemFileIDs sections.")
  Initialize(audioMetadata)
  {
    if (!audioMetadata || typeof audioMetadata !== "object")
    {
      console.warn("AudStaticDataRepository.Initialize expects an audio metadata object.");
      return;
    }

    // Mirrors the C++ tolerance: each missing/invalid section warns and is
    // skipped; initialization still completes.
    const events = SectionEntries(audioMetadata.Events, "Events");
    for (const [eventName, record] of events)
    {
      this.#events.set(String(eventName), {
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
      this.#soundBanks.set(String(soundBankName), { isEssentialSoundBank: !!record?.EssentialSoundBank });
    }

    const sources = SectionEntries(audioMetadata.WemFileIDs, "WemFileIDs");
    for (const [sourceID, record] of sources)
    {
      this.#sources.set(String(sourceID), { isEssential: !!record?.IsEssential });
    }

    this.#initialized = true;
  }

  /** Carbon method IsInitialized. */
  @carbon.method
  @impl.implemented
  IsInitialized()
  {
    return this.#initialized;
  }

  // Carbon's templated core (AudStaticDataRepository.h:68-91): every typed
  // accessor below is GetAttribute over GetData. The mutex is single-threaded
  // JS's no-op, and C++ pointer-to-member projection is a keyed read.

  /** Carbon GetData<DataType> (h:68-78): the named record, or null. */
  #GetData(map, name)
  {
    return map.get(String(name)) ?? null;
  }

  /** Carbon GetAttribute<DataType, AttrType> (h:82-91): one field of the
   *  named record, or the default when the record is absent. */
  #GetAttribute(map, name, attribute, defaultValue)
  {
    const data = this.#GetData(map, name);
    return data ? data[attribute] : defaultValue;
  }

  /** Carbon method GetEventID: 32-bit Wwise id, AK_INVALID_UNIQUE_ID (0) when unknown. */
  @carbon.method
  @impl.implemented
  GetEventID(eventName)
  {
    return this.#GetAttribute(this.#events, eventName, "eventID", INVALID_UNIQUE_ID);
  }

  /** Carbon method GetEventRadiusSq: squared max attenuation radius, 0 when unknown. */
  @carbon.method
  @impl.implemented
  GetEventRadiusSq(eventName)
  {
    const eventData = this.#GetData(this.#events, eventName);
    if (!eventData)
    {
      return 0;
    }
    return eventData.maxAttenuationRadius * eventData.maxAttenuationRadius;
  }

  /** Carbon method EventIsLoop. */
  @carbon.method
  @impl.implemented
  EventIsLoop(eventName)
  {
    return this.#GetAttribute(this.#events, eventName, "isLoop", false);
  }

  /** Carbon method EventIs2D. */
  @carbon.method
  @impl.implemented
  EventIs2D(eventName)
  {
    return this.#GetAttribute(this.#events, eventName, "is2D", false);
  }

  /** Carbon method EventIsVital. */
  @carbon.method
  @impl.implemented
  EventIsVital(eventName)
  {
    return this.#GetAttribute(this.#events, eventName, "isVital", false);
  }

  /** Carbon method EventIsStopped: whether the second event stops the first. */
  @carbon.method
  @impl.implemented
  EventIsStopped(eventPotentiallyStopped, eventPotentiallyStopping)
  {
    const eventData = this.#GetData(this.#events, eventPotentiallyStopped);
    return !!eventData && eventData.eventsStoppedBy.includes(String(eventPotentiallyStopping));
  }

  /** Carbon method SourceIsEssential: keyed by numeric wem id. */
  @carbon.method
  @impl.implemented
  SourceIsEssential(sourceID)
  {
    return this.#GetAttribute(this.#sources, sourceID, "isEssential", false);
  }

  /** Carbon method SoundBankIsEssential. */
  @carbon.method
  @impl.implemented
  SoundBankIsEssential(soundBankName)
  {
    return this.#GetAttribute(this.#soundBanks, soundBankName, "isEssentialSoundBank", false);
  }

  /** Carbon method SoundBanksRequiredForEvent: banks the event needs; empty when unknown. Treat as read-only. */
  @carbon.method
  @impl.implemented
  SoundBanksRequiredForEvent(eventName)
  {
    return this.#GetAttribute(this.#events, eventName, "soundbanks", EMPTY_SOUNDBANKS);
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
  console.warn(`AudStaticDataRepository: audio metadata section "${sectionName}" is missing or not an object; skipped.`);
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
