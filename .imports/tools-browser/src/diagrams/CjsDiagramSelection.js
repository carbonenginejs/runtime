/** Maintains renderer-neutral selection, focus, and hover by stable record ID. */
export class CjsDiagramSelection
{

    #listeners = new Set();
    #selected = new Set();

    /**
     * Creates a diagram diagram selection around caller-supplied browser
     * collaborators.
     */
    constructor({ selectedIDs = [], focusedID = null, hoveredID = null } = {})
    {
        this.focusedID = nullableID(focusedID, "focusedID");
        this.hoveredID = nullableID(hoveredID, "hoveredID");

        for (const id of selectedIDs)
        {
            this.#selected.add(stableID(id, "selectedID"));
        }
    }

    /** Selects, toggles, or exclusively replaces one stable ID. */
    Select(id, { additive = false, toggle = false, focus = true } = {})
    {
        id = stableID(id, "id");
        const before = this.Snapshot();
        const wasSelected = this.#selected.has(id);

        if (!additive)
        {
            this.#selected.clear();
        }

        if (toggle && wasSelected)
        {
            this.#selected.delete(id);
        }
        else
        {
            this.#selected.add(id);
        }

        if (focus) this.focusedID = id;

        return this.#Finish("selection", before);
    }

    /** Replaces the complete selected-ID set without expanding it variadically. */
    ReplaceSelected(ids, { focusID = undefined } = {})
    {
        if (!ids || typeof ids[Symbol.iterator] !== "function")
        {
            throw new TypeError("Selected IDs must be iterable");
        }

        const before = this.Snapshot();

        this.#selected.clear();

        for (const id of ids)
        {
            this.#selected.add(stableID(id, "selectedID"));
        }

        if (focusID !== undefined)
        {
            this.focusedID = nullableID(focusID, "focusID");
        }

        return this.#Finish("selection", before);
    }

    /** Clears selection and optionally retains keyboard focus. */
    Clear({ retainFocus = false } = {})
    {
        const before = this.Snapshot();

        this.#selected.clear();
        if (!retainFocus) this.focusedID = null;

        return this.#Finish("selection", before);
    }

    /** Updates the keyboard-focused record independently from selection. */
    SetFocus(id)
    {
        const before = this.Snapshot();

        this.focusedID = nullableID(id, "focusedID");

        return this.#Finish("focus", before);
    }

    /** Updates the transient hovered record independently from selection. */
    SetHover(id)
    {
        const before = this.Snapshot();

        this.hoveredID = nullableID(id, "hoveredID");

        return this.#Finish("hover", before);
    }

    /** Removes state for IDs absent from a current model or visible domain. */
    Retain(ids)
    {
        if (!ids || typeof ids[Symbol.iterator] !== "function")
        {
            throw new TypeError("Retained IDs must be iterable");
        }

        const valid = new Set();

        for (const id of ids)
        {
            valid.add(stableID(id, "retainedID"));
        }

        const before = this.Snapshot();

        for (const id of this.#selected)
        {
            if (!valid.has(id)) this.#selected.delete(id);
        }

        if (this.focusedID !== null && !valid.has(this.focusedID)) this.focusedID = null;
        if (this.hoveredID !== null && !valid.has(this.hoveredID)) this.hoveredID = null;

        return this.#Finish("retain", before);
    }

    /** Returns whether a stable ID is selected. */
    IsSelected(id)
    {
        return this.#selected.has(stableID(id, "id"));
    }

    /** Observes explicit state changes; the returned function unsubscribes. */
    Subscribe(listener)
    {
        if (typeof listener !== "function") throw new TypeError("Selection listener must be a function");

        this.#listeners.add(listener);

        return () => this.#listeners.delete(listener);
    }

    /** Returns one mutable selection snapshot in deterministic insertion order. */
    Snapshot()
    {
        const selectedIDs = [];

        for (const id of this.#selected)
        {
            selectedIDs.push(id);
        }

        return {
            selectedIDs,
            focusedID: this.focusedID,
            hoveredID: this.hoveredID
        };
    }

    /** Finalizes a diagram selection mutation and emits its resulting state. */
    #Finish(reason, before)
    {
        const after = this.Snapshot();

        if (sameSnapshot(before, after)) return false;

        for (const listener of this.#listeners)
        {
            listener({ reason, state: after });
        }

        return true;
    }

}

function sameSnapshot(left, right)
{
    if (left.focusedID !== right.focusedID || left.hoveredID !== right.hoveredID) return false;
    if (left.selectedIDs.length !== right.selectedIDs.length) return false;

    for (let index = 0; index < left.selectedIDs.length; index++)
    {
        if (left.selectedIDs[index] !== right.selectedIDs[index]) return false;
    }

    return true;
}

function nullableID(value, label)
{
    return value === null || value === undefined ? null : stableID(value, label);
}

function stableID(value, label)
{
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;

    throw new TypeError(`${label} must be a non-empty string or finite number`);
}
