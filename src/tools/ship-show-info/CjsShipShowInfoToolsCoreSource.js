const EVE_IMAGE_SERVER = "https://images.evetech.net";

const DEFAULT_TOOLS_CORE_URL = "";
const UI_ROOT = "/eve/latest/resources/ui/texture/";
const SHIP_CATEGORY_ID = 6;
const ATTRIBUTE_GROUP_ICONS = {
    Shield: UiResource("eveicon/category_icons/shields_16px.png"),
    Armor: UiResource("eveicon/category_icons/armor_16px.png"),
    Structure: UiResource("eveicon/system_icons/structure_16px.png"),
    Capacitor: UiResource("eveicon/system_icons/capacitor_plus_16px.png"),
    Navigation: UiResource("eveicon/category_icons/navigation_16px.png"),
    Targeting: UiResource("eveicon/category_icons/targeting_16px.png"),
    Drones: UiResource("eveicon/category_icons/drones_16px.png"),
    Inventory: UiResource("eveicon/system_icons/inventory_16px.png")
};
const ATTRIBUTE_ROW_ICONS = {
    "Shield Capacity": UiResource("classes/fitting/statsicons/shieldhp.png"),
    "Shield recharge time": UiResource("classes/fitting/statsicons/passiveshieldrecharge.png"),
    "Armor Hitpoints": UiResource("classes/fitting/statsicons/armorhp.png"),
    "Structure Hitpoints": UiResource("classes/fitting/statsicons/structurehp.png"),
    "Capacitor Capacity": UiResource("eveicon/system_icons/capacitor_plus_16px.png"),
    "Capacitor Recharge time": UiResource("eveicon/control_icons/broadcast_need_capacitor_16px.png"),
    "Maximum Velocity": UiResource("eveicon/category_icons/navigation_16px.png"),
    Mass: UiResource("classes/fitting/statsicons/mass.png"),
    "Inertia Modifier": UiResource("classes/fitting/statsicons/inertiamodifier.png"),
    "Ship Warp Speed": UiResource("classes/fitting/statsicons/warpspeed.png"),
    "Maximum Targeting Range": UiResource("classes/fitting/statsicons/controlrange.png"),
    "Maximum Locked Targets": UiResource("classes/fitting/statsicons/maximumlockedtargets.png"),
    "Signature Radius": UiResource("classes/fitting/statsicons/signatureradius.png"),
    "Scan Resolution": UiResource("classes/fitting/statsicons/scanresolution.png"),
    "Sensor strength": UiResource("classes/fitting/statsicons/magneticsensorstrength.png"),
    "Drone Capacity": UiResource("eveicon/category_icons/drones_16px.png"),
    "Drone Bandwidth": UiResource("classes/fitting/statsicons/bandwidth.png"),
    Volume: UiResource("eveicon/system_icons/inventory_16px.png"),
    Capacity: UiResource("eveicon/control_icons/cargo_inventory_16px.png")
};
const FITTING_ROW_ICONS = {
    CPU: UiResource("icons/12_64_7.png"),
    "Power Grid": UiResource("icons/2_64_7.png"),
    Calibration: UiResource("icons/55_64_13.png"),
    "High Power Slots": UiResource("classes/fitting/filtericonhighslot.png"),
    "Medium Power Slots": UiResource("classes/fitting/filtericonmediumslot.png"),
    "Low Power Slots": UiResource("classes/fitting/filtericonlowslot.png"),
    "Rig Slots": UiResource("classes/fitting/filtericonrigslot.png")
};
// What the Attributes panel shows, named as the dogma topic names it. The
// service owns which attributes each section contains.
const ATTRIBUTE_SECTIONS = [ "defense", "capacitor", "navigation", "targeting", "drones" ];
// The fallback when no skills topic is configured: the six published
// requirement pairs, which the dogma topic exposes as one section.
const SKILL_REQUIREMENT_SECTIONS = [ "skillRequirements" ];
const CHARACTER_ATTRIBUTE_NAMES = {
    164: "charisma",
    165: "intelligence",
    166: "memory",
    167: "perception",
    168: "willpower"
};
const FACTION_PRESENTATION = {
    1: { accent: "#315973", backdropURL: UiResource("classes/shiptree/factionbg/caldari.png") },
    2: { accent: "#6d4b32", backdropURL: UiResource("classes/shiptree/factionbg/minmatar.png") },
    4: { accent: "#8b713b", backdropURL: UiResource("classes/shiptree/factionbg/amarr.png") },
    8: { accent: "#285f54", backdropURL: UiResource("classes/shiptree/factionbg/gallente.png") }
};

/**
 * Provider adapter for the local tools-core HTTP contract. All SDE-backed
 * requests are pinned to one resolved build so a Show Info window cannot mix
 * records from different exports while it is open.
 */
export class CjsShipShowInfoToolsCoreSource
{
    #buildPromise = null;
    #records = new Map();

    /**
     * Creates a ship-detail ship show info tools core source around
     * caller-supplied browser collaborators.
     */
    constructor({
        baseURL = DEFAULT_TOOLS_CORE_URL,
        target = "eve",
        source = null,
        resourceBaseURL = baseURL,
        fetchImpl = globalThis.fetch
    } = {})
    {
        if (typeof fetchImpl !== "function") throw new TypeError("CjsShipShowInfoToolsCoreSource requires fetch");

        this.baseURL = String(baseURL).replace(/\/+$/u, "");
        this.resourceBaseURL = String(resourceBaseURL).replace(/\/+$/u, "");
        this.source = source;
        this.target = String(source?.target || target || "eve");
        this.fetchImpl = fetchImpl.bind(globalThis);
    }

