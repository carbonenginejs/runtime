import { CjsError } from "@carbonenginejs/runtime-utils/errors";
import { decodeJson } from "@carbonenginejs/runtime-utils/json";
import {
    CjsAudioBufferRes,
    CjsAudioRes,
} from "@carbonenginejs/runtime-resource/resource/audio";
import { CjsResMan } from "@carbonenginejs/runtime-resource";
import { CjsBnkFormat } from "@carbonenginejs/runtime-resource/formats/bnk";
import { CjsWemFormat } from "@carbonenginejs/runtime-resource/formats/wem";

import { CjsAudioLibraryBuilder } from "./CjsAudioLibraryBuilder.js";

const AUDIO_LIBRARY_SCHEMA = "carbonenginejs.audioLibrary";
const AUDIO_LIBRARY_VERSIONS = new Set([ 1, 2 ]);
const AUDIO_RESOURCE_REQUIREMENT = "audio-library-media";
const AUDIO_BUFFER_REQUIREMENT = "audio-library-buffer";
const AUDIO_CONTAINER_FORMATS = Object.freeze([
    CjsBnkFormat,
    CjsWemFormat,
]);
const BROWSER_AUDIO_EXTENSIONS = new Set([
    "flac",
    "mp3",
    "ogg",
    "wav",
]);
const OPAQUE_MEDIA_TYPE = "application/octet-stream";
const AUDIO_LIBRARY_REGISTER_KEYS = new Set([
    "audioApiResPath",
    "audioApiResPathSupportsIndividualFiles",
    "audioApiResPathSupportsOffset",
    "buildOptions",
    "defaultLanguage",
    "document",
    "enrich",
    "enrichResPath",
    "fetch",
    "indexEntries",
    "languages",
    "library",
    "libraryResFilePath",
    "mediaTypes",
    "requestInit",
    "resMan",
    "resManOptions",
    "resourceSource",
    "soundBank",
    "soundBankResPath",
    "source",
]);

/**
 * Browser audio-library adapter for construction, loading, and CjsResMan access.
 *
 * The adapter installs individually addressable CjsAudioRes handles while
 * keeping loose, prepared, API-provided, and BNK-window ingress private.
 */
export class CjsAudioLibrary
{

    #banks = new Map();

    #capabilities = null;

    #buffers = new Map();

    #defaultLanguage = "";

    #document = null;

    #embeddedMedia = new Map();

    #initializeOperation = null;

    #media = new Map();

    #options = {};

    #ownsResMan = false;

    #paths = new Map();

    #resources = new Map();

    #resMan = null;

    #source = null;

    /** Creates an uninitialized adapter and registers optional configuration. */
    constructor(options = {})
    {
        this.Register(options);
    }

    /**
     * Adds configuration before initialization locks the library.
     *
     * A base may be a prebuilt `library`/`libraryResFilePath`, or a
     * `soundBank`/`soundBankResPath` paired with `indexEntries`. Optional
     * `enrich`/`enrichResPath` metadata is applied after the base resolves.
     */
    Register(options = {})
    {
        this.#RequireConfigurationOpen();

        if (!options || typeof options !== "object" || Array.isArray(options))
        {
            throw new TypeError(
                "CjsAudioLibrary.Register options must be an object",
            );
        }

        for (const key of Object.keys(options))
        {
            if (!AUDIO_LIBRARY_REGISTER_KEYS.has(key))
            {
                throw new TypeError(
                    `CjsAudioLibrary.Register unknown option ${JSON.stringify(key)}`,
                );
            }
        }

        const next = {
            ...this.#options,
            ...options,
        };

        validateAudioLibraryRegistration(next);

        if (Object.hasOwn(options, "resMan"))
        {
            this.SetResMan(options.resMan);
        }

        if (Object.hasOwn(options, "source")
            || Object.hasOwn(options, "resourceSource"))
        {
            this.SetSource(options.source ?? options.resourceSource);
        }

        this.#options = next;
        return this;
    }

