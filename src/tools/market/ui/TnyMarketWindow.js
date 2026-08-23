import { CjsMarketController } from "../CjsMarketController.js";
import { TnyMarketHistoryChart } from "./TnyMarketHistoryChart.js";
import {
    analyzeOrders,
    buildOrdersCsv,
    filterHistory,
    formatExpiry,
    formatISK,
    formatPercent,
    formatQuantity,
    marketID
} from "../marketModel.js";

const ORDER_LIMIT = 100;
/**
 * Optional EVE-like regional market window over the shared controller.
 *
 * ESI routes, SDE joins, authentication, caching, and transport policy stop at
 * the injected controller and its source.
 */
export class TnyMarketWindow
{

    /**
     * @param {Object} options
     * @param {HTMLElement} options.root
     * @param {CjsMarketController} [options.controller]
     * @param {Object} [options.marketSource]
     * @param {Number} options.initialTypeID
     * @param {Number} options.initialRegionID
     * @param {Function} [options.getShareURL] - ({typeID, regionID}) => string
     */
    constructor({
        root,
        controller = null,
        marketSource = null,
        initialTypeID,
        initialRegionID,
        getShareURL = null
    })
    {
        if (!(root instanceof HTMLElement)) throw new TypeError("TnyMarketWindow requires a root element");
        if (getShareURL !== null && typeof getShareURL !== "function")
        {
            throw new TypeError("getShareURL must be a function or null");
        }
        if (controller === null)
        {
            controller = new CjsMarketController({ marketSource });
        }
        if (!(controller instanceof CjsMarketController))
        {
            throw new TypeError("TnyMarketWindow requires a CjsMarketController");
        }

        this.root = root;
        this.controller = controller;
        this.getShareURL = getShareURL;
        this.typeID = marketID(initialTypeID);
        this.regionID = marketID(initialRegionID);

        if (!this.typeID || !this.regionID)
        {
            throw new TypeError("TnyMarketWindow requires positive initial typeID and regionID values");
        }

        root.classList.add("market-window-host");
        root.innerHTML = shell();
        this.element = root.querySelector(".market-window");
        this.#Find("[data-market-share]").hidden = !getShareURL;
        this.chart = new TnyMarketHistoryChart(this.#Find("[data-market-chart]"));
        this.#Bind();
    }

    /** Loads browse metadata, then opens the requested initial market. */
    async Start()
    {
        this.#SetBusy(true, "CONNECTING TO MARKET DATA");

        try
        {
            await this.controller.Start({ typeID: this.typeID, regionID: this.regionID });
            const state = this.controller.Snapshot();

            this.#SyncDirectories(state);
            this.#SyncMarket(state);
        }
        catch (error)
        {
            if (error?.name === "AbortError") return null;
            this.#SyncDirectories(this.controller.Snapshot());
            this.#SetBusy(false);
            this.#ShowError(error);
            throw error;
        }

        return this.type;
    }

    /**
     * Opens one type in one region. Repeated calls abort superseded reads.
     */
    async Open({ typeID = this.typeID, regionID = this.regionID } = {})
    {
        typeID = marketID(typeID);
        regionID = marketID(regionID);

        if (!typeID || !regionID) throw new TypeError("Open requires positive typeID and regionID values");

        this.typeID = typeID;
        this.regionID = regionID;
        this.#Find("[data-market-region-id]").value = String(regionID);
        this.#MarkBrowseSelection();
        this.#SetBusy(true, `LOADING TYPE ${typeID}`);
        this.#HideError();

        try
        {
            await this.controller.Open({ typeID, regionID });
            this.#SyncMarket(this.controller.Snapshot());

            return this.type;
        }
        catch (error)
        {
            if (error?.name === "AbortError") return null;
            this.#SetBusy(false);
            this.#ShowError(error);
            throw error;
        }
    }

    /** Aborts in-flight work and releases this window's DOM. */
    async Destroy()
    {
        clearTimeout(this.#searchTimer);
        this.chart.Destroy();
        this.root.replaceChildren();
        this.root.classList.remove("market-window-host");
        await this.controller.Destroy();
    }

    /** Connects browser controls to the market controller and local actions. */
    #Bind()
    {
        this.#Find("[data-market-search]").addEventListener("input", event =>
        {
            clearTimeout(this.#searchTimer);
            const query = event.target.value.trim();

            this.#searchTimer = setTimeout(() => this.#Search(query), query ? 260 : 0);
        });

        this.#Find("[data-market-region-form]").addEventListener("submit", event =>
        {
            event.preventDefault();
            const regionID = marketID(this.#Find("[data-market-region-id]").value);

            if (!regionID)
            {
                this.#SetStatus("Enter a positive numeric region ID.", "warning");
                return;
            }
            this.Open({ regionID }).catch(error => this.#ShowError(error));
        });

        this.#Find("[data-market-region-id]").addEventListener("input", event =>
        {
            const option = this.regions.find(region => String(region.regionID) === event.target.value);

            this.#Find("[data-market-region-name]").textContent = option?.name ?? "CUSTOM REGION";
        });

        this.#Find("[data-market-tabs]").addEventListener("click", event =>
        {
            const button = event.target.closest("button[data-market-tab]");

            if (button) this.#SetTab(button.dataset.marketTab);
        });
        this.#Find("[data-market-tabs]").addEventListener("keydown", event => this.#MoveTab(event));

        this.#Find("[data-market-history-ranges]").addEventListener("click", event =>
        {
            const button = event.target.closest("button[data-days]");

            if (button) this.#SetHistoryRange(Number(button.dataset.days));
        });

        this.#Find("[data-market-history-modes]").addEventListener("click", event =>
        {
            const button = event.target.closest("button[data-history-mode]");

            if (button) this.#SetHistoryMode(button.dataset.historyMode);
        });

