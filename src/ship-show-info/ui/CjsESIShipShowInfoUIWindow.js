import {
    formatShipISK,
    formatShipValue,
    shipShowInfoID
} from "../shipShowInfoModel.js";
import { CjsESIShipShowInfoController } from "../CjsESIShipShowInfoController.js";

const PANEL_NAMES = [ "overview", "attributes", "fitting", "skills", "variations", "industry", "skins" ];

const EVE_UI_RESOURCE_ROOT = "/eve/latest/resources/ui/texture/";
const EVE_IMAGE_SERVER = "https://images.evetech.net";
const PANEL_ICONS = {
    overview: "eveicon/system_icons/info_16px.png",
    attributes: "eveicon/system_icons/attributes_16px.png",
    fitting: "eveicon/system_icons/fitting_16px.png",
    skills: "eveicon/system_icons/skill_book_16px.png",
    variations: "eveicon/system_icons/variation_16px.png",
    industry: "eveicon/category_icons/industry_16px.png",
    skins: "eveicon/system_icons/skins_16px.png"
};
const DAMAGE_ICONS = [
    "classes/damagetypes/electromagnetic.png",
    "classes/damagetypes/thermal.png",
    "classes/damagetypes/kinetic.png",
    "classes/damagetypes/explosive.png"
];
const DAMAGE_NAMES = [ "EM", "Thermal", "Kinetic", "Explosive" ];
const CAMERA_VIEW_NAMES = [ "top", "front", "left", "right", "back", "under" ];

/**
 * Renders an optional EVE-like Ship Show Info window over the shared controller.
 *
 * ESI routes, static-data joins, character scopes, caching, DNA resolution, ccpwgl
 * ownership, and resource acquisition all stop at the injected collaborators.
 */
export class CjsESIShipShowInfoUIWindow
{
    #activePanel = "overview";
    #destroyed = false;
    #generation = 0;
    #selectedSkinKey = null;
    #skinSelectionGeneration = 0;

    constructor({
        root,
        controller = null,
        shipSource = null,
        renderer = null,
        initialTypeID = 28661,
        initialRegionID = 10000002,
        characterID = null,
        onViewMarket = null,
        uiResourceRoot = EVE_UI_RESOURCE_ROOT
    } = {})
    {
        if (!(root instanceof Element)) throw new TypeError("CjsESIShipShowInfoUIWindow requires a root Element");
        if (controller === null)
        {
            controller = new CjsESIShipShowInfoController({ shipSource, renderer });
        }
        if (typeof controller?.Open !== "function" || typeof controller?.SelectPanel !== "function")
        {
            throw new TypeError("CjsESIShipShowInfoUIWindow requires a Show Info controller");
        }

        this.root = root;
        this.controller = controller;
        this.renderer = controller.renderer ?? renderer;
        this.typeID = shipShowInfoID(initialTypeID) ?? 28661;
        this.regionID = shipShowInfoID(initialRegionID) ?? 10000002;
        this.characterID = shipShowInfoID(characterID);
        this.onViewMarket = onViewMarket;
        this.uiResourceRoot = NormalizeResourceRoot(uiResourceRoot);
        this.element = Shell();
        this.#ResolveResourceImages();
        this.root.replaceChildren(this.element);
        this.#ConfigureCameraTools();
        this.#Bind();
    }

    /** Loads the initial ship and mounts the injected render surface. */
    async Start()
    {
        await this.controller.Mount(this.element.querySelector("[data-render-surface]"));
        return this.Open({ typeID: this.typeID, regionID: this.regionID });
    }

