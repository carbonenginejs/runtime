/** Adds the current external session identity to a provider-neutral Show Info source. */
export class CjsESIShipShowInfoSessionSource
{
    #identityPromise = null;

    /**
     * Creates a ship-detail esi ship show info session source around
     * caller-supplied browser collaborators.
     */
    constructor({ shipSource, sessionSource } = {})
    {
        if (!shipSource || typeof shipSource.FetchShip !== "function")
        {
            throw new TypeError("CjsESIShipShowInfoSessionSource requires a ship source");
        }
        if (!sessionSource || typeof sessionSource.FetchViewer !== "function")
        {
            throw new TypeError("CjsESIShipShowInfoSessionSource requires a session source");
        }

        this.shipSource = shipSource;
        this.sessionSource = sessionSource;
    }

    /** Loads normalized ship data from the configured ship-detail source. */
    async FetchShip(request = {})
    {
        const identity = await this.#FetchIdentity();
        const ship = await this.#Fetch("FetchShip", request, identity);

        ship.viewerState = { status: identity.status };
        if (identity.status === "authenticated")
        {
            ship.viewer = Viewer(identity);
        }
        else
        {
            delete ship.viewer;
        }
        return ship;
    }

    /** Loads normalized overview data from the configured ship-detail source. */
    async FetchOverview(request = {})
    {
        return this.#FetchPanel("FetchOverview", request);
    }

    /** Loads normalized price data from the configured ship-detail source. */
    async FetchPrice(request = {})
    {
        if (typeof this.shipSource.FetchPrice !== "function") return null;

        return this.#FetchPanel("FetchPrice", request);
    }

    /** Loads normalized attributes data from the configured ship-detail source. */
    async FetchAttributes(request = {})
    {
        return this.#FetchPanel("FetchAttributes", request);
    }

    /** Loads normalized fitting data from the configured ship-detail source. */
    async FetchFitting(request = {})
    {
        return this.#FetchPanel("FetchFitting", request);
    }

    /** Loads normalized skills data from the configured ship-detail source. */
    async FetchSkills(request = {})
    {
        const identity = await this.#FetchIdentity();
        let skillProfile = null;
        let skillProfileState;

        if (identity.status !== "authenticated")
        {
            skillProfileState = ProfileState(identity.status, this.sessionSource, {
                message: identity.message || "Sign in to compare these requirements with a character."
            });
        }
        else if (typeof this.sessionSource.FetchSkills !== "function")
        {
            skillProfileState = ProfileState("unsupported", this.sessionSource, {
                message: "Character skills are not available from this session provider."
            });
        }
        else
        {
            try
            {
                const record = await this.sessionSource.FetchSkills({ signal: request.signal });

                skillProfile = AutomaticSkillProfile(record, identity);
                skillProfileState = skillProfile
                    ? { status: "available", mode: "automatic", characterID: identity.characterID }
                    : ProfileState("unavailable", this.sessionSource, {
                        message: "The skills response does not belong to the authenticated character."
                    });
            }
            catch (error)
            {
                if (request.signal?.aborted || error?.name === "AbortError") throw error;
                skillProfileState = ProfileState(
                    error?.statusCode === 403 ? "reauthorization-required" : "unavailable",
                    this.sessionSource,
                    {
                        message: String(error?.message || "Character skills are unavailable."),
                        scope: error?.scope ? String(error.scope) : null,
                        statusCode: Number(error?.statusCode) || null
                    }
                );
            }
        }

        const nextRequest = Object.assign({}, request, { skillProfile, skillProfileState });
        const result = await this.#Fetch("FetchSkills", nextRequest, identity);

        if (result && typeof result === "object" && !result.profileState)
        {
            result.profileState = skillProfileState;
        }
        return result;
    }

    /** Loads normalized variations data from the configured ship-detail source. */
    async FetchVariations(request = {})
    {
        return this.#FetchPanel("FetchVariations", request);
    }

    /** Loads normalized industry data from the configured ship-detail source. */
    async FetchIndustry(request = {})
    {
        return this.#FetchPanel("FetchIndustry", request);
    }

    /** Loads normalized skins data from the configured ship-detail source. */
    async FetchSkins(request = {})
    {
        return this.#FetchPanel("FetchSkins", request);
    }

    /** Re-reads the session after an in-page login or logout. */
    async RefreshIdentity()
    {
        this.#identityPromise = null;
        return this.#FetchIdentity();
    }

