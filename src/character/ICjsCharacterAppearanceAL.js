import { CjsSchema, meta } from "#schema";

/**
 * The appearance realization layer `CjsCharacterAppearanceManager` drives:
 * prepare a hidden stage from neutral construction data, publish it, hand
 * visible ownership between stages, and release them. Every method is
 * required; an implementation that has nothing to do for one says so in its
 * own body. `CjsCharacterGlesAppearanceAL` is the implementation.
 */
export class ICjsCharacterAppearanceAL
{

    /**
     * Prepares a hidden, non-published stage from neutral construction data.
     *
     * @param {object} _construction - Neutral construction data.
     * @param {object} [_context] - Request context.
     * @returns {Promise<object>} The prepared stage.
     */
    async Prepare(_construction, _context = {})
    {
        throw new Error("ICjsCharacterAppearanceAL.Prepare must be overridden by an appearance AL.");
    }

    /**
     * Publishes the first prepared stage.
     *
     * @param {object} _stage - The prepared stage.
     * @param {object} [_context] - Request context.
     * @returns {Promise<*>} Implementation-defined completion.
     */
    async Commit(_stage, _context = {})
    {
        throw new Error("ICjsCharacterAppearanceAL.Commit must be overridden by an appearance AL.");
    }

    /**
     * Releases a prepared or committed stage.
     *
     * @param {object} _stage - The stage.
     * @param {object} [_context] - Request context.
     * @returns {Promise<*>} Implementation-defined completion.
     */
    async Release(_stage, _context = {})
    {
        throw new Error("ICjsCharacterAppearanceAL.Release must be overridden by an appearance AL.");
    }

    /**
     * Warms immutable configured model templates ahead of use.
     *
     * @param {string[]} _paths - Template paths.
     * @returns {Promise<object>|object} Implementation-defined warm result.
     */
    WarmConfiguredModelTemplates(_paths)
    {
        throw new Error("ICjsCharacterAppearanceAL.WarmConfiguredModelTemplates must be overridden by an appearance AL.");
    }

    /**
     * Shows or hides one configured part of a stage, for diagnostics.
     *
     * @param {object} _stage - The committed stage.
     * @param {string} _partSourceRecordID - The part source record.
     * @param {boolean} _display - Whether to display it.
     * @returns {*} Implementation-defined result.
     */
    SetConfiguredPartDisplay(_stage, _partSourceRecordID, _display)
    {
        throw new Error("ICjsCharacterAppearanceAL.SetConfiguredPartDisplay must be overridden by an appearance AL.");
    }

    /**
     * Shows or hides one foundation role of a stage, for diagnostics.
     *
     * @param {object} _stage - The committed stage.
     * @param {string} _role - The foundation role.
     * @param {boolean} _display - Whether to display it.
     * @returns {*} Implementation-defined result.
     */
    SetFoundationDisplay(_stage, _role, _display)
    {
        throw new Error("ICjsCharacterAppearanceAL.SetFoundationDisplay must be overridden by an appearance AL.");
    }

    /**
     * Applies a morph-only update to a committed stage in place.
     *
     * @param {object} _stage - The committed stage.
     * @param {object} _targets - Morph target weights.
     * @param {object} [_context] - Request context.
     * @returns {*} Implementation-defined result.
     */
    UpdateMorphTargets(_stage, _targets, _context = {})
    {
        throw new Error("ICjsCharacterAppearanceAL.UpdateMorphTargets must be overridden by an appearance AL.");
    }

    /**
     * Hands visible ownership from one committed stage to another atomically.
     *
     * @param {object} _previous - The visible stage.
     * @param {object} _staged - The stage taking over.
     * @param {object} [_context] - Request context.
     * @returns {Promise<*>} Implementation-defined completion.
     */
    async Handoff(_previous, _staged, _context = {})
    {
        throw new Error("ICjsCharacterAppearanceAL.Handoff must be overridden by an appearance AL.");
    }

    /**
     * Returns the detached state the manager and diagnostics need.
     *
     * @param {object} _stage - The stage.
     * @returns {object} Detached diagnostics.
     */
    GetDiagnostics(_stage)
    {
        throw new Error("ICjsCharacterAppearanceAL.GetDiagnostics must be overridden by an appearance AL.");
    }

}

for (const method of [
    "Prepare", "Commit", "Release", "WarmConfiguredModelTemplates", "SetConfiguredPartDisplay",
    "SetFoundationDisplay", "UpdateMorphTargets", "Handoff", "GetDiagnostics"
])
{
    CjsSchema.decorateMethod(ICjsCharacterAppearanceAL, method, meta.abstract);
}

CjsSchema.define(ICjsCharacterAppearanceAL, { className: "ICjsCharacterAppearanceAL", family: "character", fields: {} });
