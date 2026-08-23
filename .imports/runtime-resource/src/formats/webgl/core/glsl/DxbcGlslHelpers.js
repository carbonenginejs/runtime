import { WebglReadError } from "../errors.js";

/**
 * Registry of GLSL helper functions the emitter can require per shader.
 *
 * Lowering rules call `require(name)` when they emit a call site; `emit()`
 * then returns only the helpers a shader actually used, in dependency order,
 * so generated GLSL stays minimal and deterministic.
 */
export class DxbcGlslHelperRegistry
{
    /**
     * Initializes an empty helper-definition registry and requirement set.
     */
    constructor()
    {
        this._definitions = new Map();
        this._required = new Set();
    }

    /**
   * Defines a helper function.
   *
   * @param {string} name Helper function name used at call sites.
   * @param {object} definition Helper body.
   * @param {string} definition.source Complete GLSL function source.
   * @param {string[]} [definition.deps] Helper names this helper calls.
   */
    define(name, { source, deps = [] })
    {
        this._definitions.set(name, { source, deps });
    }

    /**
   * Marks a helper (and its dependencies) as used by the current shader.
   *
   * @param {string} name Helper function name.
   * @returns {string} The helper name, for inline use at the call site.
   */
    require(name)
    {
        if (!this._definitions.has(name))
        {
            throw new WebglReadError("Unknown GLSL helper", { helper: name });
        }
        if (!this._required.has(name))
        {
            this._required.add(name);
            for (const dep of this._definitions.get(name).deps)
            {
                this.require(dep);
            }
        }
        return name;
    }

    /**
   * Clears the per-shader usage set while keeping definitions.
   */
    reset()
    {
        this._required.clear();
    }

    /**
   * Emits the source of every required helper in dependency order.
   *
   * @returns {string} GLSL source block, empty when nothing was required.
   */
    emit()
    {
        const ordered = [];
        const visited = new Set();
        const visit = (name) =>
        {
            if (visited.has(name)) return;
            visited.add(name);
            for (const dep of this._definitions.get(name).deps)
            {
                if (this._required.has(dep)) visit(dep);
            }
            ordered.push(this._definitions.get(name).source);
        };
        for (const name of this._required)
        {
            visit(name);
        }
        return ordered.join("\n\n");
    }
}