    /** Loads normalized panel data from the configured ship-detail source. */
    async #FetchPanel(method, request)
    {
        const identity = await this.#FetchIdentity();

        return this.#Fetch(method, request, identity);
    }

    /** Loads normalized fetch data from the configured ship-detail source. */
    #Fetch(method, request, identity)
    {
        const loader = this.shipSource[method];

        if (typeof loader !== "function") throw new Error(`Ship source does not implement ${method}`);

        const nextRequest = Object.assign({}, request, {
            characterID: identity.status === "authenticated" ? identity.characterID : null
        });

        return loader.call(this.shipSource, nextRequest);
    }

    /** Loads normalized identity data from the configured ship-detail source. */
    #FetchIdentity()
    {
        if (!this.#identityPromise) this.#identityPromise = this.#ReadIdentity();
        return this.#identityPromise;
    }

    /** Reads identity identity from the supplied response metadata. */
    async #ReadIdentity()
    {
        try
        {
            const record = await this.sessionSource.FetchViewer();

            if (!record?.authenticated) return { status: "anonymous" };

            const characterID = PositiveID(record.characterID ?? record.characterId);

            if (!characterID) return { status: "unavailable" };

            return {
                status: "authenticated",
                characterID,
                name: String(record.name || `Character ${characterID}`),
                corporationID: PositiveID(record.corporationID ?? record.corporationId),
                corporationName: record.corporationName ? String(record.corporationName) : null,
                iconURL: record.iconURL ? String(record.iconURL) : null
            };
        }
        catch (error)
        {
            return {
                status: "unavailable",
                message: String(error?.message || "Session identity is unavailable")
            };
        }
    }
}

function Viewer(identity)
{
    const viewer = {
        characterID: identity.characterID,
        name: identity.name
    };

    if (identity.corporationID) viewer.corporationID = identity.corporationID;
    if (identity.corporationName) viewer.corporationName = identity.corporationName;
    if (identity.iconURL) viewer.iconURL = identity.iconURL;
    return viewer;
}

function AutomaticSkillProfile(record, identity)
{
    const characterID = PositiveID(record?.characterID ?? record?.characterId);

    if (!characterID || characterID !== identity.characterID || !Array.isArray(record?.skills)) return null;

    const skills = [];
    for (const item of record.skills)
    {
        const typeID = PositiveID(item?.typeID);

        if (!typeID) continue;
        skills.push({
            typeID,
            activeSkillLevel: SkillLevel(item.activeSkillLevel),
            trainedSkillLevel: SkillLevel(item.trainedSkillLevel),
            skillPoints: NonNegativeNumber(item.skillPoints)
        });
    }
    const profile = {
        mode: "automatic",
        characterID,
        characterName: record.characterName ? String(record.characterName) : identity.name,
        totalSkillPoints: NonNegativeNumber(record.totalSkillPoints),
        unallocatedSkillPoints: NonNegativeNumber(record.unallocatedSkillPoints),
        skills
    };
    const attributes = CharacterAttributes(record.attributes);

    if (attributes) profile.attributes = attributes;
    return profile;
}

function ProfileState(status, sessionSource, details = {})
{
    const state = { status };

    if (details.message) state.message = details.message;
    if (details.scope) state.scope = details.scope;
    if (details.statusCode) state.statusCode = details.statusCode;
    if ([ "anonymous", "reauthorization-required" ].includes(status)
        && typeof sessionSource?.LoginURL === "function")
    {
        state.actionURL = sessionSource.LoginURL();
    }
    return state;
}

function SkillLevel(value)
{
    const level = Math.round(Number(value));

    return Number.isFinite(level) ? Math.max(0, Math.min(5, level)) : 0;
}

function CharacterAttributes(record)
{
    const result = {};

    for (const name of [ "charisma", "intelligence", "memory", "perception", "willpower" ])
    {
        const value = Number(record?.[name]);

        if (!Number.isFinite(value) || value <= 0) return null;
        result[name] = value;
    }
    return result;
}

function NonNegativeNumber(value)
{
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);

    return Number.isFinite(number) && number >= 0 ? number : null;
}

function PositiveID(value)
{
    const id = Number(value);

    return /^\d+$/.test(String(value ?? "")) && Number.isSafeInteger(id) && id > 0 ? id : null;
}