    /** Opens one ship and resets every lazily loaded panel. */
    async Open({ typeID = this.typeID, regionID = this.regionID, characterID = this.characterID } = {})
    {
        const nextTypeID = shipShowInfoID(typeID);
        const nextRegionID = shipShowInfoID(regionID);

        if (!nextTypeID) throw new TypeError("typeID must be a positive integer");
        if (!nextRegionID) throw new TypeError("regionID must be a positive integer");

        const generation = ++this.#generation;
        this.typeID = nextTypeID;
        this.regionID = nextRegionID;
        this.characterID = shipShowInfoID(characterID);
        this.#selectedSkinKey = null;
        ++this.#skinSelectionGeneration;
        this.#SetLoading(true, "Loading ship data\u2026");

        try
        {
            const ship = await this.controller.Open({
                typeID: this.typeID,
                regionID: this.regionID,
                characterID: this.characterID
            });

            if (generation !== this.#generation || this.#destroyed) return null;
            this.ship = ship;

            if (!this.ship || shipShowInfoID(this.ship.typeID) !== this.typeID)
            {
                throw new Error("Ship source returned the wrong type");
            }

            this.#RenderIdentity();
            this.#FetchPrice(generation);
            await this.SelectPanel("overview");
            if (generation !== this.#generation || this.#destroyed) return null;
            this.#SetLoading(false);
            this.element.dispatchEvent(new CustomEvent("shipshowinfochange", {
                bubbles: true,
                detail: { typeID: this.typeID, regionID: this.regionID, ship: this.ship }
            }));
            return this.ship;
        }
        catch (error)
        {
            if (error?.name === "AbortError") return null;
            this.#ShowError(error);
            throw error;
        }
    }

    /** Selects and, on first use, asks the external source for one ship panel. */
    async SelectPanel(name)
    {
        if (!PANEL_NAMES.includes(name)) throw new TypeError(`Unknown ship panel: ${name}`);

        const generation = this.#generation;
        this.#activePanel = name;
        this.#SyncCameraView(null);
        this.#SyncNavigation();
        this.#RenderStagePanel(name);
        this.#SetPanelStatus("Loading panel\u2026");

        try
        {
            const data = await this.controller.SelectPanel(name);

            if (generation !== this.#generation || this.#activePanel !== name || this.#destroyed) return data;
            this.#RenderPanel(name, data ?? {});
            return data;
        }
        catch (error)
        {
            if (error?.name === "AbortError") return null;
            if (this.#activePanel === name) this.#SetPanelStatus(error?.message || "Panel failed to load", true);
            throw error;
        }
    }

    /** Releases listeners owned by this window and its render adapter. */
    async Destroy()
    {
        this.#destroyed = true;
        this.#generation++;
        this.element.remove();
        await this.controller.Destroy();
    }

    #FetchPrice(generation)
    {
        this.controller.FetchPrice().then(record =>
        {
            if (generation !== this.#generation || this.#destroyed) return;

            const estimatedPrice = Number(record?.estimatedPrice);

            if (Number.isFinite(estimatedPrice) && estimatedPrice > 0) this.ship.estimatedPrice = estimatedPrice;
            else delete this.ship.estimatedPrice;
            this.#RenderPrice();

            const fitting = this.controller.Snapshot().panels.fitting;

            if (this.#activePanel === "fitting" && fitting) this.#RenderStagePanel("fitting", fitting);
        }, error =>
        {
            if (error?.name !== "AbortError") console.warn("ship Show Info market estimate:", error);
        });
    }

    #ConfigureCameraTools()
    {
        const tools = this.element.querySelector("[data-camera-tools]");
        const views = this.element.querySelector("[data-camera-views]");
        const auto = this.element.querySelector("[data-camera-auto-control]");
        const canSelectView = typeof this.renderer?.SelectCameraView === "function";
        const canAutoRotate = typeof this.renderer?.SetAutoRotate === "function";

        tools.hidden = !canSelectView && !canAutoRotate;
        views.hidden = !canSelectView;
        auto.hidden = !canAutoRotate;
    }

    #SelectCameraView(view)
    {
        if (!CAMERA_VIEW_NAMES.includes(view)) throw new TypeError(`Unknown camera view: ${view}`);

        this.#SetAutoRotate(false);
        this.#SyncCameraView(view);

        try
        {
            this.renderer?.SelectCameraView?.({
                view,
                ship: this.ship
            });
        }
        catch (error)
        {
            if (error?.name !== "AbortError") console.warn("ship Show Info camera view:", error);
        }

        this.element.dispatchEvent(new CustomEvent("shipshowinfocameraviewchange", {
            bubbles: true,
            detail: { view, ship: this.ship }
        }));
    }

    #SetAutoRotate(enabled)
    {
        const next = Boolean(enabled);

        if (next) this.#SyncCameraView(null);
        this.element.querySelector("[data-camera-auto]").checked = next;

        try
        {
            this.renderer?.SetAutoRotate?.({
                enabled: next,
                ship: this.ship
            });
        }
        catch (error)
        {
            if (error?.name !== "AbortError") console.warn("ship Show Info auto rotate:", error);
        }

        this.element.dispatchEvent(new CustomEvent("shipshowinfocameraautorotatechange", {
            bubbles: true,
            detail: { enabled: next, ship: this.ship }
        }));
    }

    #SyncCameraView(view)
    {
        for (const button of this.element.querySelectorAll("[data-camera-view]"))
        {
            const active = button.dataset.cameraView === view;

            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        }
    }

    #Bind()
    {
        this.element.querySelector("[data-nav]").addEventListener("click", event =>
        {
            const button = event.target.closest("[data-panel]");

            if (button) this.SelectPanel(button.dataset.panel).catch(() => {});
        });

        this.element.querySelector("[data-nav-toggle]").addEventListener("click", () =>
        {
            const collapsed = this.element.classList.toggle("is-nav-collapsed");

            this.element.querySelector("[data-nav-toggle]").setAttribute("aria-expanded", String(!collapsed));
        });

        this.element.querySelector("[data-nav]").addEventListener("keydown", event =>
        {
            if (![ "ArrowDown", "ArrowUp", "Home", "End" ].includes(event.key)) return;

            event.preventDefault();
            const current = PANEL_NAMES.indexOf(this.#activePanel);
            let next = current;

            if (event.key === "Home") next = 0;
            else if (event.key === "End") next = PANEL_NAMES.length - 1;
            else if (event.key === "ArrowDown") next = (current + 1) % PANEL_NAMES.length;
            else next = (current + PANEL_NAMES.length - 1) % PANEL_NAMES.length;

            const button = this.element.querySelector(`[data-panel="${PANEL_NAMES[next]}"]`);

            button?.focus();
            this.SelectPanel(PANEL_NAMES[next]).catch(() => {});
        });

        this.element.querySelector("[data-camera-views]").addEventListener("click", event =>
        {
            const button = event.target.closest("[data-camera-view]");

            if (button) this.#SelectCameraView(button.dataset.cameraView);
        });

        this.element.querySelector("[data-camera-auto]").addEventListener("change", event =>
        {
            this.#SetAutoRotate(event.currentTarget.checked);
        });

        this.element.querySelector("[data-view-market]").addEventListener("click", () =>
        {
            this.#ViewMarket();
        });

        this.element.querySelector("[data-stage-overlay]").addEventListener("click", event =>
        {
            const button = event.target.closest("[data-stage-action]");

            if (!button) return;
            if (button.dataset.stageAction === "market")
            {
                this.element.querySelector("[data-view-market]").click();
                return;
            }

            this.element.dispatchEvent(new CustomEvent("shipshowinfoaction", {
                bubbles: true,
                detail: {
                    action: button.dataset.stageAction,
                    typeID: this.typeID,
                    regionID: this.regionID,
                    ship: this.ship
                }
            }));
        });

        this.element.querySelector("[data-close]").addEventListener("click", () =>
        {
            this.element.dispatchEvent(new CustomEvent("shipshowinfoclose", { bubbles: true }));
        });
    }

    #RenderIdentity()
    {
        const ship = this.ship;

        SetText(this.element, "[data-title]", `${ship.name} (${ship.groupName || "Ship"}): Information`);
        SetText(this.element, "[data-ship-name]", ship.name);
        SetText(this.element, "[data-ship-group]", ship.groupName || "Ship");
        SetText(this.element, "[data-ship-meta]", ship.metaLabel || "");
        this.#RenderPrice();

        const icon = this.element.querySelector("[data-nav-icon]");
        const viewer = ship.viewer;
        const viewerIconURL = viewer?.iconURL || EveCharacterPortraitURL(viewer?.characterID, { size: 64 });

        this.element.dataset.viewerState = ship.viewerState?.status || (viewer ? "authenticated" : "anonymous");
        SetText(this.element, "[data-nav-primary]", viewer?.name || ship.name);
        SetText(
            this.element,
            "[data-nav-secondary]",
            viewer ? viewer.corporationName || "Capsuleer" : ship.groupName || "Ship"
        );
        icon.src = viewerIconURL || ship.iconURL || "";
        icon.alt = viewer?.name || ship.name;
        icon.title = viewer?.name || ship.name;

        const faction = this.element.querySelector("[data-faction-backdrop]");

        faction.style.setProperty("--faction-accent", ship.faction?.accent || "#4b9894");
        faction.style.backgroundImage = ship.faction?.backdropURL ? `url("${ship.faction.backdropURL}")` : "";

        const manufacturers = this.element.querySelector("[data-manufacturers]");

        manufacturers.replaceChildren();
        for (const manufacturer of Array.isArray(ship.manufacturers) ? ship.manufacturers : [])
        {
            if (!manufacturer?.iconURL) continue;

            const image = document.createElement("img");

            image.src = manufacturer.iconURL;
            image.alt = manufacturer.name || "Ship manufacturer";
            image.title = manufacturer.name || "Ship manufacturer";
            image.addEventListener("error", () =>
            {
                image.remove();
                manufacturers.hidden = !manufacturers.childElementCount;
            }, { once: true });
            manufacturers.appendChild(image);
        }
        manufacturers.hidden = !manufacturers.childElementCount;
    }

    #RenderPrice()
    {
        const row = this.element.querySelector("[data-price-row]");
        const available = Number.isFinite(Number(this.ship?.estimatedPrice));

        row.hidden = !available;
        SetText(this.element, "[data-price]", available ? formatShipISK(this.ship.estimatedPrice) : "");
    }

    #RenderPanel(name, data)
    {
        const panel = this.element.querySelector("[data-panel-content]");

        panel.replaceChildren();
        panel.dataset.currentPanel = name;
        this.#RenderStagePanel(name, data);

        if (name === "overview") panel.appendChild(OverviewPanel(data));
        else if (name === "attributes") panel.appendChild(AttributesPanel(data));
        else if (name === "fitting") panel.appendChild(FittingPanel(data));
        else if (name === "skills") panel.appendChild(SkillsPanel(data));
        else if (name === "variations") panel.appendChild(VariationsPanel(data, variation => this.#SelectVariation(variation)));
        else if (name === "industry") panel.appendChild(IndustryPanel(data));
        else if (name === "skins") panel.appendChild(SkinsPanel(
            data,
            skin => this.#SelectSkin(skin),
            skin => this.#ViewMarket(skin.licenseTypeID, skin),
            () => this.#OpenParagonHub(),
            this.#selectedSkinKey
        ));
        this.#ResolveResourceImages(panel);
    }

    #RenderStagePanel(name, data = null)
    {
        this.element.dataset.activePanel = name;

        const caption = this.element.querySelector("[data-axis-caption]");
        const overlay = this.element.querySelector("[data-stage-overlay]");
        const axis = Number(data?.longAxis ?? this.ship?.longAxis);
        const visible = name === "attributes" && Number.isFinite(axis) && axis > 0;

        overlay.replaceChildren();
        caption.hidden = !visible;
        SetText(caption, "[data-long-axis]", visible ? formatShipValue(Math.round(axis), "m") : "");

        if (name === "fitting" && data)
        {
            overlay.appendChild(FittingStageOverlay(data, this.ship));
        }
        else if (name === "skills" && data)
        {
            const mastery = MasteryStage(data);

            if (mastery) overlay.appendChild(mastery);
            overlay.appendChild(StageActions());
        }
        this.#ResolveResourceImages(overlay);
    }

    #ResolveResourceImages(root = this.element)
    {
        for (const image of root.querySelectorAll("img[data-eve-ui-resource]"))
        {
            image.src = `${this.uiResourceRoot}${image.dataset.eveUiResource}`;
        }
    }

    async #SelectSkin(skin)
    {
        const selectedKey = SkinKey(skin);
        const previousKey = this.#selectedSkinKey;
        const selectedSkin = previousKey === selectedKey ? null : skin;
        const generation = ++this.#skinSelectionGeneration;

        this.#selectedSkinKey = selectedSkin ? selectedKey : null;
        this.#SyncSkinSelection();

        try
        {
            await this.controller.SelectSkin(selectedSkin);
        }
        catch (error)
        {
            if (generation === this.#skinSelectionGeneration)
            {
                this.#selectedSkinKey = previousKey;
                this.#SyncSkinSelection();
            }
            throw error;
        }

        if (generation !== this.#skinSelectionGeneration || this.#destroyed) return;

        this.element.dispatchEvent(new CustomEvent("shipshowinfoskinchange", {
            bubbles: true,
            detail: { typeID: this.typeID, skin: selectedSkin }
        }));
    }

    #SyncSkinSelection()
    {
        for (const row of this.element.querySelectorAll("[data-skin-key]"))
        {
            const selected = row.dataset.skinKey === this.#selectedSkinKey;

            row.classList.toggle("active", selected);
            row.querySelector("[data-skin-preview]")?.setAttribute("aria-pressed", String(selected));
        }
    }

    #ViewMarket(typeID = this.typeID, skin = null)
    {
        const detail = {
            typeID: shipShowInfoID(typeID) ?? this.typeID,
            regionID: this.regionID,
            ship: this.ship
        };

        if (skin) detail.skin = skin;
        this.element.dispatchEvent(new CustomEvent("shipshowinfoviewmarket", { bubbles: true, detail }));
        this.onViewMarket?.(detail);
    }

    #OpenParagonHub()
    {
        this.element.dispatchEvent(new CustomEvent("shipshowinfoparagonhub", {
            bubbles: true,
            detail: { typeID: this.typeID, regionID: this.regionID, ship: this.ship }
        }));
    }

    /** Loads a selected variation into this window, then keeps the family open. */
    async #SelectVariation(variation)
    {
        const typeID = shipShowInfoID(variation?.typeID);

        if (!typeID || typeID === this.typeID) return this.ship;

        try
        {
            const ship = await this.Open({
                typeID,
                regionID: this.regionID,
                characterID: this.characterID
            });

            if (ship && !this.#destroyed) await this.SelectPanel("variations");

            return ship;
        }
        catch
        {
            // Open already renders the source failure in the panel.
            return null;
        }
    }

    #SyncNavigation()
    {
        const buttons = this.element.querySelectorAll("[data-panel]");

        for (const button of buttons)
        {
            const active = button.dataset.panel === this.#activePanel;

            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
            button.tabIndex = active ? 0 : -1;
        }
    }

    #SetLoading(loading, text = "")
    {
        this.element.classList.toggle("is-loading", loading);
        SetText(this.element, "[data-global-status]", text);
        this.element.querySelector("[data-global-status]").hidden = !text;
    }

    #SetPanelStatus(text, error = false)
    {
        const panel = this.element.querySelector("[data-panel-content]");
        const status = document.createElement("div");

        status.className = `ship-info-panel-status${error ? " error" : ""}`;
        status.textContent = text;
        panel.replaceChildren(status);
    }

    #ShowError(error)
    {
        this.#SetLoading(false);
        this.#SetPanelStatus(error?.message || "Ship information failed to load", true);
    }
}

function Shell()
{
    const host = document.createElement("section");

    host.className = "ship-show-info-host ship-show-info-window";
    host.innerHTML = `
        <header class="ship-info-titlebar">
            <span class="ship-info-title-mark" aria-hidden="true"></span>
            <strong data-title>Ship Information</strong>
            <div class="ship-info-window-actions" aria-label="Window controls">
                ${IconButton("eveicon/system_icons/link_16px.png", "Copy link")}
                ${IconButton("eveicon/system_icons/navigate_back_16px.png", "Previous")}
                ${IconButton("eveicon/system_icons/navigate_forward_16px.png", "Next")}
                <span class="ship-info-window-more" aria-hidden="true">${StaticIcon("eveicon/system_icons/more_vertical_16px.png")}</span>
                ${IconButton("eveicon/system_icons/close_16px.png", "Close", "data-close")}
            </div>
        </header>
        <div class="ship-info-body">
            <nav class="ship-info-nav" data-nav aria-label="Ship information panels" role="tablist" aria-orientation="vertical">
                <div class="ship-info-nav-identity">
                    <img data-nav-icon alt="">
                    <span><strong data-nav-primary>Ship</strong><small data-nav-secondary>Ship</small></span>
                </div>
                ${NavButton("overview", "Overview", true)}
                ${NavButton("attributes", "Attributes")}
                ${NavButton("fitting", "Fitting")}
                ${NavButton("skills", "Skills")}
                ${NavButton("variations", "Variations")}
                ${NavButton("industry", "Industry")}
                ${NavButton("skins", "SKINs")}
                <button class="ship-info-nav-toggle" type="button" data-nav-toggle aria-expanded="true" title="Collapse navigation">
                    <span aria-hidden="true">&laquo;</span><span class="label">Collapse</span>
                </button>
            </nav>
            <main class="ship-info-stage">
                <div class="ship-info-faction-backdrop" data-faction-backdrop aria-hidden="true"></div>
                <div class="ship-info-render-surface" data-render-surface aria-label="Interactive ship preview"></div>
                ${CameraTools()}
                <div class="ship-info-stage-overlay" data-stage-overlay></div>
                <div class="ship-info-identity-card">
                    <div class="ship-info-manufacturers" data-manufacturers aria-label="Ship manufacturers" hidden></div>
                    <div class="ship-info-meta"><span data-ship-group>Ship</span><em data-ship-meta></em></div>
                    <strong data-ship-name>Ship</strong>
                    <small data-price-row hidden><span>Est. price</span> <b data-price></b></small>
                </div>
                <div class="ship-info-axis-caption" data-axis-caption hidden>
                    <small>Long axis:</small>
                    <strong data-long-axis></strong>
                </div>
                <div class="ship-info-stage-status" data-global-status role="status" hidden></div>
                <button class="ship-info-market-button" type="button" data-view-market>View Market Details</button>
            </main>
            <aside class="ship-info-panel" data-panel-content aria-live="polite"></aside>
        </div>`;
    return host;
}

function CameraTools()
{
    return `<div class="ship-info-camera-tools" data-camera-tools aria-label="Camera controls">
        <div class="ship-info-camera-views" data-camera-views role="group" aria-label="Preset camera views">
            ${CameraViewButton("top", "Top")}
            ${CameraViewButton("front", "Front")}
            ${CameraViewButton("left", "Left")}
            ${CameraViewButton("right", "Right")}
            ${CameraViewButton("back", "Back")}
            ${CameraViewButton("under", "Under")}
        </div>
        <label class="ship-info-camera-auto" data-camera-auto-control title="Auto orbit camera">
            <input type="checkbox" data-camera-auto>
            <span>Auto rotate</span>
        </label>
    </div>`;
}

function CameraViewButton(view, label)
{
    return `<button type="button" data-camera-view="${view}" aria-label="${label} view" aria-pressed="false" title="${label} view">${label}</button>`;
}

function NavButton(name, label, active = false)
{
    return `<button type="button" class="ship-info-nav-button${active ? " active" : ""}" data-panel="${name}" role="tab" aria-selected="${active}" tabindex="${active ? 0 : -1}"><span class="icon" aria-hidden="true">${StaticIcon(PANEL_ICONS[name])}</span><span class="label">${label}</span></button>`;
}

function IconButton(iconPath, label, attribute = "")
{
    return `<button type="button" ${attribute} aria-label="${label}" title="${label}">${StaticIcon(iconPath)}</button>`;
}

function StaticIcon(path)
{
    const resource = String(path || "").replace(/^\/+/, "");

    return `<img src="${UiResource(resource)}" data-eve-ui-resource="${resource}" alt="">`;
}

function OverviewPanel(data)
{
    const root = Section("ship-info-overview");

    if (data.quote)
    {
        const quote = document.createElement("blockquote");
        const text = document.createElement("p");
        const author = document.createElement("cite");

        text.textContent = data.quote.text || "";
        author.textContent = data.quote.author ? `\u2014 ${data.quote.author}` : "";
        quote.append(text, author);
        root.appendChild(quote);
    }

    if (data.description)
    {
        const description = document.createElement("p");

        description.className = "ship-info-description";
        description.textContent = data.description;
        root.appendChild(description);
    }

    if (Array.isArray(data.characteristics) && data.characteristics.length)
    {
        const heading = Heading("Ship Characteristics:");
        const strip = document.createElement("div");

        strip.className = "ship-info-characteristics";
        for (const item of data.characteristics)
        {
            const badge = document.createElement("span");

            badge.title = item.name || "";
            if (item.iconURL) badge.appendChild(ImageIcon(item.iconURL));
            else badge.textContent = item.symbol || "\u25c6";
            strip.appendChild(badge);
        }
        root.append(heading, strip);
    }

    for (const group of data.bonuses ?? [])
    {
        root.appendChild(Heading(group.heading || "Bonus:"));
        const list = document.createElement("ul");

        for (const line of group.lines ?? [])
        {
            const item = document.createElement("li");

            item.textContent = line;
            list.appendChild(item);
        }
        root.appendChild(list);
    }
    if (!root.childElementCount) root.appendChild(EmptyPanel("Overview data is unavailable for this hull."));
    return root;
}

function AttributesPanel(data)
{
    const root = Section("ship-info-attributes");
    const groups = Array.isArray(data.groups) ? data.groups : [];

    if (!groups.length)
    {
        const empty = document.createElement("p");

        empty.className = "ship-info-empty";
        empty.textContent = "Attribute data is unavailable for this hull.";
        root.appendChild(empty);
    }

    for (const group of groups) root.appendChild(AttributeGroup(group));
    return root;
}

function AttributeGroup(group)
{
    const section = document.createElement("details");
    const header = document.createElement("summary");
    const identity = document.createElement("span");
    const title = document.createElement("strong");
    const summary = document.createElement("span");
    const chevron = ImageIcon(UiResource("eveicon/system_icons/chevron_up_16px.png"));
    const body = document.createElement("div");

    section.className = "ship-info-attribute-group";
    section.open = group.collapsed !== true;
    identity.className = "ship-info-attribute-title";
    summary.className = "ship-info-attribute-summary";
    chevron.className = "ship-info-attribute-chevron";
    body.className = "ship-info-attribute-body";
    if (group.iconURL) identity.appendChild(ImageIcon(group.iconURL));
    title.textContent = group.name || "Attributes";
    summary.textContent = group.summary || "";
    identity.appendChild(title);
    header.append(identity, summary, chevron);

    if (Array.isArray(group.resistances)) body.appendChild(ResistanceStrip(group.resistances));
    for (const row of group.rows ?? []) body.appendChild(ValueRow(row));
    section.append(header, body);
    return section;
}

function ResistanceStrip(resistances)
{
    const strip = document.createElement("div");
    const tones = [ "em", "thermal", "kinetic", "explosive" ];

    strip.className = "ship-info-resistances";
    for (let index = 0; index < resistances.length; index++)
    {
        const value = resistances[index];
        const cell = document.createElement("span");
        const icon = ImageIcon(UiResource(DAMAGE_ICONS[index]));
        const amount = document.createElement("b");

        cell.className = tones[index] || "resistance";
        cell.title = DAMAGE_NAMES[index] || "Resistance";
        amount.textContent = `${formatShipValue(value)}%`;
        cell.append(icon, amount);
        strip.appendChild(cell);
    }
    return strip;
}

function FittingPanel(data)
{
    const root = Section("ship-info-fitting");
    const header = document.createElement("header");
    const link = ImageIcon(UiResource("eveicon/system_icons/link_16px.png"));

    header.className = "ship-info-panel-heading";
    link.className = "ship-info-panel-heading-icon";
    header.append(link, Heading("Fitting"));
    root.appendChild(header);
    const rows = Array.isArray(data.rows) ? data.rows : [];

    for (const row of rows) root.appendChild(ValueRow(row));

    if (Array.isArray(data.hardpoints) && data.hardpoints.length)
    {
        const hardpoints = document.createElement("div");

        hardpoints.className = "ship-info-hardpoints";
        for (const point of data.hardpoints)
        {
            const cell = document.createElement("span");
            const count = document.createElement("b");

            cell.title = point.name || "Hardpoint";
            if (point.iconURL) cell.appendChild(ImageIcon(point.iconURL));
            count.textContent = String(Number(point.used) || 0);
            cell.appendChild(count);
            hardpoints.appendChild(cell);
        }
        root.appendChild(hardpoints);
    }
    if (!rows.length && !data.hardpoints?.length)
    {
        root.appendChild(EmptyPanel("Fitting data is unavailable for this hull."));
    }
    return root;
}

function SkillsPanel(data)
{
    const root = Section("ship-info-skills");
    const tiers = document.createElement("div");
    const requirements = Array.isArray(data.requirements) ? data.requirements : [];
    const hasSkillProfile = Number.isFinite(Number(data.masteryLevel));
    const masteryLevel = MasteryLevel(data.masteryLevel);
    const profileNotice = SkillProfileNotice(data.profileState);

    if (profileNotice) root.appendChild(profileNotice);

    tiers.className = "ship-info-mastery-tiers";
    if (hasSkillProfile) for (const tier of data.tiers ?? [])
    {
        const card = document.createElement("span");
        const level = MasteryLevel(tier.level);
        const badge = ImageIcon(UiResource(`classes/mastery/masterysmall${level}.png`));

        card.className = level === masteryLevel ? "active" : "";
        card.title = level ? `Mastery ${Roman(level)}` : "No mastery completed";
        badge.className = "ship-info-mastery-badge";
        card.appendChild(badge);
        if (tier.complete === true)
        {
            const complete = ImageIcon(UiResource("eveicon/system_icons/circle_checkmark_16px.png"));

            complete.className = "ship-info-mastery-complete";
            complete.title = "Requirements met";
            card.appendChild(complete);
        }
        tiers.appendChild(card);
    }
    if (tiers.childElementCount) root.appendChild(tiers);

    for (const requirement of requirements)
    {
        const row = document.createElement("div");
        const blocks = document.createElement("span");
        const label = document.createElement("span");
        const state = document.createElement("span");
        const depth = Number(requirement.depth);

        row.className = "ship-info-skill-row";
        if (Number.isSafeInteger(depth) && depth > 0)
        {
            row.classList.add("prerequisite");
            row.dataset.depth = String(depth);
            row.style.setProperty("--skill-depth", String(Math.min(depth, 6)));
        }
        blocks.className = "levels";
        for (let level = 1; level <= 5; level++)
        {
            const block = document.createElement("i");

            block.className = level <= Number(requirement.level) ? "active" : "";
            blocks.appendChild(block);
        }
        label.textContent = `${requirement.name} ${Roman(requirement.level)}`;
        state.className = requirement.complete === true ? "complete" : "incomplete";
        if (hasSkillProfile)
        {
            const complete = requirement.complete === true;
            const status = ImageIcon(UiResource(complete
                ? "eveicon/system_icons/circle_checkmark_16px.png"
                : "classes/skills/skillrequirementnotmet.png"));

            status.title = complete ? "Requirement met" : "Requirement not met";
            state.appendChild(status);
        }
        else
        {
            state.hidden = true;
        }
        row.append(blocks, label, state);
        root.appendChild(row);
    }
    const training = TrainingSummary(data.training);

    if (training)
    {
        root.classList.add("has-training");
        root.appendChild(training);
    }
    if (!tiers.childElementCount && !requirements.length)
    {
        root.appendChild(EmptyPanel("Skill requirements are unavailable for this hull."));
    }
    return root;
}

function TrainingSummary(training)
{
    const skillPoints = Number(training?.skillPointsRequired);
    const trainingTime = Number(training?.omegaTrainingTimeSeconds);
    const hasSkillPoints = Number.isFinite(skillPoints) && skillPoints >= 0;
    const hasTrainingTime = Number.isFinite(trainingTime) && trainingTime >= 0;

    if (!hasSkillPoints && !hasTrainingTime) return null;
    const root = Section("ship-info-skill-training");

    if (hasTrainingTime)
    {
        const row = document.createElement("p");
        const label = document.createElement("span");
        const value = document.createElement("strong");

        label.textContent = "Omega Training Time";
        value.textContent = FormatTrainingDuration(trainingTime);
        row.append(label, value);
        root.appendChild(row);
    }
    if (hasSkillPoints)
    {
        const row = document.createElement("p");
        const label = document.createElement("span");
        const value = document.createElement("strong");

        label.textContent = "Skill Points Required";
        value.textContent = new Intl.NumberFormat("en").format(Math.ceil(skillPoints));
        row.append(label, value);
        root.appendChild(row);
    }
    return root;
}

function SkillProfileNotice(state)
{
    if (!state || state.status === "available") return null;

    const copy = {
        anonymous: "Sign in to compare these requirements with a character.",
        "reauthorization-required": "Sign in again to authorize character skills.",
        unsupported: "Character skills are not available from this session provider.",
        unavailable: "Character skills are temporarily unavailable. Public requirements are shown."
    }[state.status];

    if (!copy) return null;

    const root = document.createElement("p");

    root.className = "ship-info-skill-profile-state";
    root.textContent = copy;
    if (state.message) root.title = state.message;
    if (state.actionURL)
    {
        const action = document.createElement("a");

        action.href = state.actionURL;
        action.textContent = state.status === "reauthorization-required" ? "Sign in again" : "Sign in";
        root.appendChild(action);
    }
    return root;
}

function EmptyPanel(message)
{
    const empty = document.createElement("p");

    empty.className = "ship-info-empty";
    empty.textContent = message;
    return empty;
}

function FittingStageOverlay(data, ship)
{
    const root = Section("ship-info-fitting-stage-overlay");
    const summary = FittingSummary(data.metrics);

    if (Number.isFinite(Number(ship?.estimatedPrice)))
    {
        const price = document.createElement("div");
        const label = document.createElement("small");
        const value = document.createElement("strong");

        price.className = "ship-info-fitting-price";
        label.textContent = "Estimated Price";
        value.textContent = formatShipISK(ship.estimatedPrice);
        price.append(label, value);
        root.appendChild(price);
    }

    if (summary) root.appendChild(summary);
    root.appendChild(StageActions());
    return root;
}

function FittingSummary(metrics)
{
    if (!metrics || typeof metrics !== "object") return null;

    const root = Section("ship-info-fitting-summary");
    const offense = FiniteMetric("Offense", metrics.offenseDps, "dps");
    const defense = FiniteMetric("Defense", metrics.defenseEhp, "ehp");
    const align = Number(metrics.alignTimeSeconds);

    if (offense) root.appendChild(offense);
    if (defense) root.appendChild(defense);
    if (Number.isFinite(align)) root.appendChild(SummaryMetric("Align Time", `${align.toFixed(2)}s`));

    const capacitor = metrics.capacitor;

    if (capacitor && typeof capacitor === "object") root.appendChild(CapacitorSummary(capacitor));
    return root.childElementCount ? root : null;
}

function FiniteMetric(label, value, unit)
{
    return Number.isFinite(Number(value)) ? SummaryMetric(label, formatShipValue(Number(value), unit)) : null;
}

function SummaryMetric(labelText, valueText)
{
    const row = document.createElement("div");
    const label = document.createElement("small");
    const value = document.createElement("strong");

    row.className = "ship-info-fitting-metric";
    label.textContent = labelText;
    value.textContent = valueText;
    row.append(label, value);
    return row;
}

function CapacitorSummary(capacitor)
{
    const root = document.createElement("div");
    const gauge = document.createElement("span");
    const copy = document.createElement("span");
    const status = document.createElement("strong");
    const capacity = document.createElement("small");
    const recharge = document.createElement("small");
    const percent = Math.max(0, Math.min(100, Number(capacitor.percent) || 0));
    const activeCells = Math.round(percent / 100 * 12);

    root.className = "ship-info-capacitor-summary";
    gauge.className = "ship-info-capacitor-gauge";
    for (let index = 0; index < 12; index++)
    {
        const cell = ImageIcon(UiResource("classes/shipui/capacitorcell.png"));

        cell.className = index < activeCells ? "active" : "";
        cell.style.setProperty("--cell-index", index);
        gauge.appendChild(cell);
    }

    status.textContent = capacitor.stable === true ? "Capacitor: Stable" : "Capacitor";
    if (Number.isFinite(Number(capacitor.capacityGJ)))
    {
        capacity.textContent = `${formatShipValue(Number(capacitor.capacityGJ), "GJ")} / ${FormatDuration(capacitor.durationSeconds)}`;
    }
    if (Number.isFinite(Number(capacitor.deltaGJPerSecond)))
    {
        const delta = Number(capacitor.deltaGJPerSecond);

        recharge.textContent = `${delta >= 0 ? "+" : ""}${formatShipValue(delta, "GJ/s")} (${percent.toFixed(1)}%)`;
    }
    copy.append(status, capacity, recharge);
    root.append(gauge, copy);
    return root;
}

function MasteryStage(data)
{
    if (!Number.isFinite(Number(data.masteryLevel))) return null;

    const level = MasteryLevel(data.masteryLevel);
    const root = document.createElement("figure");
    const emblem = document.createElement("span");
    const art = ImageIcon(UiResource(`classes/mastery/mastery${level}.png`));
    const numeral = document.createElement("b");
    const caption = document.createElement("figcaption");

    root.className = "ship-info-mastery-stage";
    root.dataset.masteryLevel = String(level);
    emblem.className = "ship-info-mastery-emblem";
    art.className = "ship-info-mastery-emblem-art";
    numeral.className = "ship-info-mastery-emblem-numeral";
    numeral.textContent = level ? Roman(level) : "!";
    emblem.append(art, numeral);
    caption.textContent = data.masteryCaption || `Mastery Level ${level}`;
    root.append(emblem, caption);
    return root;
}

function StageActions()
{
    const root = Section("ship-info-stage-actions");

    root.append(
        StageAction("simulate-fit", "eveicon/system_icons/simulate_fitting_16px.png", "Simulate Fit"),
        StageAction("ship-tree", "eveicon/system_icons/ship_tree_16px.png", "Show in Ship Tree"),
        StageAction("market", "eveicon/system_icons/market_details_16px.png", "View Market Details")
    );
    return root;
}

function StageAction(action, iconPath, label)
{
    const button = document.createElement("button");

    button.type = "button";
    button.dataset.stageAction = action;
    button.innerHTML = `${StaticIcon(iconPath)}<span>${label}</span>`;
    return button;
}

function VariationsPanel(data, onSelect)
{
    const root = Section("ship-info-variations");

    for (const variation of data.variations ?? [])
    {
        const card = document.createElement("button");
        const image = document.createElement("img");
        const copy = document.createElement("span");
        const group = document.createElement("small");
        const name = document.createElement("strong");

        card.type = "button";
        card.className = variation.typeID === data.selectedTypeID ? "active" : "";
        card.dataset.typeID = variation.typeID;
        card.setAttribute("aria-current", variation.typeID === data.selectedTypeID ? "true" : "false");
        image.src = variation.iconURL || "";
        image.alt = "";
        group.textContent = variation.groupName || "Ship";
        name.textContent = variation.name || `Type ${variation.typeID}`;
        copy.append(group, name);
        card.append(image, copy);
        card.addEventListener("click", () => onSelect(variation));
        root.appendChild(card);
    }
    return root;
}

function IndustryPanel(data)
{
    const root = Section("ship-info-industry");

    if (data.blueprint)
    {
        root.appendChild(Heading("Blueprint"));
        root.appendChild(ItemRow(data.blueprint));
    }
    root.appendChild(Heading("Reprocessed materials"));
    for (const material of data.materials ?? []) root.appendChild(ItemRow(material));
    return root;
}

function SkinsPanel(data, onSelect, onBuy, onOpenParagon, selectedSkinKey = null)
{
    const root = Section("ship-info-skins");
    const owned = Array.isArray(data.owned) ? data.owned : [];
    const ownedKeys = new Set(owned.map(SkinKey));
    const available = (data.skins ?? []).filter(skin => !ownedKeys.has(SkinKey(skin)));
    const shipName = data.shipName || "ship";

    root.appendChild(ParagonPromotion(onOpenParagon));

    if (owned.length)
    {
        root.appendChild(SkinSectionHeading(`Your SKINs for the ${shipName}`));
        const ownedRows = Section("ship-info-skin-rows owned");

        for (const skin of owned) ownedRows.appendChild(SkinRow(skin, onSelect, onBuy, {
            owned: true,
            selected: SkinKey(skin) === selectedSkinKey
        }));
        root.appendChild(ownedRows);
    }

    root.appendChild(SkinSectionHeading(`Other available SKINs for the ${shipName}`));
    if (!available.length)
    {
        const empty = document.createElement("p");

        empty.className = "ship-info-skin-empty";
        empty.textContent = "No compatible SKINs supplied";
        root.appendChild(empty);
        return root;
    }

    const rows = Section("ship-info-skin-rows");

    for (const skin of available) rows.appendChild(SkinRow(skin, onSelect, onBuy, {
        selected: SkinKey(skin) === selectedSkinKey
    }));
    root.appendChild(rows);
    return root;
}

function ParagonPromotion(onOpen)
{
    const root = Section("ship-info-paragon-promotion");
    const heading = document.createElement("div");
    const logo = ImageIcon(`${EVE_UI_RESOURCE_ROOT}classes/cosmetics/ship/paragon_logo.png`);
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const summary = document.createElement("small");
    const button = document.createElement("button");

    name.textContent = "Paragon Hub";
    summary.textContent = "Buy and sell SKINs designed by capsuleers";
    copy.append(name, summary);
    heading.append(logo, copy);
    button.type = "button";
    button.textContent = "View Sequenced SKINs";
    button.addEventListener("click", onOpen);
    root.append(heading, button);
    return root;
}

function SkinSectionHeading(text)
{
    const heading = document.createElement("h3");

    heading.className = "ship-info-skin-caption";
    heading.textContent = text;
    return heading;
}

function SkinRow(skin, onSelect, onBuy, { owned = false, selected = false } = {})
{
    const row = Section(`ship-info-skin-row${owned ? " owned" : ""}`);
    const previewButton = document.createElement("button");
    const preview = document.createElement("img");
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const status = document.createElement("small");

    row.dataset.skinKey = SkinKey(skin);
    row.classList.toggle("active", selected);
    previewButton.type = "button";
    previewButton.className = "ship-info-skin-preview-button";
    previewButton.dataset.skinPreview = "";
    previewButton.setAttribute("aria-pressed", String(selected));
    previewButton.setAttribute("aria-label", `Preview ${skin.name || "SKIN"}`);
    preview.src = skin.previewURL || skin.iconURL || "";
    preview.alt = "";
    preview.addEventListener("error", () => { preview.hidden = true; }, { once: true });
    name.textContent = skin.name || "Unnamed SKIN";
    status.textContent = owned ? SkinAvailabilityText(skin) : (skin.skinline || "");
    status.hidden = !status.textContent;
    copy.append(name, status);
    previewButton.append(preview, copy);
    previewButton.addEventListener("click", () => onSelect(skin));
    row.appendChild(previewButton);

    if (owned && skin.active)
    {
        const applied = ImageIcon(`${EVE_UI_RESOURCE_ROOT}classes/skins/applied.png`);

        applied.classList.add("ship-info-skin-applied");
        row.appendChild(applied);
    }
    else if (skin.licenseTypeID)
    {
        const buy = document.createElement("button");

        buy.type = "button";
        buy.className = "ship-info-skin-buy";
        buy.textContent = "Buy";
        buy.setAttribute("aria-label", `Buy ${skin.name || "SKIN"}`);
        buy.addEventListener("click", () => onBuy(skin));
        row.appendChild(buy);
    }
    return row;
}

function SkinAvailabilityText(skin)
{
    const state = skin.active ? "Active" : "Available";
    const permanent = skin.permanent === true || Number(skin.duration) === -1;

    return permanent ? `${state}: Permanent` : state;
}

function SkinKey(skin)
{
    return String(skin.designID ?? skin.skinID ?? skin.name ?? "skin");
}

function ValueRow(row)
{
    const element = document.createElement("div");
    const name = document.createElement("span");
    const value = document.createElement("strong");

    element.className = "ship-info-value-row";
    name.textContent = row.name || "Attribute";
    value.textContent = row.displayValue ?? formatShipValue(row.value, row.unit);
    if (row.iconURL)
    {
        element.classList.add("has-icon");
        element.appendChild(ImageIcon(row.iconURL));
    }
    element.append(name, value);
    return element;
}

function ItemRow(item)
{
    const row = document.createElement("div");
    const icon = document.createElement("img");
    const name = document.createElement("span");
    const quantity = document.createElement("strong");

    row.className = "ship-info-item-row";
    icon.src = item.iconURL || "";
    icon.alt = "";
    icon.addEventListener("error", () => { icon.hidden = true; }, { once: true });
    name.textContent = item.name || `Type ${item.typeID}`;
    quantity.textContent = item.quantity ? `${new Intl.NumberFormat("en").format(item.quantity)} units` : "";
    row.append(icon, name, quantity);
    return row;
}

function Heading(text)
{
    const heading = document.createElement("h3");

    heading.textContent = text;
    return heading;
}

function Section(className)
{
    const section = document.createElement("div");

    section.className = className;
    return section;
}

function ImageIcon(source)
{
    const image = document.createElement("img");
    const value = String(source || "");

    image.src = value;
    if (value.startsWith(EVE_UI_RESOURCE_ROOT))
    {
        image.dataset.eveUiResource = value.slice(EVE_UI_RESOURCE_ROOT.length);
    }
    image.alt = "";
    image.addEventListener("error", () => { image.hidden = true; }, { once: true });
    return image;
}

function UiResource(path)
{
    return `${EVE_UI_RESOURCE_ROOT}${String(path || "").replace(/^\/+/, "")}`;
}

function NormalizeResourceRoot(value)
{
    const root = String(value || EVE_UI_RESOURCE_ROOT).trim();

    return `${root.replace(/\/+$/u, "")}/`;
}

function EveCharacterPortraitURL(characterID, { size = 64 } = {})
{
    const id = shipShowInfoID(characterID);
    const selectedSize = Number(size);

    if (!id || ![ 32, 64, 128, 256, 512, 1024 ].includes(selectedSize))
    {
        return null;
    }

    const url = new URL(`characters/${id}/portrait`, `${EVE_IMAGE_SERVER}/`);

    url.searchParams.set("size", String(selectedSize));
    url.searchParams.set("tenant", "tranquility");

    return url.href;
}

function SetText(root, selector, value)
{
    for (const element of root.querySelectorAll(selector)) element.textContent = value ?? "";
}

function Roman(level)
{
    return [ "\u2014", "I", "II", "III", "IV", "V" ][Number(level)] ?? String(level ?? "\u2014");
}

function MasteryLevel(value)
{
    const level = Math.round(Number(value));

    return Number.isFinite(level) ? Math.max(0, Math.min(5, level)) : 0;
}

function FormatDuration(value)
{
    const seconds = Number(value);

    if (!Number.isFinite(seconds) || seconds < 0) return "\u2014";

    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);

    return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function FormatTrainingDuration(value)
{
    let minutes = Math.max(0, Math.ceil(Number(value) / 60));
    const days = Math.floor(minutes / 1440);

    minutes -= days * 1440;
    const hours = Math.floor(minutes / 60);

    minutes -= hours * 60;

    return [ days ? `${days}d` : "", hours ? `${hours}h` : "", minutes || (!days && !hours) ? `${minutes}m` : "" ]
        .filter(Boolean)
        .join(" ");
}
