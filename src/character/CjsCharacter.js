import { CjsEventEmitter } from "#model";
import { CjsCharacterDiagnostics } from "./CjsCharacterDiagnostics.js";

/** Owns one selected paper doll and its current resolved appearance state. */
export class CjsCharacter extends CjsEventEmitter
{
    #appearanceManager;

    #appearanceResolver;

    #construction = null;

    #constructionResolver;

    #libraryManager;

    #paperdoll = null;

    #plan = null;

    #revision = 0;

    /** Creates a character state coordinator around injected neutral services. */
    constructor({
        libraryManager,
        appearanceResolver,
        constructionResolver,
        appearanceManager = null
    } = {})
    {
        super();

        if (!libraryManager
            || typeof libraryManager.GetLibrary !== "function"
            || typeof libraryManager.Get !== "function")
        {
            throw new TypeError("CjsCharacter requires a character library manager");
        }
        if (typeof appearanceResolver?.resolvePaperdoll !== "function")
        {
            throw new TypeError("CjsCharacter requires a paper-doll appearance resolver");
        }
        if (typeof constructionResolver?.Resolve !== "function")
        {
            throw new TypeError("CjsCharacter requires a construction resolver");
        }
        if (appearanceManager !== null
            && typeof appearanceManager?.ApplyConstruction !== "function")
        {
            throw new TypeError(
                "CjsCharacter appearance manager must expose ApplyConstruction(sequence)"
            );
        }

        this.#libraryManager = libraryManager;
        this.#appearanceResolver = appearanceResolver;
        this.#constructionResolver = constructionResolver;
        this.#appearanceManager = appearanceManager;
    }

    /** Returns the installed character-library manager. */
    GetLibraryManager()
    {
        return this.#libraryManager;
    }

    /** Returns the selectable paper-doll records from the installed library. */
    GetPaperdolls()
    {
        return this.#libraryManager.GetDocument("paperdolls") ?? [];
    }

    /** Returns the selected paper doll, if any. */
    GetPaperdoll()
    {
        return this.#paperdoll;
    }

    /** Returns the current neutral appearance plan, if any. */
    GetAppearancePlan()
    {
        return this.#plan;
    }

    /** Returns the current renderer-neutral construction sequence, if any. */
    GetConstructionSequence()
    {
        return this.#construction;
    }

    /** Returns the optional realization lifecycle manager. */
    GetAppearanceManager()
    {
        return this.#appearanceManager;
    }

    /** Returns the monotonically increasing selected-appearance revision. */
    GetRevision()
    {
        return this.#revision;
    }

    /** Resolves one library-owned paper doll into the current plan and construction state. */
    SelectPaperdoll(recordID)
    {
        const identity = String(recordID ?? "").trim();
        if (!identity)
        {
            throw new TypeError("Paper-doll record ID must be a non-empty string");
        }

        const paperdoll = this.#libraryManager.Get("paperdolls", identity);
        if (!paperdoll)
        {
            throw new Error(`Unknown paper-doll record ${JSON.stringify(identity)}`);
        }

        const library = this.#libraryManager.GetLibrary();
        const plan = this.#appearanceResolver.resolvePaperdoll(library, paperdoll, {
            requestedLod: 0
        });
        const construction = this.#constructionResolver.Resolve(paperdoll, plan, library);

        this.#paperdoll = paperdoll;
        this.#plan = plan;
        this.#construction = construction;
        this.#revision += 1;
        this.EmitEvent("appearancechanged", {
            type: "appearancechanged",
            source: this,
            revision: this.#revision
        });
        return plan;
    }

    /** Applies the current construction through the injected lifecycle manager. */
    ApplyAppearance(options = {})
    {
        if (!this.#plan || !this.#construction)
        {
            return Promise.reject(
                new Error("Character has no resolved appearance and construction state")
            );
        }
        if (!this.#appearanceManager)
        {
            return Promise.resolve({
                status: "deferred",
                reason: "appearance-manager-not-configured"
            });
        }

        return this.#appearanceManager.ApplyConstruction(this.#construction, {
            appearancePlan: this.#plan,
            source: options.source ?? this,
            invalidateDomains: options.invalidateDomains ?? []
        });
    }

    /** Returns detached diagnostics for the current character state. */
    GetDiagnostics()
    {
        return CjsCharacterDiagnostics.create(this);
    }
}

export default CjsCharacter;
