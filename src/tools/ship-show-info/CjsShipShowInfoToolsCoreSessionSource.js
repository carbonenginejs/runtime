const EVE_IMAGE_SERVER = "https://images.evetech.net";

/** Reads the single tools-core operator grant through the Show Info session contract. */
export class CjsShipShowInfoToolsCoreSessionSource
{

    /**
     * Creates a ship-detail ship show info tools core session source around
     * caller-supplied browser collaborators.
     */
    constructor({ baseURL = "", fetchImpl = globalThis.fetch } = {})
    {
        if (typeof fetchImpl !== "function")
        {
            throw new TypeError("CjsShipShowInfoToolsCoreSessionSource requires fetch");
        }

        this.baseURL = String(baseURL).replace(/\/+$/u, "");
        this.fetchImpl = fetchImpl.bind(globalThis);
    }

    /** Returns the identity attached to the stored tools-core grant. */
    async FetchViewer({ signal = null } = {})
    {
        const record = await this.#FetchJson("/v1/auth/esi/status", { signal });

        if (!record?.authenticated) return { authenticated: false };

        const characterID = PositiveID(record.characterID ?? record.characterId);

        if (!characterID)
        {
            throw new Error("tools-core returned an authenticated grant without a character ID");
        }

        return {
            authenticated: true,
            characterID,
            name: String(record.name || record.characterName || `Character ${characterID}`),
            iconURL: `${EVE_IMAGE_SERVER}/characters/${characterID}/portrait?size=128`
        };
    }

    /** Returns trained skills for the character attached to the stored grant. */
    FetchSkills({ signal = null } = {})
    {
        return this.#FetchJson("/v1/auth/esi/skills", { signal });
    }

    /** Returns the browser navigation URL that starts or refreshes the ESI grant. */
    LoginURL()
    {
        return `${this.baseURL}/v1/auth/esi/login`;
    }

    /** Loads normalized json data from the configured ship-detail source. */
    async #FetchJson(path, { signal } = {})
    {
        const response = await this.fetchImpl(`${this.baseURL}${path}`, {
            headers: { accept: "application/json" },
            signal
        });

        if (!response.ok)
        {
            let details = null;

            try { details = await response.json(); }
            catch { /* HTTP status remains authoritative for non-JSON failures. */ }

            const error = new Error(details?.error || `tools-core request failed (${response.status})`);

            error.statusCode = response.status;
            if (details?.scope) error.scope = String(details.scope);
            throw error;
        }
        return response.json();
    }

}

function PositiveID(value)
{
    const id = Number(value);

    return /^\d+$/u.test(String(value ?? "")) && Number.isSafeInteger(id) && id > 0 ? id : null;
}