    /** Loads normalized ship data from the configured ship-detail source. */
    async FetchShip({ typeID, regionID, signal } = {})
    {
        const id = ShipID(typeID);
        const [ type, resolved ] = await Promise.all([
            this.#ComposedType(id, signal),
            this.#DnaRecord("resolve", `resolve?typeID=${id}`, signal)
        ]);
        // The composed type carries its own taxonomy - group, meta group,
        // faction and category, named in the language it was asked in. This was
        // four extra raw table reads, and the language and the build had to be
        // got right in each of them.
        if (Number(type.categoryID) !== SHIP_CATEGORY_ID) throw new Error(`Type ${id} is not a ship`);

        const ship = {
            typeID: id,
            regionID: PositiveID(regionID),
            name: Localized(type.name) || `Type ${id}`,
            groupName: Localized(type.groupName) || "Ship",
            metaLabel: Localized(type.metaGroupName) || (type.techLevel ? `Tech ${type.techLevel}` : ""),
            dna: String(resolved.dna || ""),
            iconURL: EveTypeIconURL(id, { size: 128 }),
            renderURL: EveTypeRenderURL(id, { size: 1024 })
        };

        if (!ship.dna) throw new Error(`Ship DNA is unavailable for type ${id}`);
        if (type.factionName)
        {
            ship.faction = Object.assign(
                { name: Localized(type.factionName) || "Faction" },
                FACTION_PRESENTATION[type.raceID] || {}
            );
        }
        if (Object.hasOwn(type, "manufacturers"))
        {
            ship.manufacturers = [];
            for (const value of Array.isArray(type.manufacturers) ? type.manufacturers : [])
            {
                const corporationID = PositiveID(value);

                if (!corporationID) continue;
                ship.manufacturers.push({
                    corporationID,
                    name: Localized(type.manufacturerNames?.[corporationID]),
                    iconURL: EveCorporationLogoURL(corporationID, { size: 128 })
                });
            }
        }
        return this.#ResolveResourceURLs(ship);
    }

    /** Loads normalized overview data from the configured ship-detail source. */
    async FetchOverview({ typeID, signal } = {})
    {
        const id = ShipID(typeID);
        const [ type, traits ] = await Promise.all([
            this.#ComposedType(id, signal),
            this.#TopicRecord("types", "traits", `${id}/traits`, signal)
        ]);
        const result = { description: PlainText(Localized(type.description)) };
        const bonuses = [];

        if (Object.hasOwn(type, "quote"))
        {
            result.quote = {
                text: Localized(type.quote),
                author: Localized(type.quoteAuthor)
            };
        }

        // Already ordered by the export's own importance, with the skill named
        // and the unit resolved. This used to read the raw bonus table and one
        // type row per skill to put a heading on each group.
        for (const group of traits?.skillBonuses || [])
        {
            const lines = BonusLines(group.bonuses);

            if (lines.length) bonuses.push({
                heading: `${Localized(group.skillName) || `Skill ${group.skillTypeID}`} bonuses (per skill level):`,
                lines
            });
        }

        const roleLines = BonusLines(traits?.roleBonuses);

        if (roleLines.length) bonuses.push({ heading: "Role Bonus:", lines: roleLines });
        if (bonuses.length) result.bonuses = bonuses;
        return result;
    }

    /** Loads normalized attributes data from the configured ship-detail source. */
    async FetchAttributes({ typeID, signal } = {})
    {
        const id = ShipID(typeID);
        const [ type, values ] = await Promise.all([
            this.#Type(id, signal),
            this.#DogmaValues(id, ATTRIBUTE_SECTIONS, signal)
        ]);
        const groups = [];

        AddGroup(groups, "Shield", [
            ValueRow("Shield Capacity", values.shieldCapacity, "HP"),
            DisplayRow("Shield recharge time", DurationMilliseconds(values.shieldRechargeRate))
        ], Resistances(values, "shield"));
        AddGroup(groups, "Armor", [
            ValueRow("Armor Hitpoints", values.armorHP, "HP")
        ], Resistances(values, "armor"));
        AddGroup(groups, "Structure", [
            ValueRow("Structure Hitpoints", values.hp, "HP")
        ], Resistances(values, "structure"));
        AddGroup(groups, "Capacitor", [
            ValueRow("Capacitor Capacity", values.capacitorCapacity, "GJ"),
            DisplayRow("Capacitor Recharge time", DurationMilliseconds(values.rechargeRate))
        ]);
        AddGroup(groups, "Navigation", [
            ValueRow("Maximum Velocity", values.maxVelocity, "m/sec"),
            ValueRow("Mass", type.mass, "kg"),
            ValueRow("Inertia Modifier", values.agility, "x"),
            ValueRow("Ship Warp Speed", values.warpSpeedMultiplier, "AU/s")
        ]);

        const sensorStrength = MaxFinite([
            values.scanRadarStrength,
            values.scanLadarStrength,
            values.scanMagnetometricStrength,
            values.scanGravimetricStrength
        ]);

        AddGroup(groups, "Targeting", [
            ValueRow("Maximum Targeting Range", Divide(values.maxTargetRange, 1000), "km"),
            ValueRow("Maximum Locked Targets", values.maxLockedTargets),
            ValueRow("Signature Radius", values.signatureRadius, "m"),
            ValueRow("Scan Resolution", values.scanResolution, "mm"),
            ValueRow("Sensor strength", sensorStrength, "points")
        ]);
        AddGroup(groups, "Drones", [
            ValueRow("Drone Capacity", values.droneCapacity, "m3"),
            ValueRow("Drone Bandwidth", values.droneBandwidth, "Mbit/sec")
        ]);

        const volume = Finite(type.volume)
            ? `${Number(type.volume).toLocaleString("en-US")} m3${Finite(type.packagedVolume) ? ` (${Number(type.packagedVolume).toLocaleString("en-US")} m3 Packaged)` : ""}`
            : null;

        AddGroup(groups, "Inventory", [
            DisplayRow("Volume", volume),
            ValueRow("Capacity", type.capacity, "m3")
        ]);
        return this.#ResolveResourceURLs({ groups });
    }

