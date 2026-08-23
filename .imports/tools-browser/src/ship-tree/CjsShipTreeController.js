import {
    CjsDiagramModel,
    CjsDiagramSelection,
    CjsDiagramViewport
} from "../diagrams/index.js";
import { layoutShipTree } from "./shipTreeLayout.js";

/** Coordinates Ship Tree acquisition and reusable diagram behavior. */
export class CjsShipTreeController
{

    #listeners = new Set();
    #loadVersion = 0;
    #unsubscribeSelection = null;

    /**
     * Creates a ship-tree ship tree controller around caller-supplied browser
     * collaborators.
     */
    constructor({
        source,
        viewport = new CjsDiagramViewport({ minZoom: 0.18, maxZoom: 3 }),
        selection = new CjsDiagramSelection(),
        layout = layoutShipTree
    } = {})
    {
        if (typeof source?.FetchTree !== "function") throw new TypeError("Ship Tree source requires FetchTree()");
        if (typeof layout !== "function") throw new TypeError("Ship Tree layout must be a function");

        this.source = source;
        this.viewport = viewport;
        this.selection = selection;
        this.layout = layout;
        this.model = new CjsDiagramModel();
        this.tree = null;
        this.status = "idle";
        this.error = null;
        this.#unsubscribeSelection = selection.Subscribe(() => this.#Emit("selection"));
    }

    /** Fetches one authored tree asynchronously and replaces the current model. */
    async FetchTree(options = {})
    {
        const version = ++this.#loadVersion;

        this.status = "loading";
        this.error = null;
        this.#Emit("loading");

        try
        {
            const tree = await this.source.FetchTree(options);

            if (version !== this.#loadVersion) return null;

            this.SetTree(tree);

            return tree;
        }
        catch (error)
        {
            if (version !== this.#loadVersion) return null;

            this.status = error?.name === "AbortError" ? "idle" : "error";
            this.error = error;
            this.#Emit(this.status);
            throw error;
        }
    }

    /** Applies an already acquired mutable Ship Tree answer. */
    SetTree(tree)
    {
        const records = this.layout(tree);

        this.tree = tree;
        this.model.Replace(records);
        this.selection.Retain(this.model.nodes.map(node => node.id));
        this.status = "ready";
        this.error = null;
        this.#Emit("tree");

        return this;
    }

    /** Selects one type by its stable type ID. */
    SelectType(typeID, options = {})
    {
        if (!this.model.GetNode(typeID)) return false;

        return this.selection.Select(typeID, options);
    }

    /** Returns the selected type record, or null. */
    GetSelectedType()
    {
        const id = this.selection.Snapshot().selectedIDs[0];

        return id === undefined ? null : this.model.GetNode(id)?.type ?? null;
    }

    /** Returns matching ship nodes without changing selection. */
    Search(query)
    {
        query = String(query ?? "").trim().toLocaleLowerCase();
        if (!query) return this.model.nodes.slice();

        return this.model.nodes.filter(node => node.label.toLocaleLowerCase().includes(query));
    }

    /** Fits all current cards into the viewport. */
    Fit({ padding = 42 } = {})
    {
        const bounds = this.model.GetBounds();

        if (!bounds) return false;

        const result = this.viewport.FitBounds(bounds, { padding });

        if (result) this.#Emit("viewport");

        return result;
    }

    /** Returns visible cards through the generic spatial-index seam. */
    GetVisibleNodes(options = {})
    {
        return this.model.QueryNodes(this.viewport.GetVisibleBounds(), options);
    }

    /** Returns the selected group plus every predecessor and connecting edge. */
    GetSelectedPath()
    {
        const selected = this.GetSelectedType();
        const selectedNode = selected ? this.model.GetNode(selected.typeID ?? selected.id) : null;

        if (!selectedNode) return { groupIDs: [], edgeIDs: [] };

        const groupIDs = new Set([ selectedNode.groupID ]);
        const edgeIDs = new Set();
        const pending = [ selectedNode.groupID ];

        while (pending.length)
        {
            const targetID = pending.pop();

            for (const edge of this.model.edges)
            {
                if (edge.targetGroupID !== targetID) continue;

                edgeIDs.add(edge.id);

                if (!groupIDs.has(edge.sourceGroupID))
                {
                    groupIDs.add(edge.sourceGroupID);
                    pending.push(edge.sourceGroupID);
                }
            }
        }

        return {
            groupIDs: Array.from(groupIDs),
            edgeIDs: Array.from(edgeIDs)
        };
    }

    /** Observes controller state; the returned function unsubscribes. */
    Subscribe(listener)
    {
        if (typeof listener !== "function") throw new TypeError("Ship Tree listener must be a function");

        this.#listeners.add(listener);

        return () => this.#listeners.delete(listener);
    }

    /** Returns a mutable renderer-safe state snapshot. */
    Snapshot()
    {
        return {
            status: this.status,
            error: this.error,
            tree: this.tree,
            model: this.model.Snapshot(),
            viewport: this.viewport.Snapshot(),
            selection: this.selection.Snapshot(),
            selectedPath: this.GetSelectedPath()
        };
    }

    /** Invalidates pending loads and releases selection observation. */
    Destroy()
    {
        this.#loadVersion++;
        this.#unsubscribeSelection?.();
        this.#unsubscribeSelection = null;
        this.#listeners.clear();
    }

    /** Notifies registered ship-tree observers after mutable state changes. */
    #Emit(reason)
    {
        for (const listener of this.#listeners)
        {
            listener({ reason, controller: this });
        }
    }

}
