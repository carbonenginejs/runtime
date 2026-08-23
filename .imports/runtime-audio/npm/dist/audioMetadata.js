// CarbonEngineJS original. Builds the AudStaticDataRepository input (the
// "audioMetadata" shape: Events / SoundBanks / WemFileIDs) from publishable
// sources, while optional caller-supplied enrichment remains separate from
// this package:
//
// - Primary: the raw Wwise SoundbanksInfo.json document. Supplies the
//   live-posting must-haves: event name -> id and
//   event -> soundbanks, plus bank names and wem membership.
// - Enrichment (optional): a caller-supplied plain-JSON audio metadata object.
//   This supplies culling flags: maxRadiusAttenuation, isLoop, is2D, isVital,
//   eventsStoppedBy, essential flags. Missing enrichment degrades gracefully
//   (radius 0, flags false - sound still plays; culling is less informed).

/** Builds repository-ready audio metadata from raw SoundbanksInfo JSON, optionally merged with caller-supplied enrichment. */
function audioMetadataFromSoundbanksInfo(soundbanksInfo, enrichment = null) {
  const document = soundbanksInfo?.SoundBanksInfo || soundbanksInfo;
  if (!document || !Array.isArray(document.SoundBanks)) {
    throw new TypeError("audioMetadataFromSoundbanksInfo: input has no SoundBanksInfo.SoundBanks document");
  }
  const events = {};
  const soundBanks = {};
  const wemFileIDs = {};
  for (const bank of document.SoundBanks) {
    const bankName = BankFileName(bank);
    if (bankName) {
      soundBanks[bankName] = {
        EssentialSoundBank: 0
      };
    }
    const bankEvents = Array.isArray(bank.Events) ? bank.Events : bank.IncludedEvents || [];
    const bankMedia = Array.isArray(bank.Media) ? bank.Media : bank.IncludedMemoryFiles || [];
    for (const entry of bankEvents) {
      const name = String(entry.Name || "");
      if (!name) {
        continue;
      }
      const record = events[name] ?? (events[name] = {
        eventID: Number(entry.Id) >>> 0,
        maxRadiusAttenuation: FiniteNumber(entry.MaxAttenuation, 0),
        isLoop: 0,
        is2D: 0,
        isVital: 0,
        eventsStoppedBy: [],
        soundbanks: []
      });
      if (entry.MaxAttenuation !== undefined) {
        record.maxRadiusAttenuation = Math.max(record.maxRadiusAttenuation, FiniteNumber(entry.MaxAttenuation, 0));
      }
      if (bankName && !record.soundbanks.includes(bankName)) {
        record.soundbanks.push(bankName);
      }
    }
    for (const media of bankMedia) {
      const id = String(media.Id ?? "");
      if (id && !wemFileIDs[id]) {
        wemFileIDs[id] = {
          SoundBank: bankName,
          IsEssential: 0
        };
      }
    }
  }
  const metadata = {
    Events: events,
    SoundBanks: soundBanks,
    WemFileIDs: wemFileIDs
  };
  return enrichment ? MergeEnrichment(metadata, enrichment) : metadata;
}
function FiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function BankFileName(bank) {
  const path = String(bank.Path || bank.ShortName || "");
  if (!path) {
    return "";
  }
  const base = path.split(/[\\/]/).pop();
  return base.toLowerCase().endsWith(".bnk") ? base : `${base}.bnk`;
}
function MergeEnrichment(metadata, enrichment) {
  for (const [name, record] of Object.entries(enrichment.Events || {})) {
    const base = metadata.Events[name] ?? (metadata.Events[name] = {
      eventID: Number(record.eventID) >>> 0,
      maxRadiusAttenuation: 0,
      isLoop: 0,
      is2D: 0,
      isVital: 0,
      eventsStoppedBy: [],
      soundbanks: []
    });
    if (record.maxRadiusAttenuation !== undefined) base.maxRadiusAttenuation = Number(record.maxRadiusAttenuation) || 0;
    if (record.isLoop !== undefined) base.isLoop = record.isLoop ? 1 : 0;
    if (record.is2D !== undefined) base.is2D = record.is2D ? 1 : 0;
    if (record.isVital !== undefined) base.isVital = record.isVital ? 1 : 0;
    if (Array.isArray(record.eventsStoppedBy)) base.eventsStoppedBy = record.eventsStoppedBy.map(String);
    if (Array.isArray(record.soundbanks) && record.soundbanks.length) base.soundbanks = record.soundbanks.map(String);
  }
  for (const [name, record] of Object.entries(enrichment.SoundBanks || {})) {
    metadata.SoundBanks[name] = {
      EssentialSoundBank: record.EssentialSoundBank ? 1 : 0
    };
  }
  for (const [id, record] of Object.entries(enrichment.WemFileIDs || {})) {
    metadata.WemFileIDs[id] = {
      SoundBank: String(record.SoundBank ?? metadata.WemFileIDs[id]?.SoundBank ?? ""),
      IsEssential: record.IsEssential ? 1 : 0
    };
  }
  return metadata;
}

export { audioMetadataFromSoundbanksInfo };
//# sourceMappingURL=audioMetadata.js.map