        this.#Find("[data-market-refresh]").addEventListener("click", () =>
            this.Open().catch(error => this.#ShowError(error)));
        this.#Find("[data-market-retry]").addEventListener("click", () =>
            this.Open().catch(error => this.#ShowError(error)));
        this.#Find("[data-market-export]").addEventListener("click", () => this.#Export());
        this.#Find("[data-market-share]").addEventListener("click", () => this.#Share());
    }

    /** Runs the current market query and renders its normalized matches. */
    async #Search(query)
    {
        if (!query)
        {
            const results = await this.controller.Search("");

            this.#RenderBrowse(results);
            return;
        }

        this.#RenderBrowse([], "Searching…");

        try
        {
            const results = await this.controller.Search(query);

            this.#RenderBrowse(results, results.length ? null : "No exact market type found.");
        }
        catch (error)
        {
            if (error?.name !== "AbortError")
            {
                this.#RenderBrowse([], error.message || "Search failed.");
            }
        }
    }

    /** Reconciles directories controls with current controller state. */
    #SyncDirectories(state)
    {
        this.#RenderRegions(state.regions);
        this.browseTypes = state.browseTypes;

        if (state.regionError)
        {
            this.#SetStatus("Region directory unavailable; enter a region ID directly.", "warning");
        }
        this.#RenderBrowse(
            this.browseTypes,
            state.browseError ? "Browse directory unavailable. Search by exact name or type ID." : null
        );
    }

    /** Reconciles market controls with current controller state. */
    #SyncMarket(state)
    {
        this.typeID = state.typeID;
        this.regionID = state.regionID;
        this.type = state.type;
        this.orders = state.orders;
        this.history = state.history;
        this.#Find("[data-market-region-id]").value = String(this.regionID);
        this.#MarkBrowseSelection();
        this.#RenderType();
        this.#RenderOrders();
        this.#RenderHistory();
        this.#SetBusy(false);
        this.#SetStatus(`Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
        this.element.dispatchEvent(new CustomEvent("marketchange", {
            bubbles: true,
            detail: { typeID: this.typeID, regionID: this.regionID, type: this.type }
        }));
    }

    /** Updates the regions presentation from current controller state. */
    #RenderRegions(regions)
    {
        this.regions = Array.isArray(regions) ? regions : [];
        const datalist = this.#Find("[data-market-regions]");
        const fragment = document.createDocumentFragment();

        datalist.replaceChildren();
        for (const region of this.regions)
        {
            const option = document.createElement("option");

            option.value = String(region.regionID);
            option.label = region.name;
            fragment.appendChild(option);
        }
        datalist.appendChild(fragment);
        this.#Find("[data-market-region-name]").textContent = this.#RegionName();
    }

