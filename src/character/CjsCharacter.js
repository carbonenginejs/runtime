import { compose } from "#schema";
import { CjsCharacterDiagnostics } from "./CjsCharacterDiagnostics.js";

/** Owns one selected paper doll and its current resolved appearance state. */
// The first composed emitter (the @compose.notify spike, design record items
// 9/11): the notify surface arrives by decorator, and the inheritance slot
// stays free - this class never needed a base for anything else.
@compose.notify
export class CjsCharacter
{
    _appearanceManager;

    _appearanceResolver;

    _construction = null;

    _constructionResolver;

    _libraryManager;

    _paperdoll = null;

    _plan = null;

    _revision = 0;

    /** Creates a character state coordinator around injected neutral services. */
    constructor({
        libraryManager,
        appearanceResolver,
        constructionResolver,
        appearanceManager = null
    } = {})
    {
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

        this._libraryManager = libraryManager;
        this._appearanceResolver = appearanceResolver;
        this._constructionResolver = constructionResolver;
        this._appearanceManager = appearanceManager;
    }

    /** Returns the installed character-library manager. */
    GetLibraryManager()
    {
        return this._libraryManager;
    }

    /** Returns the selectable paper-doll records from the installed library. */
    GetPaperdolls()
    {
        return this._libraryManager.GetDocument("paperdolls") ?? [];
    }

    /** Returns the selected paper doll, if any. */
    GetPaperdoll()
    {
        return this._paperdoll;
    }

    /** Returns the current neutral appearance plan, if any. */
    GetAppearancePlan()
    {
        return this._plan;
    }

    /** Returns the current renderer-neutral construction sequence, if any. */
    GetConstructionSequence()
    {
        return this._construction;
    }

    /** Returns the optional realization lifecycle manager. */
    GetAppearanceManager()
    {
        return this._appearanceManager;
    }

    /** Returns the monotonically increasing selected-appearance revision. */
    GetRevision()
    {
        return this._revision;
    }

    /** Resolves one library-owned paper doll into the current plan and construction state. */
    SelectPaperdoll(recordID)
    {
        const identity = String(recordID ?? "").trim();
        if (!identity)
        {
            throw new TypeError("Paper-doll record ID must be a non-empty string");
        }

        const paperdoll = this._libraryManager.Get("paperdolls", identity);
        if (!paperdoll)
        {
            throw new Error(`Unknown paper-doll record ${JSON.stringify(identity)}`);
        }

        const library = this._libraryManager.GetLibrary();
        const plan = this._appearanceResolver.resolvePaperdoll(library, paperdoll, {
            requestedLod: 0
        });
        const construction = this._constructionResolver.Resolve(paperdoll, plan, library);

        this._paperdoll = paperdoll;
        this._plan = plan;
        this._construction = construction;
        this._revision += 1;
        this.EmitEvent("appearancechanged", {
            type: "appearancechanged",
            source: this,
            revision: this._revision
        });
        return plan;
    }

    /** Applies the current construction through the injected lifecycle manager. */
    ApplyAppearance(options = {})
    {
        if (!this._plan || !this._construction)
        {
            return Promise.reject(
                new Error("Character has no resolved appearance and construction state")
            );
        }
        if (!this._appearanceManager)
        {
            return Promise.resolve({
                status: "deferred",
                reason: "appearance-manager-not-configured"
            });
        }

        return this._appearanceManager.ApplyConstruction(this._construction, {
            appearancePlan: this._plan,
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
