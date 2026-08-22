import { CjsShipTreeController } from "../CjsShipTreeController.js";

const SVG = "http://www.w3.org/2000/svg";
let nextPatternID = 0;

/** Optional EVE-like SVG presentation over the provider-neutral Ship Tree controller. */
export class TnyShipTreeWindow
{

    #abortController = null;
    #drag = null;
    #mounted = false;
    #unsubscribe = null;

    /**
     * Creates a ship-tree ship tree window around caller-supplied browser
     * collaborators.
     */
    constructor({
        controller = null,
        source = null,
        initialFactionID = null,
        onOpenType = null,
        title = "Ship Tree"
    } = {})
    {
        if (controller === null)
        {
            controller = new CjsShipTreeController({ source });
            this.ownsController = true;
        }
        else
        {
            this.ownsController = false;
        }
        if (typeof onOpenType !== "function" && onOpenType !== null)
        {
            throw new TypeError("onOpenType must be a function or null");
        }

        this.controller = controller;
        this.initialFactionID = initialFactionID;
        this.onOpenType = onOpenType;
        this.title = String(title || "Ship Tree");
        this.query = "";
        this.gridPatternID = "ship-tree-grid-" + ++nextPatternID;
    }

    /** Mounts the window and acquires its first authored Ship Tree answer. */
    async Mount(container)
    {
        if (this.#mounted) throw new Error("TnyShipTreeWindow is already mounted");
        if (!container || typeof container.appendChild !== "function")
        {
            throw new TypeError("Ship Tree requires a DOM container");
        }

        this.#mounted = true;
        this.#abortController = new AbortController();
        this.#Build(container);
        this.#unsubscribe = this.controller.Subscribe(() => this.Render());
        this.#ObserveSize();

        try
        {
            await this.controller.FetchTree({
                factionID: this.initialFactionID,
                signal: this.#abortController.signal
            });
            this.#FillFactionSelect();
            this.controller.Fit();
            this.Render();

            return this;
        }
        catch (error)
        {
            this.Render();
            throw error;
        }
    }

    /** Compatibility name used by the existing demo compositions. */
    Start(container)
    {
        return this.Mount(container);
    }

    /** Fetches another authored faction tree through the same source contract. */
    async SetFaction(factionID)
    {
        this.#abortController?.abort();
        this.#abortController = new AbortController();
        this.initialFactionID = factionID;

        await this.controller.FetchTree({
            factionID,
            signal: this.#abortController.signal
        });
        this.#FillFactionSelect();
        this.controller.Fit();
        this.Render();
    }

    /** Fits all current hull cards into the visible stage. */
    Fit()
    {
        this.#Measure();
        this.controller.Fit();
        this.Render();
    }

    /** Invokes the caller-owned Show Info action for the selected type. */
    OpenSelected()
    {
        const type = this.controller.GetSelectedType();

        if (!type || !this.onOpenType) return false;

        this.onOpenType(type);

        return true;
    }

    /** Renders current controller state into SVG and synchronized HTML views. */
    Render()
    {
        if (!this.element) return;

        this.#RenderStatus();
        this.#RenderDiagram();
        this.#RenderOutline();
        this.#RenderPreview();
    }

    /** Releases DOM observation, gestures, source work, and owned behavior. */
    async Destroy()
    {
        if (!this.#mounted) return;

        this.#mounted = false;
        this.#abortController?.abort();
        this.#abortController = null;
        this.#unsubscribe?.();
        this.#unsubscribe = null;
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.svg?.removeEventListener("wheel", this.onWheel);
        if (this.ownsController) this.controller.Destroy();
        this.element?.remove();
        this.element = null;
        this.svg = null;
    }

    /** Assembles normalized ship-tree output from the current source records. */
    #Build(container)
    {
        const element = CreateElement("section", "ship-tree-host cjs-eve-theme cjs-eve-window");
        const titlebar = CreateElement("header", "cjs-eve-titlebar ship-tree-titlebar");
        const mark = CreateElement("span", "cjs-eve-title-mark");
        const title = CreateElement("strong", "ship-tree-title", this.title);
        const actions = CreateElement("div", "cjs-eve-window-actions");
        const zoomOut = CreateButton("Zoom out", "−");
        const zoomIn = CreateButton("Zoom in", "+");
        const fit = CreateButton("Fit tree", "Fit");
        const open = CreateButton("Open selected ship", "Show Info");

        open.disabled = true;
        open.dataset.action = "open";
        zoomOut.addEventListener("click", () => this.#Zoom(1 / 1.25));
        zoomIn.addEventListener("click", () => this.#Zoom(1.25));
        fit.addEventListener("click", () => this.Fit());
        open.addEventListener("click", () => this.OpenSelected());
        actions.append(zoomOut, zoomIn, fit, open);
        titlebar.append(mark, title, actions);

        const body = CreateElement("div", "ship-tree-body");
        const stage = CreateElement("div", "ship-tree-stage");
        const svg = document.createElementNS(SVG, "svg");
        const context = CreateElement("aside", "ship-tree-context");
        const contextHeader = CreateElement("div", "ship-tree-context-header");
        const factionMark = CreateElement("span", "ship-tree-faction-mark", "◇");
        const factionLabel = CreateElement("label", "ship-tree-field-label ship-tree-faction-label", "Ship line");
        const faction = CreateElement("select", "cjs-eve-field ship-tree-faction");
        const roleStrip = CreateElement("div", "ship-tree-role-strip");
        const factionInfo = CreateElement("div", "ship-tree-faction-info");
        const factionName = CreateElement("strong", "ship-tree-faction-name", "Ship Tree");
        const factionDescription = CreateElement("p", "ship-tree-faction-description");
        const searchPanel = CreateElement("div", "ship-tree-search-panel");
        const searchLabel = CreateElement("label", "ship-tree-field-label", "Find a hull");
        const search = CreateElement("input", "cjs-eve-field ship-tree-search");
        const outline = CreateElement("ol", "ship-tree-outline");
        const status = CreateElement("p", "cjs-eve-status ship-tree-status", "Loading Ship Tree…");
        const live = CreateElement("p", "ship-tree-live");
        const inspector = CreateElement("aside", "ship-tree-inspector");

        for (const role of [
            [ "Attack", "⌁" ],
            [ "Defense", "⬡" ],
            [ "Support", "✦" ],
            [ "Exploration", "◇" ],
            [ "Industry", "△" ]
        ])
        {
            const roleMark = CreateElement("span", "ship-tree-role-mark", role[1]);

            roleMark.setAttribute("aria-label", role[0]);
            roleMark.setAttribute("title", role[0]);
            roleStrip.appendChild(roleMark);
        }

        search.type = "search";
        search.placeholder = "Search for a hull";
        outline.setAttribute("aria-label", "Ship Tree hull outline");
        live.setAttribute("aria-live", "polite");
        live.setAttribute("aria-atomic", "true");
        inspector.hidden = true;
        inspector.setAttribute("aria-live", "polite");
        factionLabel.appendChild(faction);
        contextHeader.append(factionMark, factionLabel);
        factionInfo.append(factionName, factionDescription);
        searchLabel.appendChild(search);
        searchPanel.append(searchLabel, outline);
        context.append(contextHeader, roleStrip, factionInfo, searchPanel);

        svg.classList.add("ship-tree-visual");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "Visual Ship Tree. Search or use the synchronized outline to select ships.");
        svg.setAttribute("tabindex", "0");
        stage.append(svg, context, inspector, status, live);
        body.appendChild(stage);
        element.append(titlebar, body);
        container.appendChild(element);

        this.element = element;
        this.stage = stage;
        this.svg = svg;
        this.factionSelect = faction;
        this.factionMark = factionMark;
        this.factionName = factionName;
        this.factionDescription = factionDescription;
        this.searchPanel = searchPanel;
        this.searchInput = search;
        this.outline = outline;
        this.status = status;
        this.live = live;
        this.inspector = inspector;
        this.openButton = open;

        faction.addEventListener("change", () => this.SetFaction(ParseID(faction.value)));
        search.addEventListener("input", () =>
        {
            this.query = search.value.trim();
            this.Render();
        });
        searchPanel.addEventListener("focusin", () => searchPanel.dataset.open = "true");
        searchPanel.addEventListener("focusout", () => requestAnimationFrame(() =>
        {
            if (!searchPanel.contains(document.activeElement) && this.query.length === 0)
            {
                delete searchPanel.dataset.open;
            }
        }));

        svg.addEventListener("pointerdown", event => this.#PointerDown(event));
        svg.addEventListener("pointermove", event => this.#PointerMove(event));
        svg.addEventListener("pointerup", event => this.#PointerUp(event));
        svg.addEventListener("pointercancel", event => this.#PointerUp(event));
        svg.addEventListener("keydown", event => this.#KeyDown(event));
        svg.addEventListener("click", event =>
        {
            if (event.target.closest?.(".ship-tree-card")) return;

            this.controller.selection.Clear();
        });
        this.onWheel = event => this.#Wheel(event);
        svg.addEventListener("wheel", this.onWheel, { passive: false });
    }

    /** Tracks host-size changes and refreshes the ship-tree viewport. */
    #ObserveSize()
    {
        if (typeof ResizeObserver !== "function")
        {
            this.#Measure();
            return;
        }

        this.resizeObserver = new ResizeObserver(() =>
        {
            const wasEmpty = this.controller.viewport.width === 0 || this.controller.viewport.height === 0;

            this.#Measure();
            if (wasEmpty && this.controller.model.nodes.length) this.controller.Fit();
            this.Render();
        });
        this.resizeObserver.observe(this.stage);
    }

    /** Measures the mounted ship-tree host in CSS pixel coordinates. */
    #Measure()
    {
        const bounds = this.stage?.getBoundingClientRect();

        if (!bounds) return;

        this.controller.viewport.SetSize(Math.max(0, bounds.width), Math.max(0, bounds.height));
    }

    /** Populates the faction selector from normalized tree records. */
    #FillFactionSelect()
    {
        const factions = this.controller.tree?.factions ?? [];
        const options = [];
        let active = null;

        for (const faction of factions)
        {
            const option = CreateElement("option", "", faction.name ?? faction.factionID);

            option.value = String(faction.factionID);
            option.selected = String(faction.factionID) === String(this.initialFactionID)
                || String(faction.factionID) === String(this.controller.tree?.factionID);
            if (option.selected) active = faction;
            options.push(option);
        }

        this.factionSelect.replaceChildren();

        for (const option of options)
        {
            this.factionSelect.appendChild(option);
        }

        this.factionSelect.disabled = options.length < 2;
        active ??= factions[0] ?? null;
        this.factionName.textContent = active?.name ?? "Ship Tree";
        this.factionDescription.textContent = active?.description ?? "Explore authored hull progression and specializations.";
        this.factionMark.textContent = active?.shortName ?? "◇";
    }

    /** Updates the status presentation from current controller state. */
    #RenderStatus()
    {
        const { status, error, tree } = this.controller;
        const selected = this.controller.GetSelectedType();

        this.openButton.disabled = !selected || !this.onOpenType;

        if (status === "loading")
        {
            this.status.textContent = "Loading Ship Tree…";
            return;
        }
        if (status === "error")
        {
            this.status.textContent = error?.message ?? "Ship Tree could not be loaded.";
            this.status.dataset.tone = "error";
            return;
        }

        delete this.status.dataset.tone;
        const provider = tree?.provenance?.provider ?? "injected source";
        const synthetic = tree?.provenance?.synthetic ? " · synthetic topology" : "";

        this.status.textContent = this.controller.model.nodes.length + " hulls · " + provider + synthetic;
        this.live.textContent = selected ? selected.name + " selected" : "";
    }

    /** Updates the diagram presentation from current controller state. */
    #RenderDiagram()
    {
        const viewport = this.controller.viewport;

        if (!this.svg || viewport.width <= 0 || viewport.height <= 0) return;

        this.svg.setAttribute("viewBox", "0 0 " + viewport.width + " " + viewport.height);
        this.svg.dataset.lod = DiagramLod(viewport.zoom);

        const defs = CreateSvg("defs");
        const pattern = CreateSvg("pattern", {
            id: this.gridPatternID,
            width: 24,
            height: 24,
            patternUnits: "userSpaceOnUse"
        });
        const gridPath = CreateSvg("path", { d: "M 24 0 L 0 0 0 24" });
        const background = CreateSvg("rect", {
            class: "ship-tree-grid",
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
            fill: "url(#" + this.gridPatternID + ")"
        });
        const world = CreateSvg("g", {
            class: "ship-tree-world",
            "aria-hidden": "true",
            transform: "translate(" + viewport.width / 2 + " " + viewport.height / 2 + ") scale(" + viewport.zoom + ") translate(" + -viewport.centerX + " " + -viewport.centerY + ")"
        });
        const selectedPath = this.controller.GetSelectedPath();
        const selectedGroups = new Set(selectedPath.groupIDs);
        const selectedEdges = new Set(selectedPath.edgeIDs);
        const selectedIDs = new Set(this.controller.selection.Snapshot().selectedIDs);
        const matches = new Set(this.controller.Search(this.query).map(node => node.id));

        pattern.appendChild(gridPath);
        defs.appendChild(pattern);

        for (const edge of this.controller.model.edges)
        {
            const points = edge.points.map(point => point.x + "," + point.y).join(" ");
            const classes = "ship-tree-edge" + (selectedEdges.has(edge.id) ? " is-path" : "");
            const underlay = CreateSvg("polyline", {
                class: classes + " ship-tree-edge-underlay",
                points
            });
            const core = CreateSvg("polyline", {
                class: classes + " ship-tree-edge-core",
                points
            });

            world.append(underlay, core);
        }

        for (const group of this.controller.model.groups)
        {
            world.appendChild(this.#CreateGroup(group, selectedGroups.has(group.id)));
        }

        for (const node of this.controller.model.nodes)
        {
            world.appendChild(this.#CreateCard(node, {
                selected: selectedIDs.has(node.id),
                dimmed: this.query.length > 0 && !matches.has(node.id)
            }));
        }

        this.svg.replaceChildren(defs, background, world);
    }

    /** Builds one group element from normalized ship-tree state. */
    #CreateGroup(group, selected)
    {
        const bounds = group.bounds;
        const classes = "ship-tree-group" + (selected ? " is-path" : "");
        const element = CreateSvg("g", { class: classes });
        const line = CreateSvg("line", {
            class: "ship-tree-group-line",
            x1: bounds.minX,
            y1: bounds.minY + 25,
            x2: bounds.maxX,
            y2: bounds.minY + 25
        });
        const label = CreateSvg("text", {
            class: "ship-tree-group-label",
            x: bounds.minX,
            y: bounds.minY + 18
        });
        const tier = CreateSvg("text", {
            class: "ship-tree-group-tier",
            x: bounds.minX,
            y: bounds.minY + 42
        });
        const port = CreateSvg("path", {
            class: "ship-tree-group-port",
            d: "M " + (bounds.minX - 18) + " " + (bounds.minY + 37)
                + " l 8 -8 8 8 v 11 h -16 Z"
        });

        label.textContent = group.label.toUpperCase();
        tier.textContent = group.tier ? "TECH " + group.tier : "";
        element.append(line, label, tier, port);

        return element;
    }

    /** Builds one card element from normalized ship-tree state. */
    #CreateCard(node, { selected, dimmed })
    {
        const width = node.size.width;
        const height = node.size.height;
        const x = node.position.x - width / 2;
        const y = node.position.y - height / 2;
        const classes = [ "ship-tree-card" ];

        if (selected) classes.push("is-selected");
        if (dimmed) classes.push("is-dimmed");

        const group = CreateSvg("g", {
            class: classes.join(" "),
            "data-node-id": node.id,
            transform: "translate(" + x + " " + y + ")"
        });
        const frame = CreateSvg("rect", {
            class: "ship-tree-card-frame",
            width,
            height
        });
        const techCorner = CreateSvg("path", {
            class: "ship-tree-card-tech-corner",
            d: "M 0 0 H 30 L 0 30 Z"
        });
        const tech = CreateSvg("text", {
            class: "ship-tree-card-tech",
            x: 4,
            y: 12
        });
        const label = CreateSvg("text", {
            class: "ship-tree-card-label",
            x: width / 2,
            y: height - 23,
            "text-anchor": "middle"
        });
        const labelBackground = CreateSvg("rect", {
            class: "ship-tree-card-label-background",
            x: 1,
            y: height - 34,
            width: width - 2,
            height: 33
        });
        const imageURL = ResolveImageURL(node.type.imageURL);

        if (imageURL)
        {
            group.appendChild(CreateSvg("image", {
                class: "ship-tree-card-image",
                href: imageURL,
                x: 10,
                y: 14,
                width: width - 20,
                height: 47,
                preserveAspectRatio: "xMidYMid meet"
            }));
        }
        else
        {
            group.appendChild(CreateSvg("path", {
                class: "ship-tree-card-mark",
                d: "M 13 41 L 31 25 L 65 28 L 83 41 L 65 54 L 31 57 Z"
            }));
        }

        tech.textContent = node.type.techLevel ? "II".slice(0, Number(node.type.techLevel)) : "";
        label.textContent = node.label;
        group.prepend(frame, techCorner, tech);
        group.append(
            labelBackground,
            label,
            CreateMasteryBadge(width / 2, height - 9, node.type.masteryLevel, node.type.masteryIconURL)
        );
        group.addEventListener("pointerdown", event => event.stopPropagation());
        group.addEventListener("click", () =>
        {
            this.controller.SelectType(node.id);
            this.#ShowInspector(node.type);
        });
        group.addEventListener("dblclick", () =>
        {
            this.controller.SelectType(node.id);
            this.OpenSelected();
        });

        return group;
    }

    /** Updates the outline presentation from current controller state. */
    #RenderOutline()
    {
        const selected = new Set(this.controller.selection.Snapshot().selectedIDs);
        const matches = this.controller.Search(this.query);
        const items = [];

        for (const node of matches)
        {
            const item = CreateElement("li", "ship-tree-outline-item");
            const button = CreateElement("button", "ship-tree-outline-button");
            const name = CreateElement("span", "ship-tree-outline-name", node.label);
            const group = CreateElement("span", "ship-tree-outline-group", this.controller.model.GetGroup(node.groupID)?.label ?? "Ship");

            button.type = "button";
            button.dataset.nodeId = String(node.id);
            button.setAttribute("aria-current", selected.has(node.id) ? "true" : "false");
            button.append(name, group);
            button.addEventListener("click", () =>
            {
                this.controller.SelectType(node.id);
                this.#FocusNode(node);
                this.#ShowInspector(node.type);
            });
            button.addEventListener("dblclick", () => this.OpenSelected());
            item.appendChild(button);
            items.push(item);
        }

        if (items.length === 0)
        {
            items.push(CreateElement("li", "ship-tree-outline-empty", "No matching hulls"));
        }

        this.outline.replaceChildren();

        for (const item of items)
        {
            this.outline.appendChild(item);
        }

        if (this.query.length > 0) this.searchPanel.dataset.open = "true";
        else if (!this.searchPanel.contains(document.activeElement)) delete this.searchPanel.dataset.open;
    }

    /** Updates the preview presentation from current controller state. */
    #RenderPreview()
    {
        const selected = this.controller.GetSelectedType();

        if (selected) this.#ShowInspector(selected);
        else this.inspector.hidden = true;
    }

    /** Presents the current inspector state to the browser user. */
    #ShowInspector(type)
    {
        if (!type)
        {
            this.inspector.hidden = true;
            return;
        }

        const header = CreateElement("header", "ship-tree-inspector-header");
        const imageURL = ResolveImageURL(type.imageURL);
        const identity = CreateElement("div", "ship-tree-inspector-identity");
        const eyebrow = CreateElement("span", "ship-tree-inspector-eyebrow", type.className ?? "Ship");
        const name = CreateElement("strong", "ship-tree-inspector-name", type.name ?? type.typeID);
        const mastery = CreateElement(
            "span",
            "ship-tree-inspector-mastery",
            "Mastery " + MasteryLabel(type.masteryLevel)
        );
        const summary = CreateElement(
            "p",
            "ship-tree-inspector-summary",
            type.preview?.summary ?? "No preview information is available for this hull."
        );
        const traits = CreateElement("dl", "ship-tree-inspector-traits");
        const actions = CreateElement("div", "ship-tree-inspector-actions");
        const open = CreateButton("Open full Show Info", "Show Info");

        if (imageURL)
        {
            const image = document.createElement("img");

            image.className = "ship-tree-inspector-image";
            image.src = imageURL;
            image.alt = "";
            header.appendChild(image);
        }

        identity.append(eyebrow, name, mastery);
        header.appendChild(identity);

        for (const trait of type.preview?.traits ?? [])
        {
            traits.append(
                CreateElement("dt", "", trait.label),
                CreateElement("dd", "", trait.value)
            );
        }

        open.disabled = !this.onOpenType;
        open.addEventListener("click", () =>
        {
            this.controller.SelectType(type.typeID ?? type.id);
            this.OpenSelected();
        });
        actions.appendChild(open);
        this.inspector.replaceChildren(header, summary, traits, actions);
        this.inspector.hidden = false;
        this.#PositionInspector(type);
    }

    /** Places the inspector beside its selected ship-tree card. */
    #PositionInspector(type)
    {
        const node = this.controller.model.GetNode(type.typeID ?? type.id);
        const stageBounds = this.stage?.getBoundingClientRect();

        if (!node || !stageBounds) return;

        const viewport = this.controller.viewport;
        const leftAnchor = viewport.WorldToScreen(
            node.position.x - node.size.width / 2,
            node.position.y
        );
        const rightAnchor = viewport.WorldToScreen(
            node.position.x + node.size.width / 2,
            node.position.y
        );
        const inspectorBounds = this.inspector.getBoundingClientRect();
        const gap = 14;
        const inset = 12;
        let left = rightAnchor.x + gap;
        let top = rightAnchor.y - 34;

        if (left + inspectorBounds.width > stageBounds.width - inset)
        {
            left = leftAnchor.x - inspectorBounds.width - gap;
        }

        left = Clamp(left, inset, Math.max(inset, stageBounds.width - inspectorBounds.width - inset));
        top = Clamp(top, inset, Math.max(inset, stageBounds.height - inspectorBounds.height - inset));
        this.inspector.style.left = Math.round(left) + "px";
        this.inspector.style.top = Math.round(top) + "px";
    }

    /** Moves keyboard focus to one visible ship-tree node. */
    #FocusNode(node)
    {
        this.controller.viewport.SetCenter(node.position.x, node.position.y);
        this.Render();
    }

    /** Applies anchored ship-tree zoom around a browser-local point. */
    #Zoom(factor, anchor = null)
    {
        const viewport = this.controller.viewport;

        viewport.ZoomBy(factor, anchor ?? {
            anchorX: viewport.width / 2,
            anchorY: viewport.height / 2
        });
        this.Render();
    }

    /** Translates a wheel gesture into anchored ship-tree zoom. */
    #Wheel(event)
    {
        event.preventDefault();
        const point = this.#LocalPoint(event);
        const factor = Math.exp(-event.deltaY * 0.0015);

        this.#Zoom(factor, { anchorX: point.x, anchorY: point.y });
    }

    /** Begins pointer-owned panning for the mounted ship-tree viewport. */
    #PointerDown(event)
    {
        if (event.button !== 0) return;

        this.#drag = {
            pointerID: event.pointerId,
            x: event.clientX,
            y: event.clientY
        };
        this.svg.setPointerCapture?.(event.pointerId);
        this.svg.classList.add("is-dragging");
    }

    /** Advances the active ship-tree pan from pointer movement. */
    #PointerMove(event)
    {
        if (this.#drag?.pointerID !== event.pointerId) return;

        const deltaX = event.clientX - this.#drag.x;
        const deltaY = event.clientY - this.#drag.y;

        this.#drag.x = event.clientX;
        this.#drag.y = event.clientY;
        this.controller.viewport.PanByScreen(deltaX, deltaY);
        this.Render();
    }

    /** Ends pointer-owned panning and releases browser capture. */
    #PointerUp(event)
    {
        if (this.#drag?.pointerID !== event.pointerId) return;

        this.#drag = null;
        this.svg.releasePointerCapture?.(event.pointerId);
        this.svg.classList.remove("is-dragging");
    }

    /** Handles keyboard navigation and activation for the ship-tree window. */
    #KeyDown(event)
    {
        const viewport = this.controller.viewport;
        const step = event.shiftKey ? 96 : 32;

        if (event.key === "+" || event.key === "=") this.#Zoom(1.25);
        else if (event.key === "-") this.#Zoom(1 / 1.25);
        else if (event.key === "0") this.Fit();
        else if (event.key === "ArrowLeft") viewport.PanByScreen(step, 0);
        else if (event.key === "ArrowRight") viewport.PanByScreen(-step, 0);
        else if (event.key === "ArrowUp") viewport.PanByScreen(0, step);
        else if (event.key === "ArrowDown") viewport.PanByScreen(0, -step);
        else return;

        event.preventDefault();
        this.Render();
    }

    /** Converts a pointer position into host-local CSS coordinates. */
    #LocalPoint(event)
    {
        const bounds = this.svg.getBoundingClientRect();

        return {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
        };
    }

}

function CreateMasteryBadge(x, y, level, iconURL = null)
{
    const badge = CreateSvg("g", {
        class: "ship-tree-card-mastery",
        transform: "translate(" + x + " " + y + ")"
    });
    const resolvedIconURL = ResolveImageURL(iconURL);

    if (resolvedIconURL)
    {
        badge.appendChild(CreateSvg("image", {
            href: resolvedIconURL,
            x: -24,
            y: -16,
            width: 48,
            height: 32,
            preserveAspectRatio: "xMidYMid meet"
        }));

        return badge;
    }

    const left = CreateSvg("path", { d: "M -20 0 h 11 l 5 4 M -18 -4 h 10 l 4 4" });
    const right = CreateSvg("path", { d: "M 20 0 H 9 L 4 4 M 18 -4 H 8 L 4 0" });
    const circle = CreateSvg("circle", { cx: 0, cy: 0, r: 8 });
    const numeral = CreateSvg("text", {
        x: 0,
        y: 3.5,
        "text-anchor": "middle"
    });

    numeral.textContent = MasteryLabel(level);
    badge.append(left, right, circle, numeral);

    return badge;
}

function CreateButton(label, text)
{
    const button = CreateElement("button", "cjs-eve-button", text);

    button.type = "button";
    button.setAttribute("aria-label", label);

    return button;
}

function CreateElement(name, className = "", text = null)
{
    const element = document.createElement(name);

    if (className) element.className = className;
    if (text !== null) element.textContent = String(text);

    return element;
}

function CreateSvg(name, attributes = {})
{
    const element = document.createElementNS(SVG, name);

    for (const [ key, value ] of Object.entries(attributes))
    {
        element.setAttribute(key, String(value));
    }

    return element;
}

function ResolveImageURL(value)
{
    if (typeof value !== "string" || value.length === 0) return null;
    if (/^(?:data:image\/|blob:|https?:\/\/|\/|\.{0,2}\/)/iu.test(value)) return value;

    return null;
}

function DiagramLod(zoom)
{
    if (zoom < 0.42) return "far";
    if (zoom < 0.72) return "medium";

    return "near";
}

function MasteryLabel(level)
{
    level = Number(level);
    if (!Number.isInteger(level) || level < 1 || level > 5) return "—";

    return [ "", "I", "II", "III", "IV", "V" ][level];
}

function ParseID(value)
{
    const number = Number(value);

    return Number.isFinite(number) && String(number) === value ? number : value;
}

function Clamp(value, minimum, maximum)
{
    return Math.min(maximum, Math.max(minimum, value));
}