    /** Updates the browse presentation from current controller state. */
    #RenderBrowse(items, message = null)
    {
        const list = this.#Find("[data-market-browse]");

        list.replaceChildren();
        if (!items?.length)
        {
            const empty = document.createElement("p");

            empty.className = "market-browse-empty";
            empty.textContent = message || "No market types.";
            list.appendChild(empty);
            return;
        }

        let lastGroup = null;

        for (const item of items)
        {
            const group = item.group || "MARKET TYPES";

            if (group !== lastGroup)
            {
                const heading = document.createElement("h3");

                heading.textContent = group;
                list.appendChild(heading);
                lastGroup = group;
            }

            const button = document.createElement("button");
            const icon = document.createElement("span");
            const label = document.createElement("span");
            const id = document.createElement("small");

            button.type = "button";
            button.className = "market-browse-type";
            button.dataset.typeId = String(item.typeID);
            icon.className = "market-browse-icon";
            if (item.iconURL)
            {
                const image = document.createElement("img");

                image.src = item.iconURL;
                image.alt = "";
                image.loading = "lazy";
                icon.appendChild(image);
            }
            label.textContent = item.name;
            id.textContent = `TYPE ${item.typeID}`;
            button.append(icon, label, id);
            button.addEventListener("click", () => this.Open({ typeID: item.typeID })
                .catch(error => this.#ShowError(error)));
            list.appendChild(button);
        }
        this.#MarkBrowseSelection();
    }

    /** Highlights the active market item in the browse hierarchy. */
    #MarkBrowseSelection()
    {
        for (const button of this.element?.querySelectorAll("[data-type-id]") ?? [])
        {
            const selected = Number(button.dataset.typeId) === this.typeID;

            button.classList.toggle("selected", selected);
            button.setAttribute("aria-current", selected ? "true" : "false");
        }
    }

    /** Updates the type presentation from current controller state. */
    #RenderType()
    {
        this.#Find("[data-market-title]").textContent = this.type.name;
        this.#Find("[data-market-type-id]").textContent = `TYPE ID ${this.type.typeID}`;
        this.#Find("[data-market-description]").textContent = this.type.description || "No description available.";
        this.#Find("[data-market-region-name]").textContent = this.#RegionName();

        const icon = this.#Find("[data-market-icon]");

        icon.replaceChildren();
        if (this.type.iconURL)
        {
            const image = document.createElement("img");

            image.src = this.type.iconURL;
            image.alt = "";
            image.addEventListener("error", () => image.remove(), { once: true });
            icon.appendChild(image);
        }

        const trail = this.#Find("[data-market-breadcrumb]");
        const names = [];

        for (const entry of this.type.breadcrumb ?? []) names.push(entry.name ?? String(entry));
        trail.textContent = names.length ? names.join("  /  ") : this.type.groupName || "REGIONAL MARKET";
    }

    /** Updates the orders presentation from current controller state. */
    #RenderOrders()
    {
        const analysis = analyzeOrders(this.orders);

        this.analysis = analysis;
        this.#Metric("sell", analysis.bestSell ? `${formatISK(analysis.bestSell.price)} ISK` : "NO SELL ORDERS");
        this.#Metric("buy", analysis.bestBuy ? `${formatISK(analysis.bestBuy.price)} ISK` : "NO BUY ORDERS");
        this.#Metric("spread", formatPercent(analysis.spread));
        this.#Metric("volume", formatQuantity(this.history.at(-1)?.volume));
        this.#RenderOrderRows("sell", analysis.sellers);
        this.#RenderOrderRows("buy", analysis.buyers);
        this.#Find("[data-market-sell-count]").textContent = countLabel(analysis.sellers.length, "sell order");
        this.#Find("[data-market-buy-count]").textContent = countLabel(analysis.buyers.length, "buy order");
    }

    /** Updates the order rows presentation from current controller state. */
    #RenderOrderRows(side, rows)
    {
        const body = this.#Find(`[data-market-${side}-rows]`);
        const fragment = document.createDocumentFragment();

        body.replaceChildren();
        if (!rows.length)
        {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "market-table-empty";
            cell.textContent = `No ${side} orders in this region.`;
            row.appendChild(cell);
            body.appendChild(row);
            return;
        }

        for (const order of rows.slice(0, ORDER_LIMIT))
        {
            const row = document.createElement("tr");

            if (order === rows[0]) row.className = "best";
            this.#Cell(row, `${formatISK(order.price)} ISK`, "number");
            this.#Cell(row, formatQuantity(order.volumeRemain), "number");
            this.#Cell(row, formatQuantity(order.minVolume), "number muted");
            this.#Cell(row, order.locationName || order.systemName || `LOCATION ${order.locationID}`, "location");
            this.#Cell(row, side === "buy" ? rangeLabel(order.range) : "—", "muted");
            this.#Cell(row, formatExpiry(order.expiresAt), "muted");
            fragment.appendChild(row);
        }
        body.appendChild(fragment);
    }

    /** Updates the history presentation from current controller state. */
    #RenderHistory()
    {
        this.#SetHistoryRange(this.historyDays);
    }

    /** Stores history range state and synchronizes dependent presentation. */
    #SetHistoryRange(days)
    {
        if (![ 30, 90, 180, 365, 0 ].includes(days)) return;

        this.historyDays = days;
        const rows = filterHistory(this.history, days || Number.POSITIVE_INFINITY);

        for (const button of this.element.querySelectorAll("button[data-days]"))
        {
            const selected = Number(button.dataset.days) === days;

            button.classList.toggle("active", selected);
            button.setAttribute("aria-pressed", String(selected));
        }
        this.chart.Show(rows);
        this.#RenderHistoryRows(rows);
        this.#Find("[data-market-history-count]").textContent = `${rows.length} DAYS`;
    }

    /** Updates the history rows presentation from current controller state. */
    #RenderHistoryRows(rows)
    {
        const body = this.#Find("[data-market-history-rows]");
        const fragment = document.createDocumentFragment();

        body.replaceChildren();
        if (!rows.length)
        {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "market-table-empty";
            cell.textContent = "No price history in this range.";
            row.appendChild(cell);
            body.appendChild(row);
            return;
        }
        for (const entry of rows.slice().reverse())
        {
            const row = document.createElement("tr");

            this.#Cell(row, entry.date, "date");
            this.#Cell(row, formatQuantity(entry.orderCount), "number");
            this.#Cell(row, formatQuantity(entry.volume), "number");
            this.#Cell(row, `${formatISK(entry.low)} ISK`, "number");
            this.#Cell(row, `${formatISK(entry.high)} ISK`, "number");
            this.#Cell(row, `${formatISK(entry.average)} ISK`, "number");
            fragment.appendChild(row);
        }
        body.appendChild(fragment);
    }

    /** Stores tab state and synchronizes dependent presentation. */
    #SetTab(name)
    {
        if (![ "orders", "history" ].includes(name)) return;

        this.tab = name;
        for (const button of this.element.querySelectorAll("button[data-market-tab]"))
        {
            const selected = button.dataset.marketTab === name;

            button.classList.toggle("active", selected);
            button.setAttribute("aria-selected", String(selected));
            button.tabIndex = selected ? 0 : -1;
        }
        for (const pane of this.element.querySelectorAll("[data-market-pane]"))
        {
            pane.hidden = pane.dataset.marketPane !== name;
        }
    }

    /** Moves keyboard focus to the adjacent enabled market tab. */
    #MoveTab(event)
    {
        if (![ "ArrowLeft", "ArrowRight", "Home", "End" ].includes(event.key)) return;

        const tabs = Array.from(this.element.querySelectorAll("button[data-market-tab]"));
        const current = tabs.indexOf(document.activeElement);

        if (current < 0) return;
        event.preventDefault();
        const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
            : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;

        tabs[index].focus();
        this.#SetTab(tabs[index].dataset.marketTab);
    }

    /** Stores history mode state and synchronizes dependent presentation. */
    #SetHistoryMode(mode)
    {
        if (![ "graph", "table" ].includes(mode)) return;

        this.historyMode = mode;
        this.#Find("[data-market-history-graph]").hidden = mode !== "graph";
        this.#Find("[data-market-history-table]").hidden = mode !== "table";
        for (const button of this.element.querySelectorAll("button[data-history-mode]"))
        {
            const selected = button.dataset.historyMode === mode;

            button.classList.toggle("active", selected);
            button.setAttribute("aria-pressed", String(selected));
        }
    }

    /** Creates one labelled market summary metric for the details panel. */
    #Metric(name, value)
    {
        this.#Find(`[data-market-metric="${name}"]`).textContent = value;
    }

    /** Creates one table cell with safe text and optional styling. */
    #Cell(row, value, className = "")
    {
        const cell = document.createElement("td");

        cell.className = className;
        cell.textContent = value;
        if (className.includes("location")) cell.title = value;
        row.appendChild(cell);
    }

    /** Stores busy state and synchronizes dependent presentation. */
    #SetBusy(busy, label = "")
    {
        const overlay = this.#Find("[data-market-loading]");

        overlay.hidden = !busy;
        overlay.querySelector("span").textContent = label;
        this.element.setAttribute("aria-busy", String(busy));
    }

    /** Presents the current error state to the browser user. */
    #ShowError(error)
    {
        const panel = this.#Find("[data-market-error]");

        panel.hidden = false;
        panel.querySelector("p").textContent = error?.message || "Market data could not be loaded.";
        this.#SetStatus("Market request failed.", "error");
    }

    /** Clears the visible error presentation without changing controller data. */
    #HideError()
    {
        this.#Find("[data-market-error]").hidden = true;
    }

    /** Stores status state and synchronizes dependent presentation. */
    #SetStatus(message, kind = "normal")
    {
        const status = this.#Find("[data-market-status]");

        status.textContent = message;
        status.dataset.kind = kind;
    }

    /** Coordinates market export behavior against current mutable browser state. */
    #Export()
    {
        if (!this.orders.length || !this.type) return;

        const blob = new Blob([ buildOrdersCsv(this.orders) ], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `market-${this.regionID}-${this.typeID}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        this.#SetStatus("Order CSV exported.");
    }

    /** Coordinates market share behavior against current mutable browser state. */
    async #Share()
    {
        if (!this.getShareURL) return;

        const url = String(this.getShareURL({ typeID: this.typeID, regionID: this.regionID }));

        try
        {
            await navigator.clipboard.writeText(url);
            this.#SetStatus("Market link copied.");
        }
        catch
        {
            this.#SetStatus("Copy failed; use the current address.", "warning");
        }
    }

    /**
     * Coordinates market region name behavior against current mutable browser
     * state.
     */
    #RegionName()
    {
        return this.regions.find(region => region.regionID === this.regionID)?.name
            ?? `REGION ${this.regionID}`;
    }

    /** Coordinates market find behavior against current mutable browser state. */
    #Find(selector)
    {
        const element = this.root.querySelector(selector);

        if (!element) throw new Error(`TnyMarketWindow shell is missing ${selector}`);
        return element;
    }

    typeID;

    regionID;

    type = null;

    regions = [];

    browseTypes = [];

    orders = [];

    history = [];

    analysis = null;

    tab = "orders";

    historyDays = 90;

    historyMode = "graph";

    #searchTimer = null;

}

function shell()
{
    return `
        <section class="market-window" aria-label="Regional market">
            <header class="market-titlebar">
                <div class="market-titlebar-name">
                    <span class="market-titlebar-mark" aria-hidden="true"></span>
                    <strong data-market-region-name>REGIONAL MARKET</strong>
                </div>
                <form class="market-region-form" data-market-region-form>
                    <label>
                        <span>REGION ID</span>
                        <input type="text" inputmode="numeric" autocomplete="off"
                               data-market-region-id list="market-region-list" aria-label="Region ID">
                    </label>
                    <datalist id="market-region-list" data-market-regions></datalist>
                    <button type="submit">OPEN</button>
                </form>
                <div class="market-titlebar-actions">
                    <button type="button" data-market-share title="Copy a link to this market">COPY LINK</button>
                    <button type="button" data-market-refresh title="Refresh market data">REFRESH</button>
                </div>
            </header>

            <div class="market-layout">
                <aside class="market-sidebar" aria-label="Browse market types">
                    <div class="market-sidebar-tabs" aria-hidden="true">
                        <span class="active">BROWSE</span>
                    </div>
                    <label class="market-search">
                        <span class="market-search-icon" aria-hidden="true">⌕</span>
                        <input type="search" data-market-search
                               placeholder="Exact type name or ID" aria-label="Search market types">
                    </label>
                    <div class="market-browse" data-market-browse aria-live="polite"></div>
                </aside>

                <main class="market-main">
                    <section class="market-item-head">
                        <div class="market-item-icon" data-market-icon aria-hidden="true"></div>
                        <div class="market-item-copy">
                            <p class="market-breadcrumb" data-market-breadcrumb>REGIONAL MARKET</p>
                            <div class="market-item-titleline">
                                <h1 data-market-title>SELECT A MARKET TYPE</h1>
                                <span data-market-type-id>TYPE ID —</span>
                            </div>
                            <p class="market-description" data-market-description>
                                Browse a common item or search by exact type name or ID.
                            </p>
                        </div>
                    </section>

                    <div class="market-tabs" data-market-tabs role="tablist" aria-label="Market views">
                        <button type="button" class="active" role="tab" aria-selected="true"
                                data-market-tab="orders">MARKET DATA</button>
                        <button type="button" role="tab" aria-selected="false" tabindex="-1"
                                data-market-tab="history">PRICE HISTORY</button>
                    </div>

                    <section class="market-pane market-orders" data-market-pane="orders"
                             role="tabpanel" aria-label="Market data">
                        <div class="market-metrics">
                            <article><span>BEST SELL</span><strong data-market-metric="sell">—</strong></article>
                            <article><span>BEST BUY</span><strong data-market-metric="buy">—</strong></article>
                            <article><span>SPREAD</span><strong data-market-metric="spread">—</strong></article>
                            <article><span>LAST DAILY VOLUME</span><strong data-market-metric="volume">—</strong></article>
                        </div>

                        <div class="market-order-section sell">
                            <header><h2>SELLERS</h2><span data-market-sell-count>0 SELL ORDERS</span></header>
                            <div class="market-table-scroll">
                            <table aria-label="Sell orders">
                                <thead><tr><th>PRICE</th><th>QUANTITY</th><th>MIN</th><th>LOCATION</th><th>RANGE</th><th>EXPIRES</th></tr></thead>
                                <tbody data-market-sell-rows></tbody>
                            </table>
                            </div>
                        </div>

                        <div class="market-order-section buy">
                            <header><h2>BUYERS</h2><span data-market-buy-count>0 BUY ORDERS</span></header>
                            <div class="market-table-scroll">
                            <table aria-label="Buy orders">
                                <thead><tr><th>PRICE</th><th>QUANTITY</th><th>MIN</th><th>LOCATION</th><th>RANGE</th><th>EXPIRES</th></tr></thead>
                                <tbody data-market-buy-rows></tbody>
                            </table>
                            </div>
                        </div>
                    </section>

                    <section class="market-pane market-history" data-market-pane="history" hidden
                             role="tabpanel" aria-label="Price history">
                        <header class="market-history-tools">
                            <div data-market-history-modes>
                                <button type="button" class="active" data-history-mode="graph" aria-pressed="true">GRAPH</button>
                                <button type="button" data-history-mode="table" aria-pressed="false">TABLE</button>
                            </div>
                            <span data-market-history-count>0 DAYS</span>
                            <div data-market-history-ranges>
                                <button type="button" data-days="30" aria-pressed="false">1M</button>
                                <button type="button" class="active" data-days="90" aria-pressed="true">3M</button>
                                <button type="button" data-days="180" aria-pressed="false">6M</button>
                                <button type="button" data-days="365" aria-pressed="false">1Y</button>
                                <button type="button" data-days="0" aria-pressed="false">ALL</button>
                            </div>
                        </header>

                        <div class="market-history-graph" data-market-history-graph>
                            <div class="market-history-legend">
                                <span class="average">AVERAGE</span>
                                <span class="range">DAILY LOW / HIGH</span>
                                <span class="volume">VOLUME</span>
                            </div>
                            <div data-market-chart></div>
                        </div>

                        <div class="market-history-table market-table-scroll" data-market-history-table hidden>
                            <table aria-label="Daily price history">
                                <thead><tr><th>DATE</th><th>ORDERS</th><th>QUANTITY</th><th>LOW</th><th>HIGH</th><th>AVERAGE</th></tr></thead>
                                <tbody data-market-history-rows></tbody>
                            </table>
                        </div>
                    </section>

                    <footer class="market-footer">
                        <span data-market-status aria-live="polite">READY</span>
                        <span>READ-ONLY REGIONAL DATA</span>
                        <button type="button" data-market-export>EXPORT CSV</button>
                    </footer>

                    <div class="market-loading" data-market-loading hidden role="status" aria-live="polite">
                        <i aria-hidden="true"></i><span>LOADING MARKET</span>
                    </div>
                    <div class="market-error" data-market-error hidden role="alert">
                        <strong>MARKET DATA UNAVAILABLE</strong>
                        <p>The selected market could not be loaded.</p>
                        <button type="button" data-market-retry>TRY AGAIN</button>
                    </div>
                </main>
            </div>
        </section>`;
}

function countLabel(count, noun)
{
    return `${formatQuantity(count)} ${noun.toUpperCase()}${count === 1 ? "" : "S"}`;
}

function rangeLabel(value)
{
    if (value === "station") return "STATION";
    if (value === "solarsystem") return "SYSTEM";
    if (value === "region") return "REGION";
    return /^\d+$/.test(String(value)) ? `${value} JUMPS` : String(value || "—").toUpperCase();
}