    /** Loads normalized fitting data from the configured ship-detail source. */
    async FetchFitting({ typeID, signal } = {})
    {
        const id = ShipID(typeID);
        const build = await this.#Build(signal);
        const record = await this.#FetchJson(`/${this.target}/${build}/dogma/types/${id}?sections=fitting&lang=en`, { signal });
        const fitting = record.effective || record.base || {};
        const rows = [
            FittingCapacityRow("CPU", fitting.cpuOutput, "tf"),
            FittingCapacityRow("Power Grid", fitting.powerOutput, "MW"),
            FittingCapacityRow("Calibration", fitting.upgradeCapacity, "points"),
            SlotRow("High Power Slots", fitting.hiSlots),
            SlotRow("Medium Power Slots", fitting.medSlots),
            SlotRow("Low Power Slots", fitting.lowSlots),
            SlotRow("Rig Slots", fitting.rigSlots)
        ].filter(Boolean);

        return this.#ResolveResourceURLs({
            rows,
            hardpoints: [
                Hardpoint("turret", "Turret hardpoints", fitting.turretSlotsLeft, "classes/fitting/iconturrethardpoint.png"),
                Hardpoint("launcher", "Launcher hardpoints", fitting.launcherSlotsLeft, "classes/fitting/iconlauncherhardpoint.png")
            ]
        });
    }

    /** Loads normalized skills data from the configured ship-detail source. */
    async FetchSkills({ typeID, skillProfile = null, skillProfileState = null, signal } = {})
    {
        const id = ShipID(typeID);
        const build = await this.#Build(signal);
        const normalized = await this.#TryJson(`/${this.target}/${build}/skills/types/${id}?lang=en`, { signal });
        let result;

        if (normalized)
        {
            result = NormalizedSkills(normalized);
            const plan = await this.#SkillPlan(normalized, build, signal);

            if (plan)
            {
                result.requirements = plan.requirements;
                result.requiredSkills = plan.requiredSkills;
            }
            else
            {
                const requirementTree = await this.#SkillRequirementTree(normalized, build, signal);

                if (requirementTree) result.requirements = requirementTree;
            }
        }
        else
        {
            const values = await this.#DogmaValues(id, SKILL_REQUIREMENT_SECTIONS, signal);
            const requirements = [];

            for (let index = 1; index <= 6; index++)
            {
                ThrowIfAborted(signal);
                const skillID = PositiveID(values[`requiredSkill${index}`]);
                const level = SkillLevel(values[`requiredSkill${index}Level`]);

                if (!skillID || !level) continue;
                const skill = await this.#Type(skillID, signal);

                requirements.push({ typeID: skillID, name: Localized(skill.name) || `Skill ${skillID}`, level });
            }
            result = { tiers: [], requirements };
        }

        if (!skillProfile)
        {
            if (skillProfileState) result.profileState = skillProfileState;
            return result;
        }

        const [ masteries ] = await Promise.all([
            this.#MasteryRequirements(id, signal),
            this.#EnrichSkillMetadata(result, build, signal)
        ]);

        return EvaluateSkillProfile(result, skillProfile, masteries, skillProfileState);
    }

    /** Loads normalized variations data from the configured ship-detail source. */
    async FetchVariations({ typeID, signal } = {})
    {
        const id = ShipID(typeID);
        // One composed answer: the service anchors on the parent, drops
        // unpublished rows and names each group. This was a raw table query
        // plus one group read per variation, and every one of those had to
        // agree about the build and the language.
        const answer = await this.#TopicRecord("types", "variations", `${id}/variations`, signal);
        const parentID = PositiveID(answer?.parentTypeID) || id;
        const variations = [];

        for (const entry of answer?.variations || [])
        {
            if (Object.hasOwn(entry, "categoryID") && Number(entry.categoryID) !== SHIP_CATEGORY_ID) continue;
            const variationTypeID = PositiveID(entry.typeID);

            if (!variationTypeID) continue;
            variations.push({
                typeID: variationTypeID,
                name: Localized(entry.name) || `Type ${entry.typeID}`,
                groupName: Localized(entry.groupName) || "Ship",
                iconURL: EveTypeIconURL(variationTypeID, { size: 64 })
            });
        }
        variations.sort((left, right) => left.typeID === parentID ? -1 : right.typeID === parentID ? 1 : left.name.localeCompare(right.name));
        return this.#ResolveResourceURLs({ selectedTypeID: id, variations });
    }

    /** Loads normalized industry data from the configured ship-detail source. */
    async FetchIndustry({ typeID, signal } = {})
    {
        const id = ShipID(typeID);
        const build = await this.#Build(signal);
        const record = await this.#FetchJson(`/${this.target}/${build}/industry/types/${id}?lang=en`, { signal });
        const result = { materials: [] };

        if (record.blueprint)
        {
            result.blueprint = Item(record.blueprint.typeID, Localized(record.blueprint.name));
        }
        for (const material of record.reprocessedMaterials || [])
        {
            result.materials.push(Item(material.typeID, Localized(material.name), material.quantity));
        }
        return this.#ResolveResourceURLs(result);
    }

    /** Loads normalized skins data from the configured ship-detail source. */
    async FetchSkins({ typeID, signal } = {})
    {
        const id = ShipID(typeID);
        const [ type, build ] = await Promise.all([ this.#Type(id, signal), this.#Build(signal) ]);
        const catalog = await this.#FetchJson(`/${this.target}/${build}/skin`, { signal });
        const skinIDs = Array.isArray(catalog.typesToSkins?.[id]) ? catalog.typesToSkins[id] : [];
        const shipName = Localized(type.name) || `Type ${id}`;
        const skins = await MapConcurrent(skinIDs, 8, async value =>
        {
            const skinID = PositiveID(value);
            const skin = catalog.skins?.[skinID];

            if (!skinID || !skin || skin.visibleTranquility === false) return null;
            const resolved = await this.#TryDnaRecord("resolve", `resolve?typeID=${id}&skinID=${skinID}`, signal);
            const materialID = PositiveID(skin.skinMaterialID) || PositiveID(resolved?.skinMaterialID);
            const material = materialID ? catalog.skinMaterials?.[materialID] : null;
            const fullName = String(resolved?.skinName || skin.internalName || `SKIN ${skinID}`);
            const name = Localized(material?.displayName)
                || fullName.replace(new RegExp(`^${EscapeRegExp(shipName)}\\s+`, "iu"), "");
            const graphicMaterialSetID = PositiveID(resolved?.graphicMaterialSetID)
                || PositiveID(material?.materialSetID);
            const licenseIDs = Array.isArray(catalog.skinsToLicenses?.[skinID])
                ? catalog.skinsToLicenses[skinID]
                : [];
            const licenses = [];

            for (const licenseValue of licenseIDs)
            {
                const license = catalog.skinLicenses?.[licenseValue];
                const licenseTypeID = PositiveID(license?.licenseTypeID) || PositiveID(licenseValue);

                if (!licenseTypeID) continue;
                licenses.push({ licenseTypeID, duration: Number(license?.duration) });
            }
            licenses.sort((left, right) =>
            {
                if (left.duration === -1) return right.duration === -1 ? 0 : -1;
                if (right.duration === -1) return 1;
                return right.duration - left.duration;
            });

            const record = {
                skinID,
                source: "official",
                name,
                iconURL: SkinIconURL(material?.iconPath, graphicMaterialSetID),
                graphicMaterialSetID,
                dna: resolved?.dna || null
            };

            if (licenses.length)
            {
                record.licenseTypeID = licenses[0].licenseTypeID;
                record.duration = licenses[0].duration;
                record.licenses = licenses;
            }
            return record;
        });
        const available = skins.filter(Boolean);

        available.sort((left, right) => left.name.localeCompare(right.name));

        return this.#ResolveResourceURLs({
            shipName,
            skins: available
        });
    }

    /** Assembles normalized ship-detail output from the current source records. */
    async #Build(signal)
    {
        ThrowIfAborted(signal);
        if (!this.#buildPromise)
        {
            this.#buildPromise = this.source
                ? Promise.resolve(this.source.Resolve()).then(() =>
                {
                    this.target = String(this.source.target || this.target);
                    return String(this.source.sdeBuild || "");
                })
                : this.#FetchJson(`/${this.target}/latest/build`)
                    .then(record => String(record?.builds?.sde || record?.build || ""));
        }

        let build;
        try
        {
            build = await this.#buildPromise;
        }
        catch (error)
        {
            this.#buildPromise = null;
            throw error;
        }
        ThrowIfAborted(signal);
        if (!/^\d+$/u.test(build)) throw new Error("tools-core did not resolve an exact SDE build");
        return build;
    }

    /**
     * The skills each mastery level needs, composed by the service.
     *
     * This was a three-table join done here - masteries, then every
     * certificate they name, then the per-tier level on each skill - and the
     * failure mode was silent: an unreadable certificate dropped its
     * requirements, and a shorter requirement list reads as a mastery already
     * earned. The service now states whether the join was complete, and an
     * incomplete one carries no levels at all.
     */
    async #MasteryRequirements(typeID, signal)
    {
        const answer = await this.#TryTopicRecord("types", "mastery", `${typeID}/mastery`, signal);

        return answer?.complete ? answer.levels ?? [] : [];
    }

    /** Expands recursive skill prerequisites into a normalized requirement tree. */
    async #SkillRequirementTree(record, build, signal)
    {
        if (!Array.isArray(record?.required) || !Array.isArray(record?.closure)) return null;

        const typeIDs = [];
        const seen = new Set();

        for (const item of record.closure)
        {
            const typeID = PositiveID(item?.typeID ?? item?.skillTypeID);

            if (!typeID || seen.has(typeID)) continue;
            seen.add(typeID);
            typeIDs.push(typeID);
        }

        const details = await MapConcurrent(typeIDs, 8, typeID => this.#Skill(typeID, build, signal));

        // One missing skill detail means the edge graph is incomplete. Keep
        // the endpoint's complete, deduplicated closure instead of presenting
        // a tree with a silently truncated branch.
        if (details.some(detail => !detail)) return null;

        const byTypeID = new Map();

        for (let index = 0; index < typeIDs.length; index++) byTypeID.set(typeIDs[index], details[index]);
        return FlattenSkillRequirements(record.required, byTypeID);
    }

    /** Builds the remaining training plan for the current pilot profile. */
    async #SkillPlan(record, build, signal)
    {
        const requested = [];
        const seen = new Set();

        for (const item of record?.required ?? [])
        {
            const typeID = PositiveID(item?.typeID ?? item?.skillTypeID);

            if (!typeID || seen.has(typeID)) continue;
            seen.add(typeID);
            requested.push(typeID);
        }

        if (!requested.length) return { requirements: [], requiredSkills: [] };

        let plan;
        try
        {
            plan = await this.#FetchJson(
                `/${this.target}/${build}/skills/plan?skills=${encodeURIComponent(requested.join(","))}`,
                { signal }
            );
        }
        catch (error)
        {
            // Older tools-core processes parse `plan` as a skill typeID and
            // return 400. Keep the public detail-route reconstruction as a
            // compatibility path until that process is restarted.
            if ([ 400, 404, 501 ].includes(error?.statusCode)) return null;
            throw error;
        }

        return NormalizedSkillPlan(plan, record.required);
    }

    /** Attaches names and ranks to normalized skill requirements. */
    async #EnrichSkillMetadata(record, build, signal)
    {
        const requirements = Array.isArray(record?.requiredSkills)
            ? record.requiredSkills
            : record?.requirements;
        const typeIDs = [];
        const seen = new Set();

        for (const item of requirements ?? [])
        {
            const typeID = PositiveID(item?.typeID);

            if (!typeID || seen.has(typeID)) continue;
            seen.add(typeID);
            typeIDs.push(typeID);
        }

        const details = await MapConcurrent(typeIDs, 8, typeID => this.#Skill(typeID, build, signal));
        const byTypeID = new Map();

        for (let index = 0; index < typeIDs.length; index++)
        {
            const detail = details[index];

            if (detail) byTypeID.set(typeIDs[index], detail);
        }

        for (const item of requirements ?? [])
        {
            const detail = byTypeID.get(PositiveID(item?.typeID));

            if (!detail) continue;
            const rank = PositiveNumber(detail.rank);
            const primaryAttribute = PositiveID(detail.primaryAttribute);
            const secondaryAttribute = PositiveID(detail.secondaryAttribute);

            if (rank) item.rank = rank;
            if (primaryAttribute) item.primaryAttribute = primaryAttribute;
            if (secondaryAttribute) item.secondaryAttribute = secondaryAttribute;
        }
    }

    /** Returns the normalized skill record for one requested type identifier. */
    async #Skill(typeID, build, signal)
    {
        const id = PositiveID(typeID);

        if (!id) return null;
        const key = `${build}:skills:${id}:en`;

        if (this.#records.has(key)) return structuredClone(this.#records.get(key));
        const detail = await this.#TryJson(`/${this.target}/${build}/skills/${id}?lang=en`, { signal });

        if (detail) this.#records.set(key, structuredClone(detail));
        return detail;
    }

    /** Combines type and group records into one ship-detail identity. */
    async #ComposedType(typeID, signal)
    {
        const id = PositiveID(typeID);
        const build = await this.#Build(signal);
        const key = `${build}:composedTypes:${id}:en`;

        if (this.#records.has(key)) return structuredClone(this.#records.get(key));

        // This is the composed SDE facet. Do not use SofSource.Fetch(): that
        // method probes the resource facet and may deliberately fall forward
        // to a different client build.
        const record = await this.#FetchJson(`/${this.target}/${build}/types/${id}?lang=en`, { signal });

        this.#records.set(key, structuredClone(record));
        return record;
    }

    /**
     * Returns one composed type answer for panel fields shared across views.
     *
     * The service owns taxonomy, localization, physical values, quotes, and
     * manufacturer enrichment. Product code never reconstructs those joins.
     */
    async #Type(typeID, signal)
    {
        return this.#ComposedType(typeID, signal);
    }

    // DNA is its own composed topic rather than an inspection-table read.

    /** Requires one decoded DNA record for the selected ship type. */
    async #DnaRecord(table, relativePath, signal)
    {
        return this.#TopicRecord("dna", table, relativePath, signal);
    }

    /** Requires one topic record from the selected SDE facet. */
    async #TopicRecord(topic, table, relativePath, signal)
    {
        const build = await this.#Build(signal);
        const key = `${build}:${topic}:${table}:${relativePath}`;

        if (this.#records.has(key)) return structuredClone(this.#records.get(key));

        const record = await this.#FetchJson(`/${this.target}/${build}/${topic}/${relativePath}`, { signal });
        const payload = record?.payload ?? record;

        this.#records.set(key, structuredClone(payload));
        return payload;
    }

    /** Attempts try dna record decoding while preserving optional absence. */
    async #TryDnaRecord(table, relativePath, signal)
    {
        return this.#TryTopicRecord("dna", table, relativePath, signal);
    }

    /** Attempts try topic record decoding while preserving optional absence. */
    async #TryTopicRecord(topic, table, relativePath, signal)
    {
        try
        {
            return await this.#TopicRecord(topic, table, relativePath, signal);
        }
        catch (error)
        {
            if (error?.statusCode === 404) return null;
            throw error;
        }
    }

    /**
     * The attribute values behind the Attributes panel, by name.
     *
     * The dogma topic takes sections - what a caller intends to display -
     * and answers with named values. This used to read the raw attribute
     * table once per name to turn each name into an id, then the raw type
     * dogma row to look the ids back up, and it silently reported a hull as
     * missing an attribute whenever a name lookup came back empty.
     *
     * No profile, so these are the published values of an empty hull, which is
     * what this panel shows.
     */
    async #DogmaValues(typeID, sections, signal)
    {
        const build = await this.#Build(signal);
        const path = `/${this.target}/${build}/dogma/types/${PositiveID(typeID)}?sections=${sections.join(",")}`;
        const answer = await this.#FetchJson(path, { signal });

        return answer?.base ?? {};
    }

    /** Attempts try json decoding while preserving optional absence. */
    async #TryJson(path, options)
    {
        try
        {
            return await this.#FetchJson(path, options);
        }
        catch (error)
        {
            if (error?.statusCode === 404 || error?.statusCode === 501) return null;
            throw error;
        }
    }

    /** Maps resource ur ls records into usable browser-facing values. */
    #ResolveResourceURLs(record)
    {
        if (!record || !this.resourceBaseURL) return record;

        const pending = [ record ];
        const seen = new Set();

        while (pending.length)
        {
            const value = pending.pop();

            if (!value || typeof value !== "object" || seen.has(value)) continue;
            seen.add(value);

            for (const key of Object.keys(value))
            {
                const child = value[key];

                if (typeof child === "string" && child.startsWith("/eve/latest/resources/"))
                {
                    value[key] = `${this.resourceBaseURL}${child}`;
                }
                else if (child && typeof child === "object")
                {
                    pending.push(child);
                }
            }
        }
        return record;
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
            let detail = null;

            try { detail = await response.json(); }
            catch { /* The status remains enough to diagnose a non-JSON response. */ }

            const error = new Error(detail?.error || `tools-core request failed (${response.status})`);

            error.statusCode = response.status;
            throw error;
        }
        return response.json();
    }
}

function ShipID(value)
{
    const id = PositiveID(value);

    if (!id) throw new TypeError("Show Info requires a positive ship typeID");
    return id;
}

function PositiveID(value)
{
    const id = Number(value);

    return /^\d+$/u.test(String(value ?? "")) && Number.isSafeInteger(id) && id > 0 ? id : null;
}

function PositiveNumber(value)
{
    const number = Number(value);

    return Number.isFinite(number) && number > 0 ? number : null;
}

function Localized(value)
{
    if (typeof value === "string") return value;
    if (typeof value?.text === "string") return value.text;
    return typeof value?.en === "string" ? value.en : "";
}

function PlainText(value)
{
    return String(value || "")
        .replace(/<br\s*\/?\s*>/giu, "\n")
        .replace(/<[^>]*>/gu, "")
        .replace(/&nbsp;/giu, " ")
        .replace(/&amp;/giu, "&")
        .replace(/&lt;/giu, "<")
        .replace(/&gt;/giu, ">")
        .replace(/&quot;/giu, "\"")
        .replace(/&#39;/giu, "'")
        .trim();
}

function BonusLines(records)
{
    const lines = [];

    for (const record of records || [])
    {
        const text = PlainText(Localized(record?.text));

        if (!text) continue;
        const value = Number(record.bonus);
        // The unit comes resolved now, so "%" is no longer special-cased here.
        const prefix = Number.isFinite(value) ? `${value}${Localized(record.unit)} ` : "";

        lines.push(`${prefix}${text}`);
    }
    return lines;
}

function AddGroup(groups, name, candidateRows, resistances = null)
{
    const rows = candidateRows.filter(Boolean);

    if (!rows.length && !resistances) return;
    const group = { name, summary: "", rows, iconURL: ATTRIBUTE_GROUP_ICONS[name] };

    if (resistances) group.resistances = resistances;
    groups.push(group);
}

function ValueRow(name, value, unit = "")
{
    if (!Finite(value)) return null;
    return { name, value: Number(value), unit, iconURL: ATTRIBUTE_ROW_ICONS[name] };
}

function DisplayRow(name, displayValue)
{
    if (!displayValue) return null;
    return { name, displayValue, iconURL: ATTRIBUTE_ROW_ICONS[name] };
}

function FittingCapacityRow(name, value, unit)
{
    if (!Finite(value)) return null;
    const amount = Number(value);

    return {
        name,
        value: amount,
        unit,
        displayValue: `0.0 / ${amount.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`,
        iconURL: FITTING_ROW_ICONS[name]
    };
}

function SlotRow(name, value)
{
    if (!Finite(value)) return null;
    return { name, value: Number(value), displayValue: `0 / ${Number(value)}`, iconURL: FITTING_ROW_ICONS[name] };
}

function Hardpoint(kind, name, total, path)
{
    return {
        kind,
        name,
        used: 0,
        total: Finite(total) ? Number(total) : 0,
        iconURL: UiResource(path)
    };
}

function Resistances(values, layer)
{
    const prefix = layer === "structure" ? "" : layer;
    const names = [
        `${prefix}${prefix ? "Em" : "em"}DamageResonance`,
        `${prefix}${prefix ? "Thermal" : "thermal"}DamageResonance`,
        `${prefix}${prefix ? "Kinetic" : "kinetic"}DamageResonance`,
        `${prefix}${prefix ? "Explosive" : "explosive"}DamageResonance`
    ];
    const result = [];

    for (const name of names)
    {
        if (!Finite(values[name])) return null;
        result.push(Math.round((1 - Number(values[name])) * 10000) / 100);
    }
    return result;
}

function DurationMilliseconds(value)
{
    if (!Finite(value)) return null;
    let seconds = Math.max(0, Math.round(Number(value) / 1000));
    const hours = Math.floor(seconds / 3600);

    seconds -= hours * 3600;
    const minutes = Math.floor(seconds / 60);

    seconds -= minutes * 60;
    return [ hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", seconds || (!hours && !minutes) ? `${seconds}s` : "" ].filter(Boolean).join(" ");
}

function Divide(value, divisor)
{
    return Finite(value) ? Number(value) / divisor : null;
}

function MaxFinite(values)
{
    const finite = values.filter(Finite).map(Number);

    return finite.length ? Math.max(...finite) : null;
}

function Finite(value)
{
    return Number.isFinite(Number(value));
}

function SkillLevel(value)
{
    const level = Math.round(Number(value));

    return Number.isFinite(level) && level > 0 ? Math.min(5, level) : null;
}

function NormalizedSkills(record)
{
    const source = Array.isArray(record.closure)
        ? record.closure
        : record.required || record.requirements || [];
    const requirements = [];

    for (const item of source)
    {
        const level = SkillLevel(item.level ?? item.requiredLevel);
        const typeID = PositiveID(item.typeID ?? item.skillTypeID);

        if (!level || !typeID) continue;
        const requirement = { typeID, name: Localized(item.name) || `Skill ${typeID}`, level };
        const depth = Number(item.depth);

        if (Number.isSafeInteger(depth) && depth >= 0) requirement.depth = depth;
        requirements.push(requirement);
    }
    return { tiers: [], requirements };
}

function NormalizedSkillPlan(record, requested)
{
    if (!record
        || !Array.isArray(record.outline)
        || !record.skills
        || typeof record.skills !== "object"
        || Array.isArray(record.skills)) return null;

    const requestedByID = new Map();

    for (const item of requested ?? [])
    {
        const typeID = PositiveID(item?.typeID ?? item?.skillTypeID);
        const level = SkillLevel(item?.level ?? item?.requiredLevel);

        if (!typeID || !level) continue;
        requestedByID.set(typeID, {
            level,
            name: Localized(item.name) || `Skill ${typeID}`
        });
    }

    const requirements = [];

    for (const item of record.outline)
    {
        const typeID = PositiveID(item?.typeID ?? item?.skillTypeID);
        const direct = requestedByID.get(typeID);
        const level = SkillLevel(item?.level ?? item?.requiredLevel) || direct?.level;

        if (!typeID || !level) continue;
        const depth = Number(item.depth);
        requirements.push({
            typeID,
            name: Localized(item.name) || direct?.name || `Skill ${typeID}`,
            level,
            depth: Number.isSafeInteger(depth) && depth >= 0 ? depth : 0
        });
    }

    const requiredSkills = [];

    for (const [ key, item ] of Object.entries(record.skills))
    {
        const typeID = PositiveID(item?.typeID ?? key);
        const direct = requestedByID.get(typeID);
        const level = SkillLevel(item?.level ?? item?.requiredLevel) || direct?.level;

        if (!typeID || !level) continue;
        const depth = Number(item.depth);
        const requiredBy = [];
        const seenParents = new Set();

        for (const value of item.requiredBy ?? [])
        {
            const parentTypeID = PositiveID(value);

            if (!parentTypeID || seenParents.has(parentTypeID)) continue;
            seenParents.add(parentTypeID);
            requiredBy.push(parentTypeID);
        }

        requiredSkills.push({
            typeID,
            name: Localized(item.name) || direct?.name || `Skill ${typeID}`,
            level,
            depth: Number.isSafeInteger(depth) && depth >= 0 ? depth : 0,
            requested: item.requested === true,
            requiredBy
        });
    }
    requiredSkills.sort((left, right) => right.depth - left.depth || left.typeID - right.typeID);

    return { requirements, requiredSkills };
}

function FlattenSkillRequirements(roots, details)
{
    const requirements = [];
    const sortedRoots = SortedSkillRequirements(roots);

    for (const root of sortedRoots) AppendSkillRequirement(root, 0, null, details, new Set(), requirements);
    return requirements;
}

function AppendSkillRequirement(item, depth, parentTypeID, details, ancestors, requirements)
{
    const typeID = PositiveID(item?.typeID ?? item?.skillTypeID);
    const level = SkillLevel(item?.level ?? item?.requiredLevel);

    if (!typeID || !level || ancestors.has(typeID)) return;

    const requirement = {
        typeID,
        name: Localized(item.name) || `Skill ${typeID}`,
        level,
        depth
    };

    if (parentTypeID) requirement.parentTypeID = parentTypeID;
    requirements.push(requirement);

    const detail = details.get(typeID);

    if (!detail) return;

    const nextAncestors = new Set(ancestors);

    nextAncestors.add(typeID);
    for (const prerequisite of SortedSkillRequirements(detail.required))
    {
        AppendSkillRequirement(prerequisite, depth + 1, typeID, details, nextAncestors, requirements);
    }
}

function SortedSkillRequirements(records)
{
    const result = Array.isArray(records) ? Array.from(records) : [];

    result.sort((left, right) =>
        (PositiveID(left?.typeID ?? left?.skillTypeID) || Number.MAX_SAFE_INTEGER)
        - (PositiveID(right?.typeID ?? right?.skillTypeID) || Number.MAX_SAFE_INTEGER));
    return result;
}

/**
 * Combines trained skill levels with requirement records into one readiness
 * summary.
 */
export function EvaluateSkillProfile(base, profile, masteries, profileState = null)
{
    const levels = new Map();

    for (const item of profile?.skills ?? [])
    {
        const typeID = PositiveID(item?.typeID);

        if (!typeID) continue;
        levels.set(typeID, {
            active: ProfileSkillLevel(item.activeSkillLevel ?? item.level),
            trained: ProfileSkillLevel(item.trainedSkillLevel ?? item.level),
            skillPoints: NonNegativeNumber(item.skillPoints)
        });
    }

    const requirements = EvaluatedSkillRequirements(base?.requirements, levels);
    const collapsedSource = Array.isArray(base?.requiredSkills) ? base.requiredSkills : base?.requirements;
    const requiredSkills = EvaluatedSkillRequirements(collapsedSource, levels);
    const requirementsComplete = requiredSkills.every(item => item.complete);

    const result = {
        tiers: [],
        requirements,
        profile: {
            mode: profile?.mode === "manual" ? "manual" : "automatic",
            characterID: PositiveID(profile?.characterID ?? profile?.characterId),
            characterName: profile?.characterName ? String(profile.characterName) : null,
            totalSkillPoints: NonNegativeNumber(profile?.totalSkillPoints),
            unallocatedSkillPoints: NonNegativeNumber(profile?.unallocatedSkillPoints),
            skillCount: levels.size
        }
    };

    if (Array.isArray(base?.requiredSkills)) result.requiredSkills = requiredSkills;

    if (profileState) result.profileState = profileState;
    const training = EvaluateSkillTraining(collapsedSource, levels, profile);

    if (training) result.training = training;
    if (!Array.isArray(masteries) || !masteries.length) return result;

    result.tiers.push({ level: 0, complete: requirementsComplete });
    let masteryLevel = 0;

    for (const mastery of masteries)
    {
        let complete = requirementsComplete;

        for (const requirement of mastery?.requirements ?? [])
        {
            const current = levels.get(PositiveID(requirement?.typeID));
            const required = SkillLevel(requirement?.level);

            if (!required || !current || current.active < required)
            {
                complete = false;
                break;
            }
        }

        const level = MasteryLevel(mastery?.level);

        if (!level) continue;
        result.tiers.push({
            level,
            complete,
            certificateCount: Number(mastery.certificateCount) || 0,
            requirementCount: Array.isArray(mastery.requirements) ? mastery.requirements.length : 0
        });
        if (complete && level > masteryLevel) masteryLevel = level;
    }

    result.masteryLevel = masteryLevel;
    result.masteryCaption = requirementsComplete
        ? `You have Mastery Level ${masteryLevel}`
        : "Missing required skills";
    return result;
}

function EvaluatedSkillRequirements(records, levels)
{
    const result = [];

    for (const item of records ?? [])
    {
        const current = levels.get(PositiveID(item?.typeID)) || { active: 0, trained: 0, skillPoints: null };
        const required = SkillLevel(item?.level) || 1;

        result.push(Object.assign({}, item, {
            level: required,
            activeLevel: current.active,
            trainedLevel: current.trained,
            skillPoints: current.skillPoints,
            complete: current.active >= required
        }));
    }
    return result;
}

function EvaluateSkillTraining(records, levels, profile)
{
    const collapsed = new Map();

    for (const item of records ?? [])
    {
        const typeID = PositiveID(item?.typeID);
        const level = SkillLevel(item?.level);

        if (!typeID || !level) continue;
        const previous = collapsed.get(typeID);

        if (previous && previous.level >= level) continue;
        collapsed.set(typeID, Object.assign({}, item, { typeID, level }));
    }

    if (!collapsed.size) return null;

    let skillPointsRequired = 0;
    let omegaTrainingTimeSeconds = 0;
    let timeIsExact = true;

    for (const [ typeID, item ] of collapsed)
    {
        const level = SkillLevel(item.level);
        const current = levels.get(typeID);

        if (current?.trained >= level) continue;
        const rank = PositiveNumber(item.rank);

        // A partial total is misleading: if rank or current SP is unknown,
        // omit the summary and leave the public requirement list intact.
        if (!rank || (current && current.skillPoints === null)) return null;
        const targetSkillPoints = Math.ceil(250 * rank * (2 ** (2.5 * (level - 1))));
        const currentSkillPoints = current?.skillPoints || 0;
        const missingSkillPoints = Math.max(0, targetSkillPoints - currentSkillPoints);

        skillPointsRequired += missingSkillPoints;
        if (!missingSkillPoints) continue;
        const primary = CharacterAttribute(profile?.attributes, item.primaryAttribute);
        const secondary = CharacterAttribute(profile?.attributes, item.secondaryAttribute);
        const skillPointsPerMinute = primary && secondary ? primary + secondary / 2 : null;

        if (!skillPointsPerMinute)
        {
            timeIsExact = false;
            continue;
        }
        omegaTrainingTimeSeconds += missingSkillPoints / skillPointsPerMinute * 60;
    }

    const result = { skillPointsRequired };

    if (timeIsExact) result.omegaTrainingTimeSeconds = Math.ceil(omegaTrainingTimeSeconds);
    return result;
}

function CharacterAttribute(attributes, attributeID)
{
    const id = PositiveID(attributeID);
    const name = CHARACTER_ATTRIBUTE_NAMES[id];
    const value = name ? Number(attributes?.[name] ?? attributes?.[id]) : NaN;

    return Number.isFinite(value) && value > 0 ? value : null;
}

function Item(typeID, name, quantity = null)
{
    const id = PositiveID(typeID);

    return { typeID: id, name: name || `Type ${id}`, quantity, iconURL: EveTypeIconURL(id, { size: 64 }) };
}

function ProfileSkillLevel(value)
{
    const level = Math.round(Number(value));

    return Number.isFinite(level) ? Math.max(0, Math.min(5, level)) : 0;
}

function MasteryLevel(value)
{
    const level = Math.round(Number(value));

    return Number.isFinite(level) && level > 0 ? Math.min(5, level) : null;
}

function NonNegativeNumber(value)
{
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);

    return Number.isFinite(number) && number >= 0 ? number : null;
}

async function MapConcurrent(records, concurrency, mapper)
{
    const result = new Array(records.length);
    let next = 0;
    const workers = [];

    for (let worker = 0; worker < Math.min(concurrency, records.length); worker++)
    {
        workers.push((async () =>
        {
            while (next < records.length)
            {
                const index = next++;

                result[index] = await mapper(records[index], index);
            }
        })());
    }
    await Promise.all(workers);
    return result;
}

function EscapeRegExp(value)
{
    return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function ThrowIfAborted(signal)
{
    if (signal?.aborted) throw signal.reason || new DOMException("The operation was aborted", "AbortError");
}

function SkinIconURL(iconPath, graphicMaterialSetID)
{
    const fallback = graphicMaterialSetID
        ? `ui/texture/classes/skins/icons/${graphicMaterialSetID}.png`
        : "";
    const path = String(iconPath || fallback)
        .replace(/^res:\/+/iu, "")
        .replace(/^\/+/, "")
        .toLowerCase();

    return path ? `/eve/latest/resources/${path}` : null;
}

function UiResource(path)
{
    return `${UI_ROOT}${String(path || "").replace(/^\/+/, "")}`;
}


function EveTypeIconURL(typeID, { size = 64 } = {})
{
    return EveImageURL("types", typeID, "icon", size);
}

function EveTypeRenderURL(typeID, { size = 512 } = {})
{
    return EveImageURL("types", typeID, "render", size);
}

function EveCorporationLogoURL(corporationID, { size = 64 } = {})
{
    return EveImageURL("corporations", corporationID, "logo", size);
}

function EveImageURL(category, id, variant, size)
{
    const value = PositiveID(id);
    const pixels = Math.round(Number(size));

    if (!value) return null;
    if (!Number.isSafeInteger(pixels) || pixels < 32 || pixels > 1024)
    {
        throw new RangeError("EVE image size must be an integer from 32 to 1024");
    }
    return `${EVE_IMAGE_SERVER}/${category}/${value}/${variant}?size=${pixels}`;
}