    /** Returns a detached plain document suitable for runtime installation. */
    GetDocument()
    {
        this.#RequireInitialized();
        return normalizeDocument(this.#document);
    }

    /** Initializes and permanently locks one resolved or constructed library. */
    async Initialize(sources = undefined)
    {
        if (this.#document)
        {
            if (sources !== undefined)
            {
                throw new CjsError(
                    "CJS_AUDIO_LIBRARY_ALREADY_INITIALIZED",
                    "CjsAudioLibrary is already initialized",
                );
            }

            this.#EnsureResMan();
            return this;
        }

        if (this.#initializeOperation)
        {
            if (sources !== undefined)
            {
                throw new CjsError(
                    "CJS_AUDIO_LIBRARY_INITIALIZING",
                    "CjsAudioLibrary initialization is already in progress",
                );
            }

            return this.#initializeOperation;
        }

        const operation = this.#Initialize(sources);

        this.#initializeOperation = operation;

        try
        {
            return await operation;
        }
        finally
        {
            if (this.#initializeOperation === operation)
            {
                this.#initializeOperation = null;
            }
        }
    }

    /** Installs or replaces the resource manager used for audio registrations. */
    SetResMan(resMan)
    {
        this.#RequireConfigurationOpen();

        if (!resMan
            || typeof resMan.GetResource !== "function"
            || typeof resMan.RegisterResourceType !== "function")
        {
            throw new TypeError(
                "CjsAudioLibrary resMan must provide GetResource and RegisterResourceType",
            );
        }
        if (this.#resources.size || this.#buffers.size)
        {
            throw new CjsError(
                "CJS_AUDIO_RESMAN_IN_USE",
                "CjsAudioLibrary cannot replace ResMan after resource registration",
            );
        }

        this.#resMan = resMan;
        this.#ownsResMan = false;
        this.#source ??= resMan.source ?? null;
        this.#ConfigureResMan(resMan);
        return this;
    }

    /** Returns the injected or lazily created audio resource manager. */
    GetResMan()
    {
        return this.#EnsureResMan();
    }

    /**
     * Probes individual-file and offset API delivery with one known bank member.
     *
     * Both requests run concurrently. When both succeed, their detached bytes
     * must match before either delivery mode is accepted. Probe results select
     * future API routing but cannot replace already registered resources.
     */
    async GetCapabilities({
        bank = null,
        mediaID = null,
        readOptions = {},
    } = {})
    {
        this.#RequireInitialized();

        if (this.#resources.size || this.#buffers.size)
        {
            throw new CjsError(
                "CJS_AUDIO_CAPABILITIES_IN_USE",
                "Audio API capabilities must be tested before resource registration",
            );
        }
        if (!readOptions
            || typeof readOptions !== "object"
            || Array.isArray(readOptions))
        {
            throw new TypeError(
                "CjsAudioLibrary capability readOptions must be an object",
            );
        }

        const apiBase = normalizeAudioApiBase(
            this.#options.audioApiResPath,
        );
        const resMan = this.#EnsureResMan();
        const source = this.#source ?? resMan.source ?? null;
        const descriptor = this.#GetCapabilityProbeDescriptor(
            mediaID,
            bank,
        );

        if (!apiBase
            || !source
            || typeof source.Read !== "function"
            || !descriptor)
        {
            const report = createUnavailableCapabilityReport({
                apiBase,
                descriptor,
                hasSource: Boolean(source && typeof source.Read === "function"),
            });

            this.#capabilities = report;
            return report;
        }

        const individualPath = `${apiBase}id/${encodeURIComponent(descriptor.mediaID)}`;
        const offsetPath = `${apiBase}path/${encodeURIComponent(descriptor.physicalPath)}`;
        const [ individualResult, offsetResult ] = await Promise.allSettled([
            resMan.QueueReadResource(individualPath, {
                ...readOptions,
                source,
            }),
            resMan.QueueReadResource(
                offsetPath,
                {
                    ...createRangeReadOptions(
                        readOptions,
                        descriptor.sourceOffset,
                        descriptor.byteLength,
                    ),
                    source,
                },
            ),
        ]);
        const individual = createCapabilityProbeResult(
            individualResult,
            descriptor.byteLength,
        );
        const offset = createCapabilityProbeResult(
            offsetResult,
            descriptor.byteLength,
        );
        const consistent = individual.bytes && offset.bytes
            ? byteViewsEqual(individual.bytes, offset.bytes)
            : null;
        const accepted = consistent !== false;
        const report = Object.freeze({
            audioApiResPath: apiBase,
            probeMediaID: descriptor.mediaID,
            probeBank: descriptor.bank,
            probeSourcePath: descriptor.physicalPath,
            verified: true,
            consistent,
            audioApiResPathSupportsIndividualFiles:
                accepted && individual.supported,
            audioApiResPathSupportsOffset:
                accepted && offset.supported,
            individualFiles: createPublicCapabilityProbeResult(
                individual,
                accepted,
            ),
            offset: createPublicCapabilityProbeResult(offset, accepted),
        });

        this.#capabilities = report;
        return report;
    }

    /** Sets the loose/bank/range/API source used by future registrations. */
    SetSource(source)
    {
        this.#RequireConfigurationOpen();

        if (!isAudioSource(source))
        {
            throw new TypeError(
                "CjsAudioLibrary source must provide Read, ReadAudio, or ReadRange",
            );
        }
        if (this.#resources.size || this.#buffers.size)
        {
            throw new CjsError(
                "CJS_AUDIO_SOURCE_IN_USE",
                "CjsAudioLibrary cannot replace its source after resource registration",
            );
        }

        this.#source = source;

        if (this.#ownsResMan && typeof source.Read === "function")
        {
            this.#resMan.SetSource(source);
        }

        return this;
    }

    /** Resolves one canonical audio resource by media ID without loading bytes. */
    GetResByID(mediaID, {
        mediaTypes = this.#options.mediaTypes ?? [],
        languages = this.#options.languages ?? [],
    } = {})
    {
        this.#RequireInitialized();

        const id = normalizeMediaID(mediaID);
        const allCandidates = [
            ...(this.#media.get(id) ?? []),
            ...(this.#embeddedMedia.get(id) ?? []),
        ];

        if (!allCandidates.length)
        {
            throw new CjsError(
                "CJS_AUDIO_MEDIA_NOT_FOUND",
                `Audio media ID not found: ${id}`,
                {
                    details: {
                        mediaID: id,
                    },
                },
            );
        }

        const candidates = allCandidates.filter(descriptor =>
            this.#SupportsDescriptor(descriptor));
        const descriptor = selectDescriptor(candidates, {
            mediaTypes,
            languages,
            defaultLanguage: this.#defaultLanguage,
        });

        if (!descriptor)
        {
            throw new CjsError(
                "CJS_AUDIO_REPRESENTATION_UNAVAILABLE",
                `No acceptable representation is available for audio media ID ${id}`,
                {
                    details: {
                        mediaID: id,
                    },
                },
            );
        }

        return this.#GetResource(descriptor);
    }

    /** Resolves one exact registered audio path without loading bytes. */
    GetResByPath(audioPath, {
        mediaTypes = this.#options.mediaTypes ?? [],
        languages = this.#options.languages ?? [],
    } = {})
    {
        this.#RequireInitialized();

        const normalized = normalizeAudioPath(audioPath);
        const allCandidates = this.#paths.get(normalized.key) ?? [];

        if (!allCandidates.length)
        {
            throw new CjsError(
                "CJS_AUDIO_PATH_NOT_FOUND",
                `Audio path not found: ${normalized.path}`,
                {
                    details: {
                        path: normalized.path,
                    },
                },
            );
        }

        const candidates = allCandidates.filter(descriptor =>
            this.#SupportsDescriptor(descriptor));
        const descriptor = selectDescriptor(candidates, {
            mediaTypes,
            languages,
            defaultLanguage: this.#defaultLanguage,
        });

        if (!descriptor)
        {
            throw new CjsError(
                "CJS_AUDIO_REPRESENTATION_UNAVAILABLE",
                `Audio path is not available in an acceptable representation: ${normalized.path}`,
                {
                    details: {
                        path: normalized.path,
                    },
                },
            );
        }

        return this.#GetResource(descriptor);
    }

    /** Returns detached bytes and metadata for one selected media ID. */
    async GetBytesByID(mediaID, options = {})
    {
        const {
            mediaTypes,
            languages,
            ...readOptions
        } = options;
        const selectionOptions = {};

        if (mediaTypes !== undefined)
        {
            selectionOptions.mediaTypes = mediaTypes;
        }
        if (languages !== undefined)
        {
            selectionOptions.languages = languages;
        }

        return this.GetResByID(mediaID, selectionOptions)
            .GetBytes(readOptions);
    }

    /** Returns detached bytes and metadata for one exact registered path. */
    async GetBytesByPath(audioPath, options = {})
    {
        const {
            mediaTypes,
            languages,
            ...readOptions
        } = options;
        const selectionOptions = {};

        if (mediaTypes !== undefined)
        {
            selectionOptions.mediaTypes = mediaTypes;
        }
        if (languages !== undefined)
        {
            selectionOptions.languages = languages;
        }

        return this.GetResByPath(audioPath, selectionOptions)
            .GetBytes(readOptions);
    }

    /** Lists exact semantic and physical paths registered by this library. */
    ListSourcePaths()
    {
        this.#RequireInitialized();
        return Object.freeze(
            [ ...this.#paths.values() ]
                .flat()
                .filter(descriptor => this.#SupportsDescriptor(descriptor))
                .map(descriptor => descriptor.resourcePath)
                .filter((value, index, values) =>
                    values.indexOf(value) === index)
                .sort((left, right) => left.localeCompare(right, "en")),
        );
    }

    /** Throws after initialization starts or permanently locks configuration. */
    #RequireConfigurationOpen()
    {
        if (this.#document)
        {
            throw new CjsError(
                "CJS_AUDIO_LIBRARY_CONFIGURATION_LOCKED",
                "CjsAudioLibrary configuration is locked after initialization",
            );
        }
        if (this.#initializeOperation)
        {
            throw new CjsError(
                "CJS_AUDIO_LIBRARY_INITIALIZING",
                "CjsAudioLibrary configuration is locked during initialization",
            );
        }
    }

    /** Throws when a lookup is attempted before initialization. */
    #RequireInitialized()
    {
        if (!this.#document)
        {
            throw new CjsError(
                "CJS_AUDIO_LIBRARY_NOT_INITIALIZED",
                "CjsAudioLibrary.Initialize must complete before audio lookup",
            );
        }
    }

    /** Selects one stable embedded bank member for delivery capability probes. */
    #GetCapabilityProbeDescriptor(mediaID, bank)
    {
        const hasMediaID = mediaID !== null && mediaID !== undefined;
        const hasBank = bank !== null && bank !== undefined;

        if (hasMediaID && hasBank)
        {
            throw new TypeError(
                "CjsAudioLibrary capability mediaID and bank are mutually exclusive",
            );
        }

        let descriptors = [ ...this.#embeddedMedia.values() ].flat();

        if (hasMediaID)
        {
            const id = normalizeMediaID(mediaID);

            descriptors = descriptors.filter(candidate =>
                candidate.mediaID === id);
        }
        else if (hasBank)
        {
            const bankID = String(bank);
            const bankDescriptor = this.#banks.get(bankID) ?? null;

            descriptors = descriptors.filter(candidate =>
                candidate.bank === bankID
                || (bankDescriptor
                    && candidate.physicalPathKey
                        === bankDescriptor.physicalPathKey));
        }

        const mediaUsage = new Map();

        for (const ids of Object.values(this.#document?.eventMedia ?? {}))
        {
            for (const id of ids)
            {
                const key = normalizeMediaID(id);

                mediaUsage.set(key, (mediaUsage.get(key) ?? 0) + 1);
            }
        }
        const bankUsage = new Map();

        for (const descriptor of descriptors)
        {
            const usage = bankUsage.get(descriptor.bank) ?? {
                references: 0,
                members: 0,
            };

            usage.references += mediaUsage.get(descriptor.mediaID) ?? 0;
            usage.members += 1;
            bankUsage.set(descriptor.bank, usage);
        }

        return descriptors
            .filter(candidate =>
                candidate.embedded
                && candidate.byteLength > 0
                && candidate.sourceOffset >= 0)
            .sort((left, right) =>
            {
                const leftBank = bankUsage.get(left.bank);
                const rightBank = bankUsage.get(right.bank);
                const leftPhysicalBytes = this.#banks.get(left.bank)
                    ?.physicalByteLength ?? Number.POSITIVE_INFINITY;
                const rightPhysicalBytes = this.#banks.get(right.bank)
                    ?.physicalByteLength ?? Number.POSITIVE_INFINITY;

                return rightBank.references - leftBank.references
                    || rightBank.members - leftBank.members
                    || leftPhysicalBytes - rightPhysicalBytes
                    || (mediaUsage.get(right.mediaID) ?? 0)
                        - (mediaUsage.get(left.mediaID) ?? 0)
                    || left.byteLength - right.byteLength
                    || left.sourceID.localeCompare(right.sourceID, "en");
            })[0] ?? null;
    }

    /** Combines registered transport declarations with verified probe results. */
    #GetRoutingOptions()
    {
        if (!this.#capabilities?.verified)
        {
            return this.#options;
        }

        return {
            ...this.#options,
            audioApiResPathSupportsIndividualFiles:
                this.#capabilities.audioApiResPathSupportsIndividualFiles,
            audioApiResPathSupportsOffset:
                this.#capabilities.audioApiResPathSupportsOffset,
        };
    }

    /** Resolves registered inputs, applies enrichment, and installs one document. */
    async #Initialize(sources)
    {
        const base = sources === undefined
            ? await this.#ResolveRegisteredBase()
            : await this.#ResolveLibraryInput(sources);
        const enrichment = await this.#ResolveRegisteredEnrichment();
        const document = enrichment === null
            ? base
            : CjsAudioLibraryBuilder.applyEnrichment(base, enrichment);

        this.#InstallDocument(document);
        this.#EnsureResMan();
        return this;
    }

    /** Resolves one registered prebuilt-library or sound-bank base. */
    async #ResolveRegisteredBase()
    {
        if (hasRegistrationValue(this.#options, "libraryResFilePath"))
        {
            return this.#LoadResourceDocument(
                this.#options.libraryResFilePath,
                "audio library",
            );
        }
        if (hasRegistrationValue(this.#options, "library"))
        {
            return this.#ResolveLibraryInput(this.#options.library);
        }
        if (hasRegistrationValue(this.#options, "document"))
        {
            return this.#ResolveLibraryInput(this.#options.document);
        }

        const hasSoundBank = hasRegistrationValue(
            this.#options,
            "soundBank",
        ) || hasRegistrationValue(this.#options, "soundBankResPath");

        if (!hasSoundBank)
        {
            throw new TypeError(
                "CjsAudioLibrary.Initialize requires a library or sound-bank source",
            );
        }
        if (!Object.hasOwn(this.#options, "indexEntries"))
        {
            throw new TypeError(
                "Sound-bank library construction requires indexEntries",
            );
        }

        const soundbanksInfo = hasRegistrationValue(
            this.#options,
            "soundBank",
        )
            ? this.#options.soundBank
            : await this.#LoadResourceDocument(
                this.#options.soundBankResPath,
                "sound-bank metadata",
            );

        return this.#BuildLibraryDocument({
            ...(this.#options.buildOptions ?? {}),
            indexEntries: this.#options.indexEntries,
            soundbanksInfo,
        });
    }

    /** Resolves optional metadata enrichment registered over either base form. */
    async #ResolveRegisteredEnrichment()
    {
        if (hasRegistrationValue(this.#options, "enrichResPath"))
        {
            return this.#LoadResourceDocument(
                this.#options.enrichResPath,
                "audio enrichment",
            );
        }
        if (hasRegistrationValue(this.#options, "enrich"))
        {
            return this.#options.enrich;
        }

        return null;
    }

    /** Loads one JSON document through the configured CjsResMan source queue. */
    async #LoadResourceDocument(path, label)
    {
        const resMan = this.#EnsureResMan();
        const source = this.#source ?? resMan.source ?? null;

        if (!source || typeof source.Read !== "function")
        {
            throw new TypeError(
                `CjsAudioLibrary ${label} path requires a readable resource source`,
            );
        }

        try
        {
            const value = await resMan.QueueReadResource(path, {
                source,
            });

            return parseJSONResourceValue(value, label);
        }
        catch (cause)
        {
            throw new CjsError(
                "CJS_AUDIO_LIBRARY_SOURCE_UNAVAILABLE",
                `Unable to load ${label}: ${path}`,
                {
                    cause,
                    details: {
                        path,
                    },
                },
            );
        }
    }

    /** Normalizes and installs one library document into lookup indexes. */
    #InstallDocument(document)
    {
        if (this.#document)
        {
            throw new CjsError(
                "CJS_AUDIO_LIBRARY_ALREADY_INITIALIZED",
                "CjsAudioLibrary is already initialized",
            );
        }

        const value = normalizeDocument(document);
        const paths = new Map();
        const mediaMetadata = value.metadata?.WemFileIDs ?? {};
        const banks = createBankIndex(value.banks, paths);
        const media = createMediaIndex(
            value.media,
            paths,
            mediaMetadata,
        );
        const embeddedMedia = createEmbeddedIndex(
            value.embeddedMedia ?? {},
            banks,
            paths,
            mediaMetadata,
        );

        this.#document = value;
        this.#paths = paths;
        this.#banks = banks;
        this.#media = media;
        this.#embeddedMedia = embeddedMedia;
        this.#defaultLanguage = normalizeLanguage(
            this.#options.defaultLanguage
            ?? value.eventMediaLanguage
            ?? "",
        );

        Object.assign(this, value);
    }

    /** Resolves one supported initialization input to a plain library document. */
    async #ResolveLibraryInput(input)
    {
        if (Array.isArray(input))
        {
            if (!input.length)
            {
                throw new TypeError(
                    "CjsAudioLibrary.Initialize sources must not be empty",
                );
            }

            let cause = null;

            for (const candidate of input)
            {
                try
                {
                    return await this.#ResolveLibraryInput(candidate);
                }
                catch (error)
                {
                    cause = error;
                }
            }

            throw new CjsError(
                "CJS_AUDIO_LIBRARY_SOURCE_UNAVAILABLE",
                "No audio-library source could be initialized",
                {
                    cause,
                },
            );
        }
        if (input instanceof CjsAudioLibrary)
        {
            return input.GetDocument();
        }
        if (input
            && typeof input === "object"
            && !Array.isArray(input)
            && "schema" in input)
        {
            return input;
        }
        if (isBuilderOptions(input))
        {
            return this.#BuildLibraryDocument(input);
        }
        if (isDocument(input))
        {
            return input;
        }
        if (typeof input === "string"
            && input.trimStart().startsWith("{"))
        {
            return parseJSON(input);
        }
        if (isResponseLike(input))
        {
            return readResponseJSON(input);
        }
        if (input && typeof input.text === "function")
        {
            return parseJSON(await input.text());
        }

        const fetchFunction = this.#options.fetch ?? globalThis.fetch;

        if (typeof fetchFunction !== "function")
        {
            throw new CjsError(
                "CJS_AUDIO_LIBRARY_FETCH_UNSUPPORTED",
                "fetch is unavailable for audio-library loading",
            );
        }

        const response = await fetchFunction(
            input,
            this.#options.requestInit,
        );

        return readResponseJSON(response, input);
    }

    /** Constructs one source or complete document from normalized builder options. */
    async #BuildLibraryDocument(input)
    {
        const options = { ...input };
        const complete = options.buildFromBanks === true
            || options.complete === true;

        delete options.buildFromBanks;
        delete options.complete;

        if (complete && !hasBankLoader(options))
        {
            const resMan = this.#EnsureResMan();
            const source = this.#source ?? resMan.source ?? null;

            if (!source || typeof source.Read !== "function")
            {
                throw new TypeError(
                    "Complete audio-library construction requires a bank source",
                );
            }

            options.loadBank = (bank, context) => resMan.QueueReadResource(
                bank.resPath,
                {
                    signal: context.signal,
                    source,
                },
            );
        }

        return complete
            ? CjsAudioLibraryBuilder.buildFromBanks(options)
            : CjsAudioLibraryBuilder.build(options);
    }

    /** Returns the configured manager or creates a private one on demand. */
    #EnsureResMan()
    {
        if (this.#resMan)
        {
            return this.#resMan;
        }

        const options = {
            ...(this.#options.resManOptions ?? {}),
        };

        if (this.#source && typeof this.#source.Read === "function")
        {
            options.source = this.#source;
        }

        this.#resMan = new CjsResMan(options);
        this.#ownsResMan = true;
        this.#ConfigureResMan(this.#resMan);
        return this.#resMan;
    }

    /** Registers the audio-only resource types and fallback byte loaders. */
    #ConfigureResMan(resMan)
    {
        for (const [ requirement, Constructor ] of [
            [ AUDIO_RESOURCE_REQUIREMENT, CjsAudioRes ],
            [ AUDIO_BUFFER_REQUIREMENT, CjsAudioBufferRes ],
        ])
        {
            const existing = resMan.resourceTypes?.get(requirement);

            if (existing && existing !== Constructor)
            {
                throw new CjsError(
                    "CJS_AUDIO_RESOURCE_TYPE_CONFLICT",
                    `ResMan already defines ${requirement}`,
                    {
                        details: {
                            requirement,
                        },
                    },
                );
            }

            resMan.RegisterResourceType(requirement, Constructor);
        }

        if (this.#ownsResMan)
        {
            for (const Format of AUDIO_CONTAINER_FORMATS)
            {
                const extensions = Format.inputTypes ?? [];
                const registered = extensions.some(extension =>
                    (resMan.GetFormatDescriptors?.(extension) ?? []).length > 0);

                if (!registered)
                {
                    resMan.RegisterFormat(Format);
                }
            }
        }

        const passthroughExtensions = new Set(BROWSER_AUDIO_EXTENSIONS);

        if (this.#ownsResMan)
        {
            for (const Format of AUDIO_CONTAINER_FORMATS)
            {
                for (const extension of Format.inputTypes ?? [])
                {
                    passthroughExtensions.add(extension);
                }
            }
        }

        for (const extension of passthroughExtensions)
        {
            const hasLoader = typeof resMan.GetObjectLoader === "function"
                && resMan.GetObjectLoader(extension);
            const hasFormat = typeof resMan.GetFormatDescriptors === "function"
                && resMan.GetFormatDescriptors(extension).length > 0;

            if (!hasLoader && !hasFormat
                && typeof resMan.RegisterObjectLoader === "function")
            {
                resMan.RegisterObjectLoader(extension, readRawAudioBytes);
            }
        }
    }

    /** Reports whether this manager can return raw bytes for one representation. */
    #SupportsDescriptor(descriptor)
    {
        const resMan = this.#EnsureResMan();
        const source = this.#source ?? resMan.source ?? null;
        const backing = resolveBacking(
            descriptor,
            source,
            this.#GetRoutingOptions(),
        );
        const extension = backing.extension;
        const hasLoader = Boolean(resMan.GetObjectLoader?.(extension));
        const hasFormat = Boolean(
            (resMan.GetFormatDescriptors?.(extension) ?? []).length,
        );

        return BROWSER_AUDIO_EXTENSIONS.has(extension)
            ? hasLoader || hasFormat
            : hasFormat;
    }

    /** Installs raw-byte pass-through only for a supported backing extension. */
    #EnsureRawByteLoader(resMan, extension)
    {
        if (resMan.GetObjectLoader?.(extension))
        {
            return;
        }

        const hasFormat = Boolean(
            (resMan.GetFormatDescriptors?.(extension) ?? []).length,
        );

        if ((BROWSER_AUDIO_EXTENSIONS.has(extension) || hasFormat)
            && typeof resMan.RegisterObjectLoader === "function")
        {
            resMan.RegisterObjectLoader(extension, readRawAudioBytes);
        }
    }

    /** Returns the canonical semantic resource for a selected descriptor. */
    #GetResource(descriptor)
    {
        const existing = this.#resources.get(descriptor.selectionKey);

        if (existing?.IsCurrent?.() && !existing.IsPurged?.())
        {
            existing.KeepAlive();
            return existing;
        }

        const resMan = this.#EnsureResMan();
        const backing = this.#GetBufferResource(descriptor);
        const info = createAudioInfo(descriptor);
        const resource = resMan.GetResource(
            descriptor.resourcePath,
            {
                requirement: AUDIO_RESOURCE_REQUIREMENT,
                variant: `audio:${descriptor.selectionKey}`,
                ext: mediaExtension(descriptor),
                values: {
                    info,
                },
            },
        );

        if (!(resource instanceof CjsAudioRes))
        {
            throw new CjsError(
                "CJS_AUDIO_RESOURCE_TYPE_CONFLICT",
                `ResMan returned a non-audio resource: ${descriptor.resourcePath}`,
                {
                    details: {
                        path: descriptor.resourcePath,
                    },
                },
            );
        }

        resource.SetAudioInfo(info);
        resource.SetBackingResource(backing.resource, {
            offset: backing.offset,
            byteLength: descriptor.byteLength,
        });

        if (!resource.IsPrepared())
        {
            resource.MarkPrepared();
        }

        this.#resources.set(descriptor.selectionKey, resource);
        return resource;
    }

    /** Returns the canonical physical backing resource and semantic offset. */
    #GetBufferResource(descriptor)
    {
        const resMan = this.#EnsureResMan();
        const source = this.#source ?? resMan.source ?? null;
        const backing = resolveBacking(
            descriptor,
            source,
            this.#GetRoutingOptions(),
        );
        this.#EnsureRawByteLoader(resMan, backing.extension);
        const existing = this.#buffers.get(backing.key);

        if (existing?.IsCurrent?.() && !existing.IsPurged?.())
        {
            existing.KeepAlive();
            return Object.freeze({
                resource: existing,
                offset: backing.offset,
            });
        }

        const request = {
            requirement: AUDIO_BUFFER_REQUIREMENT,
            variant: `audio-buffer:${backing.key}`,
            ext: backing.extension,
            values: {
                sourceID: backing.sourceID,
                sourcePath: backing.path,
                byteLength: backing.byteLength,
                checksum: backing.checksum,
            },
        };

        if (backing.source)
        {
            request.source = backing.source;
        }
        if (backing.sourceRevision !== null)
        {
            request.sourceRevision = backing.sourceRevision;
        }

        const resource = resMan.GetResource(backing.path, request);

        if (!(resource instanceof CjsAudioBufferRes))
        {
            throw new CjsError(
                "CJS_AUDIO_RESOURCE_TYPE_CONFLICT",
                `ResMan returned a non-audio buffer: ${backing.path}`,
                {
                    details: {
                        path: backing.path,
                    },
                },
            );
        }

        resource.SetAudioInfo({
            sourceID: backing.sourceID,
            sourcePath: backing.path,
            byteLength: backing.byteLength,
            checksum: backing.checksum,
        });

        this.#buffers.set(backing.key, resource);
        return Object.freeze({
            resource,
            offset: backing.offset,
        });
    }

    /** Validates a document without retaining it. */
    static validate(document)
    {
        validateDocument(document);
        return true;
    }

    /** Creates and initializes a library from a document, JSON string, or library. */
    static async from(value, options = {})
    {
        if (value instanceof this)
        {
            return value;
        }

        const library = new this(options);

        await library.Initialize(value);
        return library;
    }

    /** Builds a source catalog without reading bank bytes. */
    static async build(options = {})
    {
        return this.from(CjsAudioLibraryBuilder.build(options));
    }

    /** Builds a complete event/media library through injected bank access. */
    static async buildFromBanks(options = {})
    {
        return this.from(
            await CjsAudioLibraryBuilder.buildFromBanks(options),
        );
    }

    /**
     * Loads a JSON document from a URL, Response-like object, Blob, or text.
     *
     * HTTP content encoding remains server/browser policy. A caller may pass a
     * decompressed JSON string for local compressed artifacts.
     */
    static async load(source, options = {})
    {
        if (source instanceof this)
        {
            return source;
        }

        return this.from(source, options);
    }

}

/** Adapts exact-item and range ingress to the generic resource-source contract. */
const AudioSelectionSource = class
{

    #descriptor;

    #mode;

    #source;

    /** Creates a source adapter for one immutable audio selection. */
    constructor(source, descriptor, mode)
    {
        this.#source = source;
        this.#descriptor = descriptor;
        this.#mode = mode;
    }

    /** Reads one exact media item or one physical byte range. */
    Read(path, options = {})
    {
        if (this.#mode === "api-audio")
        {
            return this.#source.Read(path, options);
        }
        if (this.#mode === "api-range")
        {
            return this.#source.Read(
                path,
                createRangeReadOptions(
                    options,
                    this.#descriptor.sourceOffset,
                    this.#descriptor.byteLength,
                ),
            );
        }
        if (this.#mode === "audio")
        {
            const context = {
                ...options,
                descriptor: createAudioInfo(this.#descriptor),
                record: this.#descriptor.record,
            };

            if (typeof this.#source.ReadAudio === "function")
            {
                return this.#source.ReadAudio(
                    this.#descriptor.mediaID
                    ?? this.#descriptor.resourcePath,
                    context,
                );
            }

            return this.#source.FetchAudio(
                this.#descriptor.resourcePath,
                this.#descriptor.record,
                context,
            );
        }

        return this.#source.ReadRange(
            this.#descriptor.physicalPath,
            {
                ...options,
                offset: this.#descriptor.sourceOffset,
                byteLength: this.#descriptor.byteLength,
                descriptor: createAudioInfo(this.#descriptor),
                record: this.#descriptor.record,
            },
        );
    }

    /** Describes an optional worker request for an exact item or byte range. */
    CreateWorkerRequest(path, options = {})
    {
        if ((this.#mode === "api-audio"
            || this.#mode === "api-range")
            && typeof this.#source.CreateWorkerRequest === "function")
        {
            const requestOptions = this.#mode === "api-range"
                ? createRangeReadOptions(
                    options,
                    this.#descriptor.sourceOffset,
                    this.#descriptor.byteLength,
                )
                : options;

            return this.#source.CreateWorkerRequest(
                path,
                requestOptions,
            );
        }
        if (this.#mode === "audio"
            && typeof this.#source.CreateAudioWorkerRequest === "function")
        {
            return this.#source.CreateAudioWorkerRequest(
                this.#descriptor.mediaID
                ?? this.#descriptor.resourcePath,
                {
                    ...options,
                    descriptor: createAudioInfo(this.#descriptor),
                    record: this.#descriptor.record,
                },
            );
        }
        if (this.#mode === "range"
            && typeof this.#source.CreateRangeWorkerRequest === "function")
        {
            return this.#source.CreateRangeWorkerRequest(
                this.#descriptor.physicalPath,
                {
                    ...options,
                    offset: this.#descriptor.sourceOffset,
                    byteLength: this.#descriptor.byteLength,
                    descriptor: createAudioInfo(this.#descriptor),
                    record: this.#descriptor.record,
                },
            );
        }

        return null;
    }

    /**
     * Reports whether API paths must be resolved by CjsResMan before reading.
     */
    get requiresUrl()
    {
        return (this.#mode === "api-audio" || this.#mode === "api-range")
            && sourceRequiresUrl(this.#source);
    }

};

function createBankIndex(banks, paths)
{
    const index = new Map();

    for (const [ value, record ] of Object.entries(banks))
    {
        requireRecord(record, `Audio library bank ${value}`);

        const sourceID = String(record.sourceID ?? value);
        const physical = normalizeAudioPath(
            sourceRecordPath(record, `Audio library bank ${value}`),
        );
        const descriptor = Object.freeze({
            kind: "bank",
            mediaID: null,
            sourceID,
            selectionKey: `bank:${sourceID}`,
            sourceRank: 3,
            resourcePath: physical.path,
            physicalPath: physical.path,
            physicalPathKey: physical.key,
            sourceOffset: 0,
            byteLength: optionalByteLength(record.byteLength),
            physicalByteLength: optionalByteLength(record.byteLength),
            checksum: normalizeChecksum(record),
            mediaType: normalizeMediaType(
                record.mediaType,
                physical.path,
            ),
            language: normalizeLanguage(record.language),
            embedded: false,
            bank: null,
            metadata: null,
            record,
        });

        index.set(String(value), descriptor);
        index.set(sourceID, descriptor);
        registerPath(paths, descriptor);
    }

    return index;
}

function createMediaIndex(media, paths, metadata)
{
    const index = new Map();

    for (const [ value, mediaRecord ] of Object.entries(media))
    {
        const mediaID = normalizeMediaID(value);
        const records = expandMediaRecords(mediaRecord);
        const descriptors = records.map((record, recordIndex) =>
        {
            requireRecord(record, `Audio media ${mediaID}`);

            const sourceID = String(
                record.sourceID ?? `media:${mediaID}:${recordIndex}`,
            );
            const physical = normalizeAudioPath(
                sourceRecordPath(record, `Audio media ${mediaID}`),
            );

            return Object.freeze({
                kind: "media",
                mediaID,
                sourceID,
                selectionKey: `media:${mediaID}:${sourceID}`,
                sourceRank: isPrepared(record) ? 0 : 1,
                resourcePath: physical.path,
                physicalPath: physical.path,
                physicalPathKey: physical.key,
                sourceOffset: 0,
                byteLength: optionalByteLength(record.byteLength),
                physicalByteLength: optionalByteLength(record.byteLength),
                checksum: normalizeChecksum(record),
                mediaType: normalizeMediaType(
                    record.mediaType,
                    physical.path,
                ),
                language: normalizeLanguage(record.language),
                embedded: false,
                bank: null,
                metadata: metadata[mediaID] ?? null,
                record,
            });
        });

        if (!descriptors.length)
        {
            throw new TypeError(`Audio media ${mediaID} has no source records`);
        }

        for (const descriptor of descriptors)
        {
            registerPath(paths, descriptor);
        }

        index.set(mediaID, descriptors);
    }

    return index;
}

function createEmbeddedIndex(embeddedMedia, banks, paths, metadata)
{
    const index = new Map();

    for (const [ value, mediaRecord ] of Object.entries(embeddedMedia))
    {
        const mediaID = normalizeMediaID(value);
        const records = expandMediaRecords(mediaRecord);
        const descriptors = [];

        for (let recordIndex = 0; recordIndex < records.length; recordIndex++)
        {
            const record = requireRecord(
                records[recordIndex],
                `Embedded audio media ${mediaID}`,
            );
            const bankID = String(record.bank ?? "");
            const bank = banks.get(bankID);

            if (!bank)
            {
                throw new TypeError(
                    `Embedded audio media ${mediaID} references unknown bank ${bankID}`,
                );
            }

            const sourceID = String(
                record.sourceID
                ?? `embedded:${mediaID}:${bankID}:${recordIndex}`,
            );
            const resourcePath = record.path
                ?? record.logicalPath
                ?? record.resPath
                ?? `aud:/id/${mediaID}`;
            const semantic = normalizeAudioPath(resourcePath);
            const descriptor = Object.freeze({
                kind: "media",
                mediaID,
                sourceID,
                selectionKey: `embedded:${mediaID}:${sourceID}`,
                sourceRank: 2,
                resourcePath: semantic.path,
                physicalPath: bank.physicalPath,
                physicalPathKey: bank.physicalPathKey,
                sourceOffset: normalizeNonNegativeInteger(
                    record.offset,
                    `Embedded audio media ${mediaID} offset`,
                ),
                byteLength: normalizePositiveInteger(
                    record.byteLength,
                    `Embedded audio media ${mediaID} byteLength`,
                ),
                physicalByteLength: bank.byteLength,
                checksum: normalizeChecksum(record) || bank.checksum,
                mediaType: normalizeMediaType(
                    record.mediaType ?? "wem",
                    semantic.path,
                ),
                language: normalizeLanguage(
                    record.language ?? bank.language,
                ),
                embedded: true,
                bank: bankID,
                metadata: metadata[mediaID] ?? null,
                record,
            });

            descriptors.push(descriptor);
            registerPath(paths, descriptor);
        }

        index.set(mediaID, descriptors);
    }

    return index;
}

function registerPath(paths, descriptor)
{
    const normalized = normalizeAudioPath(descriptor.resourcePath);
    const records = paths.get(normalized.key) ?? [];

    if (!records.some(value =>
        value.selectionKey === descriptor.selectionKey))
    {
        records.push(descriptor);
        records.sort((left, right) =>
            left.sourceRank - right.sourceRank
            || left.sourceID.localeCompare(right.sourceID, "en"));
        paths.set(normalized.key, records);
    }
}

function selectDescriptor(candidates, {
    mediaTypes,
    languages,
    defaultLanguage,
})
{
    const acceptedTypes = normalizeMediaTypes(mediaTypes);
    const acceptedLanguages = normalizeLanguages(languages);

    return candidates
        .map(candidate => ({
            candidate,
            mediaTypeRank: mediaTypeRank(
                candidate.mediaType,
                acceptedTypes,
            ),
            languageRank: languageRank(
                candidate.language,
                acceptedLanguages,
                defaultLanguage,
            ),
        }))
        .filter(value =>
            Number.isFinite(value.mediaTypeRank)
            && Number.isFinite(value.languageRank))
        .sort((left, right) =>
            left.mediaTypeRank - right.mediaTypeRank
            || left.languageRank - right.languageRank
            || left.candidate.sourceRank - right.candidate.sourceRank
            || left.candidate.sourceID.localeCompare(
                right.candidate.sourceID,
                "en",
            ))[0]?.candidate ?? null;
}

function resolveBacking(descriptor, source, options = {})
{
    const apiBase = normalizeAudioApiBase(options.audioApiResPath);
    const apiIndividual = Boolean(
        apiBase
        && descriptor.mediaID
        && options.audioApiResPathSupportsIndividualFiles
        && source
        && typeof source.Read === "function",
    );
    const apiRange = Boolean(
        apiBase
        && descriptor.embedded
        && descriptor.byteLength > 0
        && options.audioApiResPathSupportsOffset
        && source
        && typeof source.Read === "function",
    );
    const exactAudio = Boolean(
        descriptor.mediaID
        && source
        && (typeof source.ReadAudio === "function"
            || typeof source.FetchAudio === "function"),
    );
    const exactRange = Boolean(
        descriptor.embedded
        && source
        && typeof source.ReadRange === "function",
    );

    if (apiIndividual || apiRange || exactAudio || exactRange)
    {
        const mode = apiIndividual
            ? "api-audio"
            : apiRange
                ? "api-range"
                : exactAudio
                    ? "audio"
                    : "range";
        const path = apiIndividual
            ? `${apiBase}id/${encodeURIComponent(descriptor.mediaID)}`
            : apiRange
                ? `${apiBase}path/${encodeURIComponent(descriptor.physicalPath)}`
                : descriptor.resourcePath;

        return Object.freeze({
            key: `${mode}:${descriptor.selectionKey}`,
            sourceID: descriptor.sourceID,
            path,
            extension: mediaExtension(descriptor),
            byteLength: descriptor.byteLength,
            checksum: descriptor.checksum,
            sourceRevision: descriptor.checksum || null,
            source: new AudioSelectionSource(
                source,
                descriptor,
                mode,
            ),
            offset: 0,
        });
    }

    return Object.freeze({
        key: `physical:${descriptor.physicalPathKey}`,
        sourceID: descriptor.embedded
            ? `bank:${descriptor.bank}`
            : descriptor.sourceID,
        path: descriptor.physicalPath,
        extension: pathExtension(descriptor.physicalPath)
            || mediaExtension(descriptor),
        byteLength: descriptor.physicalByteLength,
        checksum: descriptor.checksum,
        sourceRevision: descriptor.checksum || null,
        source,
        offset: descriptor.sourceOffset,
    });
}

function normalizeAudioApiBase(value)
{
    if (value === undefined || value === null || value === "")
    {
        return "";
    }

    const base = String(value).trim().replaceAll("\\", "/");

    if (!base || base.includes("\0"))
    {
        throw new TypeError(
            "CjsAudioLibrary audioApiResPath must be a resource path",
        );
    }

    return base.endsWith("/") ? base : `${base}/`;
}

function createRangeReadOptions(options, offset, byteLength)
{
    const end = offset + byteLength - 1;
    const range = `bytes=${offset}-${end}`;
    const headers = new Headers(options.headers ?? {});

    headers.set("Range", range);

    return {
        ...options,
        headers,
        fetchOptions: {
            ...(options.fetchOptions ?? {}),
            headers,
        },
    };
}

function createUnavailableCapabilityReport({
    apiBase,
    descriptor,
    hasSource,
})
{
    const reason = !apiBase
        ? "audio-api-path-unavailable"
        : !hasSource
            ? "audio-api-source-unavailable"
            : "embedded-media-unavailable";
    const result = Object.freeze({
        tested: false,
        supported: false,
        byteLength: null,
        error: Object.freeze({
            code: "CJS_AUDIO_CAPABILITY_NOT_TESTED",
            message: reason,
        }),
    });

    return Object.freeze({
        audioApiResPath: apiBase || null,
        probeMediaID: descriptor?.mediaID ?? null,
        probeBank: descriptor?.bank ?? null,
        probeSourcePath: descriptor?.physicalPath ?? null,
        verified: false,
        consistent: null,
        audioApiResPathSupportsIndividualFiles: false,
        audioApiResPathSupportsOffset: false,
        individualFiles: result,
        offset: result,
    });
}

function createCapabilityProbeResult(result, expectedByteLength)
{
    if (result.status === "rejected")
    {
        return {
            tested: true,
            supported: false,
            byteLength: null,
            bytes: null,
            error: normalizeCapabilityError(result.reason),
        };
    }

    try
    {
        const bytes = CjsAudioBufferRes.toUint8Array(result.value);

        if (bytes.byteLength !== expectedByteLength)
        {
            return {
                tested: true,
                supported: false,
                byteLength: bytes.byteLength,
                bytes,
                error: Object.freeze({
                    code: "CJS_AUDIO_CAPABILITY_LENGTH_MISMATCH",
                    message: `Expected ${expectedByteLength} bytes but received ${bytes.byteLength}`,
                }),
            };
        }

        return {
            tested: true,
            supported: true,
            byteLength: bytes.byteLength,
            bytes,
            error: null,
        };
    }
    catch (error)
    {
        return {
            tested: true,
            supported: false,
            byteLength: null,
            bytes: null,
            error: normalizeCapabilityError(error),
        };
    }
}

function createPublicCapabilityProbeResult(result, accepted = true)
{
    const consistencyError = accepted || !result.supported
        ? null
        : Object.freeze({
            code: "CJS_AUDIO_CAPABILITY_CONTENT_MISMATCH",
            message: "Individual and offset audio responses did not match",
        });

    return Object.freeze({
        tested: result.tested,
        supported: accepted && result.supported,
        byteLength: result.byteLength,
        error: consistencyError ?? result.error,
    });
}

function normalizeCapabilityError(error)
{
    return Object.freeze({
        code: String(error?.code ?? "CJS_AUDIO_CAPABILITY_REQUEST_FAILED"),
        message: String(error?.message ?? error ?? "Audio capability request failed"),
        status: Number.isInteger(error?.status) ? error.status : null,
    });
}

function byteViewsEqual(left, right)
{
    if (left.byteLength !== right.byteLength)
    {
        return false;
    }

    for (let index = 0; index < left.byteLength; index++)
    {
        if (left[index] !== right[index])
        {
            return false;
        }
    }

    return true;
}

function createAudioInfo(descriptor)
{
    return Object.freeze({
        mediaID: descriptor.mediaID,
        sourceID: descriptor.sourceID,
        path: descriptor.resourcePath,
        sourcePath: descriptor.physicalPath,
        mediaType: descriptor.mediaType,
        language: descriptor.language,
        embedded: descriptor.embedded,
        bank: descriptor.bank,
        sourceOffset: descriptor.sourceOffset,
        declaredByteLength: descriptor.byteLength,
        checksum: descriptor.checksum,
        metadata: descriptor.metadata,
        record: descriptor.record,
    });
}

function validateAudioLibraryRegistration(options)
{
    if (Object.hasOwn(options, "source")
        && Object.hasOwn(options, "resourceSource")
        && options.source !== options.resourceSource)
    {
        throw new TypeError(
            "CjsAudioLibrary source and resourceSource must not conflict",
        );
    }

    requireExclusiveRegistration(options, [
        "library",
        "document",
        "libraryResFilePath",
    ], "prebuilt library");
    requireExclusiveRegistration(options, [
        "soundBank",
        "soundBankResPath",
    ], "sound-bank source");
    requireExclusiveRegistration(options, [
        "enrich",
        "enrichResPath",
    ], "enrichment source");

    const hasLibrary = [
        "library",
        "document",
        "libraryResFilePath",
    ].some(key => hasRegistrationValue(options, key));
    const hasSoundBank = [
        "soundBank",
        "soundBankResPath",
    ].some(key => hasRegistrationValue(options, key));

    if (hasLibrary && hasSoundBank)
    {
        throw new TypeError(
            "CjsAudioLibrary requires either a prebuilt library or sound-bank source",
        );
    }

    for (const key of [ "library", "document", "soundBank", "enrich" ])
    {
        if (!hasRegistrationValue(options, key))
        {
            continue;
        }
        if (!options[key]
            || typeof options[key] !== "object"
            || Array.isArray(options[key]))
        {
            throw new TypeError(
                `CjsAudioLibrary ${key} must be a JavaScript object`,
            );
        }
    }

    for (const key of [
        "libraryResFilePath",
        "soundBankResPath",
        "enrichResPath",
    ])
    {
        if (hasRegistrationValue(options, key))
        {
            normalizeAudioPath(options[key]);
        }
    }

    for (const key of [ "buildOptions", "resManOptions", "requestInit" ])
    {
        if (Object.hasOwn(options, key)
            && (!options[key]
                || typeof options[key] !== "object"
                || Array.isArray(options[key])))
        {
            throw new TypeError(
                `CjsAudioLibrary ${key} must be an object`,
            );
        }
    }

    if (options.buildOptions)
    {
        for (const key of [
            "enrichment",
            "indexEntries",
            "metadata",
            "soundbanksInfo",
        ])
        {
            if (Object.hasOwn(options.buildOptions, key))
            {
                throw new TypeError(
                    `CjsAudioLibrary buildOptions must not define ${key}`,
                );
            }
        }
    }

    for (const key of [
        "audioApiResPathSupportsIndividualFiles",
        "audioApiResPathSupportsOffset",
    ])
    {
        if (Object.hasOwn(options, key)
            && typeof options[key] !== "boolean")
        {
            throw new TypeError(
                `CjsAudioLibrary ${key} must be boolean`,
            );
        }
    }

    const apiBase = normalizeAudioApiBase(options.audioApiResPath);

    if (!apiBase
        && (options.audioApiResPathSupportsIndividualFiles
            || options.audioApiResPathSupportsOffset))
    {
        throw new TypeError(
            "CjsAudioLibrary audio API capabilities require audioApiResPath",
        );
    }
}

function requireExclusiveRegistration(options, keys, label)
{
    const supplied = keys.filter(key => hasRegistrationValue(options, key));

    if (supplied.length > 1)
    {
        throw new TypeError(
            `CjsAudioLibrary ${label} options conflict: ${supplied.join(", ")}`,
        );
    }
}

function hasRegistrationValue(options, key)
{
    return Object.hasOwn(options, key)
        && options[key] !== null
        && options[key] !== undefined;
}

function isBuilderOptions(value)
{
    return Boolean(
        value
        && typeof value === "object"
        && !Array.isArray(value)
        && !isDocument(value)
        && ("metadata" in value
            || "soundbanksInfo" in value
            || "indexEntries" in value),
    );
}

function hasBankLoader(options)
{
    return typeof options.loadBank === "function"
        || options.bankProvider
        || options.bankData;
}

function isAudioSource(value)
{
    return Boolean(
        value
        && (typeof value === "object" || typeof value === "function")
        && (typeof value.Read === "function"
            || typeof value.ReadAudio === "function"
            || typeof value.FetchAudio === "function"
            || typeof value.ReadRange === "function"),
    );
}

function sourceRequiresUrl(source)
{
    return source?.requiresUrl === true
        || source?.constructor?.requiresUrl === true;
}

function readRawAudioBytes(value)
{
    return value;
}

function sourceRecordPath(record, label)
{
    const path = record.path ?? record.logicalPath ?? record.resPath;

    if (path === undefined || path === null || String(path).trim() === "")
    {
        throw new TypeError(`${label} must provide path, logicalPath, or resPath`);
    }

    return path;
}

function expandMediaRecords(value)
{
    if (Array.isArray(value))
    {
        return value;
    }
    if (value
        && typeof value === "object"
        && !Array.isArray(value)
        && Array.isArray(value.sources))
    {
        return value.sources;
    }

    return [ value ];
}

function normalizeMediaID(value)
{
    const mediaID = String(value ?? "").trim();

    if (!/^[1-9]\d*$/u.test(mediaID))
    {
        throw new TypeError(
            `Audio media ID must be a canonical positive decimal: ${value}`,
        );
    }

    return mediaID;
}

function normalizeAudioPath(value)
{
    const path = String(value ?? "")
        .trim()
        .replaceAll("\\", "/");

    if (!path || path.includes("\0"))
    {
        throw new TypeError("Audio path must be non-empty");
    }

    const segments = path.split("/");

    if (segments.some(segment => segment === "." || segment === ".."))
    {
        throw new TypeError(`Audio path contains traversal: ${value}`);
    }

    return Object.freeze({
        path,
        key: path.toLowerCase(),
    });
}

function normalizeMediaType(value, path = "")
{
    const aliases = {
        bnk: "audio/x-wwise-bank",
        flac: "audio/flac",
        midi: "audio/midi",
        mp3: "audio/mpeg",
        ogg: "audio/ogg",
        wav: "audio/wav",
        wem: "audio/x-wem",
        plugin: OPAQUE_MEDIA_TYPE,
        unknown: OPAQUE_MEDIA_TYPE,
    };
    const extension = pathExtension(path);
    const input = String(value ?? aliases[extension] ?? OPAQUE_MEDIA_TYPE)
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
    const mediaType = aliases[input] ?? input;

    if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/u.test(mediaType))
    {
        throw new TypeError(`Invalid audio media type: ${value}`);
    }

    return mediaType;
}

function normalizeMediaTypes(values)
{
    if (!Array.isArray(values))
    {
        throw new TypeError("Audio mediaTypes must be an array");
    }

    return values.map(value =>
    {
        const mediaType = String(value ?? "").trim().toLowerCase();

        if (!/^(?:\*\/\*|[a-z0-9!#$&^_.+-]+\/(?:\*|[a-z0-9!#$&^_.+-]+))$/u
            .test(mediaType))
        {
            throw new TypeError(
                `Invalid accepted audio media type: ${value}`,
            );
        }

        return mediaType;
    });
}

function mediaTypeRank(mediaType, accepted)
{
    if (!accepted.length)
    {
        return 0;
    }

    for (let index = 0; index < accepted.length; index++)
    {
        const candidate = accepted[index];
        const [ candidateType ] = candidate.split("/");

        if (candidate === "*/*"
            || candidate === mediaType
            || (candidate.endsWith("/*")
                && mediaType.startsWith(`${candidateType}/`)))
        {
            return index;
        }
    }

    return Number.POSITIVE_INFINITY;
}

function normalizeLanguages(values)
{
    if (!Array.isArray(values))
    {
        throw new TypeError("Audio languages must be an array");
    }

    return values.map(value =>
    {
        const language = normalizeLanguage(value);

        if (language !== "*"
            && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(language))
        {
            throw new TypeError(
                `Invalid accepted audio language: ${value}`,
            );
        }

        return language;
    });
}

function languageRank(language, accepted, defaultLanguage)
{
    if (accepted.length)
    {
        for (let index = 0; index < accepted.length; index++)
        {
            if (languageMatches(language, accepted[index]))
            {
                return index;
            }
        }

        return language ? Number.POSITIVE_INFINITY : accepted.length;
    }
    if (defaultLanguage)
    {
        if (languageMatches(language, defaultLanguage))
        {
            return 0;
        }

        return language ? 2 : 1;
    }

    return 0;
}

function languageMatches(language, accepted)
{
    if (accepted === "*")
    {
        return true;
    }

    return language === accepted
        || language.startsWith(`${accepted}-`)
        || accepted.startsWith(`${language}-`);
}

function mediaExtension(descriptor)
{
    const mediaType = descriptor.mediaType;
    const extensions = {
        "audio/flac": "flac",
        "audio/midi": "midi",
        "audio/mpeg": "mp3",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/x-wem": "wem",
        "audio/x-wwise-bank": "bnk",
    };

    return extensions[mediaType]
        ?? pathExtension(descriptor.resourcePath)
        ?? pathExtension(descriptor.physicalPath)
        ?? "wem";
}

function pathExtension(path)
{
    const match = /\.([a-z0-9]+)(?:[?#].*)?$/iu.exec(String(path ?? ""));

    return match?.[1]?.toLowerCase() ?? "";
}

function normalizeChecksum(record)
{
    return String(record.checksum ?? record.md5 ?? "")
        .trim()
        .toLowerCase();
}

function isPrepared(record)
{
    const kind = String(record.sourceKind ?? record.kind ?? "")
        .trim()
        .toLowerCase();

    return record.prepared === true
        || kind === "converted"
        || kind === "prepared";
}

function optionalByteLength(value)
{
    if (value === undefined || value === null || value === "")
    {
        return null;
    }

    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0)
    {
        throw new TypeError(
            "Audio source byteLength must be a non-negative integer",
        );
    }

    return number;
}

function normalizeDocument(value)
{
    validateDocument(value);
    return cloneJSONValue(value, "audio library");
}

function validateDocument(value)
{
    requireRecord(value, "Audio library");

    if (value.schema !== AUDIO_LIBRARY_SCHEMA)
    {
        throw new TypeError(
            `Unsupported audio-library schema: ${value.schema}`,
        );
    }

    if (!AUDIO_LIBRARY_VERSIONS.has(value.schemaVersion))
    {
        throw new TypeError(
            `Unsupported audio-library schema version: ${value.schemaVersion}`,
        );
    }

    const metadata = requireRecord(value.metadata, "Audio library metadata");

    requireRecord(metadata.Events, "Audio library metadata.Events");
    requireRecord(metadata.SoundBanks, "Audio library metadata.SoundBanks");
    requireRecord(metadata.WemFileIDs, "Audio library metadata.WemFileIDs");
    requireRecord(value.media, "Audio library media");
    requireRecord(value.banks, "Audio library banks");

    if (value.schemaVersion === 2)
    {
        validateBanks(value.banks);
        validateEmbeddedMedia(value.embeddedMedia, value.banks);
        validateEventMedia(
            value.eventMedia,
            value.eventMediaLanguage,
            value.media,
            value.embeddedMedia ?? {},
        );
        validateMusic(
            value.music,
            value.media,
            value.embeddedMedia ?? {},
        );
    }
}

function validateBanks(banks)
{
    for (const [ sourceID, bank ] of Object.entries(banks))
    {
        requireRecord(bank, `Audio library bank ${sourceID}`);

        const bankID = normalizeUnsignedID(
            bank.bankID,
            `Audio library bank ${sourceID} bankID`,
        );

        const languageID = normalizeUnsignedID(
            bank.languageID,
            `Audio library bank ${sourceID} languageID`,
        );

        const expected = `${bankID}:${languageID}`;

        if (sourceID !== expected || String(bank.sourceID ?? "") !== expected)
        {
            throw new TypeError(
                `Audio library bank identity must be ${expected}: ${sourceID}`,
            );
        }
    }
}

function validateEmbeddedMedia(embeddedMedia, banks)
{
    if (embeddedMedia === undefined)
    {
        return;
    }

    requireRecord(embeddedMedia, "Audio library embeddedMedia");

    for (const [ mediaID, value ] of Object.entries(embeddedMedia))
    {
        normalizePositiveID(
            mediaID,
            `Audio library embedded media ${mediaID}`,
        );

        const records = Array.isArray(value) ? value : [ value ];

        if (!records.length)
        {
            throw new TypeError(
                `Audio library embedded media ${mediaID} has no sources`,
            );
        }

        for (const record of records)
        {
            requireRecord(
                record,
                `Audio library embedded media ${mediaID}`,
            );

            if (!banks[String(record.bank ?? "")])
            {
                throw new TypeError(
                    `Audio library embedded media ${mediaID} references unknown bank ${record.bank}`,
                );
            }

            normalizeNonNegativeInteger(
                record.offset,
                `Audio library embedded media ${mediaID} offset`,
            );
            normalizePositiveInteger(
                record.byteLength,
                `Audio library embedded media ${mediaID} byteLength`,
            );
        }
    }
}

function validateEventMedia(eventMedia, language, media, embeddedMedia)
{
    if (eventMedia === undefined)
    {
        return;
    }

    requireRecord(eventMedia, "Audio library eventMedia");
    normalizeLanguage(language ?? "");

    for (const [ eventName, values ] of Object.entries(eventMedia))
    {
        if (!Array.isArray(values))
        {
            throw new TypeError(
                `Audio library eventMedia.${eventName} must be an array`,
            );
        }

        const ids = values.map(value => normalizePositiveID(
            value,
            `Audio library eventMedia.${eventName}`,
        ));

        if (new Set(ids).size !== ids.length)
        {
            throw new TypeError(
                `Audio library eventMedia.${eventName} has duplicate sources`,
            );
        }

        for (const id of ids)
        {
            if (!media[id] && !embeddedMedia[id])
            {
                throw new TypeError(
                    `Audio library eventMedia.${eventName} references missing source ${id}`,
                );
            }
        }
    }
}

function validateMusic(music, media, embeddedMedia)
{
    if (music === undefined)
    {
        return;
    }

    requireRecord(music, "Audio library music");

    if (music.schemaVersion !== 1)
    {
        throw new TypeError(
            `Unsupported audio music schema version: ${music.schemaVersion}`,
        );
    }

    if (!Array.isArray(music.banks))
    {
        throw new TypeError("Audio library music banks must be an array");
    }

    const nodes = requireRecord(
        music.nodes,
        "Audio library music nodes",
    );
    const bankNames = music.banks.map(normalizeBankName);

    if (new Set(bankNames).size !== bankNames.length)
    {
        throw new TypeError("Audio library music banks must be unique");
    }

    for (const [ id, node ] of Object.entries(nodes))
    {
        normalizePositiveID(id, `Audio library music node ${id}`);
        requireRecord(node, `Audio library music node ${id}`);

        if (!bankNames.includes(normalizeBankName(node.bank)))
        {
            throw new TypeError(
                `Audio library music node ${id} references unknown bank ${node.bank}`,
            );
        }

        for (const childID of node.children ?? [])
        {
            if (!nodes[normalizePositiveID(
                childID,
                `Audio library music node ${id} child`,
            )])
            {
                throw new TypeError(
                    `Audio library music node ${id} references missing child ${childID}`,
                );
            }
        }

        if (node.type === "music-track")
        {
            for (const source of node.sources ?? [])
            {
                const sourceID = normalizePositiveID(
                    source.sourceId,
                    `Audio library music track ${id} source`,
                );

                if (!media[sourceID] && !embeddedMedia[sourceID])
                {
                    throw new TypeError(
                        `Audio library music track ${id} references missing source ${sourceID}`,
                    );
                }
            }
        }
    }

    for (const field of [ "eventTargets", "eventStops" ])
    {
        const table = requireRecord(
            music[field],
            `Audio library music ${field}`,
        );

        for (const [ name, values ] of Object.entries(table))
        {
            if (!Array.isArray(values))
            {
                throw new TypeError(
                    `Audio library music ${field}.${name} must be an array`,
                );
            }

            for (const value of values)
            {
                const id = normalizePositiveID(
                    value,
                    `Audio library music ${field}.${name}`,
                );

                if (!nodes[id])
                {
                    throw new TypeError(
                        `Audio library music ${field}.${name} references missing node ${id}`,
                    );
                }
            }
        }
    }

    requireRecord(
        music.switchSetters,
        "Audio library music switchSetters",
    );
}

async function readResponseJSON(response, source = null)
{
    if (!isResponseLike(response))
    {
        throw new TypeError(
            "Audio-library fetch must return a Response-like value",
        );
    }

    if (response.ok === false)
    {
        const sourceURL = response.url || String(source ?? "");
        throw new CjsError(
            "CJS_AUDIO_LIBRARY_HTTP_ERROR",
            `Unable to load audio library ${sourceURL}: HTTP ${response.status ?? "error"}`,
            {
                details: {
                    sourceURL,
                    status: response.status ?? null,
                },
            },
        );
    }

    try
    {
        return typeof response.json === "function"
            ? await response.json()
            : parseJSON(await response.text());
    }
    catch (cause)
    {
        throw new SyntaxError("Unable to parse audio-library JSON", {
            cause,
        });
    }
}

function isResponseLike(value)
{
    return Boolean(
        value
        && typeof value === "object"
        && (typeof value.json === "function"
            || typeof value.text === "function")
        && ("ok" in value || "status" in value || "url" in value),
    );
}

function isDocument(value)
{
    return Boolean(
        value
        && typeof value === "object"
        && !Array.isArray(value)
        && value.schema === AUDIO_LIBRARY_SCHEMA,
    );
}

function parseJSONResourceValue(value, label)
{
    const input = value
        && typeof value === "object"
        && "bytes" in value
        && (value.bytes instanceof ArrayBuffer
            || ArrayBuffer.isView(value.bytes))
        ? value.bytes
        : value;

    if (input
        && typeof input === "object"
        && !ArrayBuffer.isView(input)
        && !(input instanceof ArrayBuffer))
    {
        return input;
    }

    try
    {
        return decodeJson(input);
    }
    catch (cause)
    {
        throw new SyntaxError(`Unable to parse ${label} JSON`, {
            cause,
        });
    }
}

function parseJSON(value)
{
    try
    {
        return JSON.parse(String(value));
    }
    catch (cause)
    {
        throw new SyntaxError("Unable to parse audio-library JSON", {
            cause,
        });
    }
}

function requireRecord(value, label)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be an object`);
    }

    return value;
}

function normalizeUnsignedID(value, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0 || number > 0xffffffff)
    {
        throw new TypeError(`${label} must be an unsigned 32-bit integer`);
    }

    return String(number >>> 0);
}

function normalizePositiveID(value, label)
{
    const id = normalizeUnsignedID(value, label);

    if (id === "0")
    {
        throw new TypeError(`${label} must be greater than zero`);
    }

    return id;
}

function normalizeNonNegativeInteger(value, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0)
    {
        throw new TypeError(`${label} must be a non-negative integer`);
    }

    return number;
}

function normalizePositiveInteger(value, label)
{
    const number = normalizeNonNegativeInteger(value, label);

    if (number === 0)
    {
        throw new TypeError(`${label} must be greater than zero`);
    }

    return number;
}

function normalizeLanguage(value)
{
    const language = String(value ?? "")
        .trim()
        .replaceAll("_", "-")
        .toLowerCase();

    if (language
        && !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(language))
    {
        throw new TypeError(`Invalid audio language tag: ${value}`);
    }

    return language;
}

function normalizeBankName(value)
{
    const name = String(value ?? "")
        .trim()
        .replaceAll("\\", "/")
        .split("/")
        .pop()
        .toLowerCase();

    if (!name)
    {
        throw new TypeError("Audio library bank name is required");
    }

    return name;
}

function cloneJSONValue(value, label)
{
    if (value === null
        || typeof value === "string"
        || typeof value === "boolean")
    {
        return value;
    }
    if (typeof value === "number")
    {
        if (!Number.isFinite(value))
        {
            throw new TypeError(`${label} contains a non-finite number`);
        }

        return value;
    }
    if (Array.isArray(value))
    {
        return Object.freeze(value.map((entry, index) =>
            cloneJSONValue(entry, `${label}[${index}]`)));
    }
    if (!value || typeof value !== "object")
    {
        throw new TypeError(`${label} contains a non-JSON value`);
    }

    const result = {};

    for (const key of Object.keys(value))
    {
        result[key] = cloneJSONValue(value[key], `${label}.${key}`);
    }

    return Object.freeze(result);
}
