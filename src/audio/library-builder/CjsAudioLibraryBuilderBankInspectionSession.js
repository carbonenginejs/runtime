import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart).
import { throwIfAborted } from "#utils/errors";
import { CjsAudioLibraryBuilderUtils } from "./CjsAudioLibraryBuilderUtils.js";

/** Owns ordered bank inspection and its coupled projections. */
export class CjsAudioLibraryBuilderBankInspectionSession
{
    _builder;

    _loadBank;

    _inspectBank;

    _signal;

    _inspections = [];

    _bankIdentities = {};

    _embeddedMedia = {};

    /** Creates one ordered bank-inspection accumulator. */
    constructor({ builder, loadBank, inspectBank, signal })
    {
        this._builder = builder;
        this._loadBank = loadBank;
        this._inspectBank = inspectBank;
        this._signal = signal;
    }

    /** Inspects every indexed bank and returns its coupled projections. */
    async Inspect(library)
    {
        const loadBank = this._loadBank;
        const inspectBank = this._inspectBank;

        for (const [ sourceID, bank ] of Object.entries(library.banks))
        {
            throwIfAborted(this._signal, "Audio-library construction was aborted");

            let loaded;

            try
            {
                loaded = await loadBank(bank, {
                    sourceID,
                    signal: this._signal,
                });
            }
            catch (cause)
            {
                throw new Error(
                    `Unable to load audio bank ${sourceID}: ${bank.resPath}`,
                    { cause },
                );
            }

            throwIfAborted(this._signal, "Audio-library construction was aborted");

            const source = CjsAudioLibraryBuilderUtils.bankSourceName(bank.resPath);
            const prepared = normalizeLoadedBank(loaded, sourceID);
            const inspection = prepared.inspection ?? await inspectBank(
                prepared.bytes,
                {
                    bank,
                    source,
                    sourceID,
                    signal: this._signal,
                },
            );
            const compact = compactBankInspection(
                inspection,
                source,
                bank,
            );
            const inspectedSourceID =
                `${compact.bankId}:${compact.languageId}`;

            this._bankIdentities[bank.resPath.toLowerCase()] = {
                bankID: compact.bankId,
                languageID: compact.languageId,
            };
            this._inspections.push(compact);

            for (const record of compact.media)
            {
                const id = String(record.id);

                if (!record.available || library.media[id])
                {
                    continue;
                }

                const mediaType = record.mediaType
                    ?? (prepared.bytes
                        ? this._builder.mediaTypeFromMagic(
                            prepared.bytes,
                            record.absoluteOffset,
                        )
                        : "unknown");

                CjsAudioLibraryBuilderUtils.addSourceRecord(this._embeddedMedia, id, {
                    sourceID: `embedded:${id}:${inspectedSourceID}`,
                    bank: inspectedSourceID,
                    offset: record.absoluteOffset,
                    byteLength: record.length,
                    language: bank.language,
                    mediaType,
                });
            }
        }
        return {
            inspections: this._inspections,
            bankIdentities: this._bankIdentities,
            embeddedMedia: this._embeddedMedia,
        };
    }
}

function normalizeLoadedBank(value, sourceID)
{
    if (value === null || value === undefined)
    {
        throw new Error(`Audio bank provider returned no data for ${sourceID}`);
    }

    if (isBytes(value))
    {
        return {
            bytes: CjsAudioLibraryBuilderUtils.toUint8Array(value),
            inspection: null,
        };
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(
            `Audio bank provider returned an invalid value for ${sourceID}`,
        );
    }

    const bytes = value.bytes === null || value.bytes === undefined
        ? null
        : CjsAudioLibraryBuilderUtils.toUint8Array(value.bytes);
    const inspection = value.inspection ?? null;

    if (!bytes && !inspection)
    {
        throw new TypeError(
            `Audio bank provider returned no bytes or inspection for ${sourceID}`,
        );
    }

    return { bytes, inspection };
}

function isBytes(value)
{
    return value instanceof ArrayBuffer
        || ArrayBuffer.isView(value);
}

function compactBankInspection(value, source, bank)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`Audio bank inspection is invalid: ${bank.resPath}`);
    }

    const bankId = Number(CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
        value.bankId,
        `Audio bank ${bank.resPath} inspected bankId`,
    ));
    const languageId = Number(CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
        value.languageId ?? 0,
        `Audio bank ${bank.resPath} inspected languageId`,
    ));
    const bankVersion = Number(CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
        value.bankVersion ?? 0,
        `Audio bank ${bank.resPath} inspected bankVersion`,
    ));
    let globalSettings = null;

    if (value.globalSettings !== null
        && value.globalSettings !== undefined)
    {
        if (!value.globalSettings
            || typeof value.globalSettings !== "object"
            || Array.isArray(value.globalSettings))
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} contains invalid globalSettings`,
            );
        }
        globalSettings = structuredClone(value.globalSettings);
    }
    const hirc = Array.from(value.hirc ?? [], entry =>
    {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} contains an invalid HIRC entry`,
            );
        }

        return {
            ...entry,
            ...(entry.payload === null || entry.payload === undefined
                ? {}
                : { payload: CjsAudioLibraryBuilderUtils.toUint8Array(entry.payload).slice() }),
        };
    });
    const media = Array.from(value.media ?? [], entry =>
    {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} contains an invalid media entry`,
            );
        }

        const id = CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
            entry.id,
            `Audio bank ${bank.resPath} media ID`,
        );
        const available = entry.available === true;
        const absoluteOffset = Number(entry.absoluteOffset ?? 0);
        const length = Number(entry.length ?? 0);

        if (!Number.isSafeInteger(absoluteOffset) || absoluteOffset < 0)
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} media offset is invalid`,
            );
        }
        if (!Number.isSafeInteger(length) || length < 0)
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} media length is invalid`,
            );
        }

        return {
            ...entry,
            id: Number(id),
            available,
            absoluteOffset,
            length,
        };
    });

    return {
        source,
        resPath: bank.resPath,
        bankId,
        languageId,
        bankVersion,
        language: bank.language,
        globalSettings,
        hirc,
        media,
    };
}

CjsSchema.meta.define("CjsAudioLibraryBuilderBankInspectionSession")(CjsAudioLibraryBuilderBankInspectionSession);
