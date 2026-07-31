/** Structural character-control sink for persisted GState parameter records. */
export class CjsCharacterGStateParameterSink
{
    #defaults = new Map();

    #gStateAnimation;

    /**
     * Creates a sink over initialized persisted parameter records and captures
     * baselines lazily.
     */
    constructor(gStateAnimation)
    {
        if (!gStateAnimation || (typeof gStateAnimation !== "object" && typeof gStateAnimation !== "function"))
        {
            throw new TypeError("GState parameter sink requires an animation object");
        }

        if (CjsCharacterGStateParameterSink.getParameters(gStateAnimation).length === 0)
        {
            throw new Error("GState parameter sink requires initialized parameter records");
        }
        this.#gStateAnimation = gStateAnimation;
    }

    /** Builds the neutral control key used by CjsCharacterControlLayer.parameters. */
    static formatParameterName(nodeName, parameterName)
    {
        const node = CjsCharacterGStateParameterSink.normalizeName(nodeName, "node");
        const parameter = CjsCharacterGStateParameterSink.normalizeName(parameterName, "parameter");

        if (node.includes("/") || parameter.includes("/"))
        {
            throw new TypeError("GState node and parameter names cannot contain '/'");
        }

        return `${node}/${parameter}`;
    }

    /** Splits one neutral control key without changing its case. */
    static parseParameterName(value)
    {
        const controlName = CjsCharacterGStateParameterSink.normalizeName(value, "control");
        const separator = controlName.indexOf("/");

        if (separator <= 0 || separator === controlName.length - 1 || controlName.indexOf("/", separator + 1) !== -1)
        {
            throw new TypeError(`GState control name "${controlName}" must have the form node/parameter`);
        }

        return {
            nodeName: controlName.slice(0, separator),
            parameterName: controlName.slice(separator + 1)
        };
    }

    /** Returns the live persisted parameter records consumed by native sampling. */
    static getParameters(gStateAnimation)
    {
        const parameters = gStateAnimation?.parameters;

        if (!Array.isArray(parameters))
        {
            throw new TypeError("GState animation parameters must be an array");
        }

        return parameters;
    }

    /** Returns an exact case-sensitive parameter record or null. */
    static findParameter(gStateAnimation, nodeName, parameterName)
    {
        const node = CjsCharacterGStateParameterSink.normalizeName(nodeName, "node");
        const parameter = CjsCharacterGStateParameterSink.normalizeName(parameterName, "parameter");
        const matches = CjsCharacterGStateParameterSink.getParameters(gStateAnimation).filter(value =>
            CjsCharacterGStateParameterSink.getNodeName(value) === node
            && CjsCharacterGStateParameterSink.getParameterName(value) === parameter
        );

        if (matches.length > 1)
        {
            throw new Error(`GState parameter ${node}/${parameter} is duplicated`);
        }

        return matches[0] || null;
    }

    /** Reads one parameter record's exact node name. */
    static getNodeName(parameter)
    {
        const value = typeof parameter?.GetNodeName === "function"
            ? parameter.GetNodeName()
            : parameter?.nodename ?? parameter?.nodeName;

        return CjsCharacterGStateParameterSink.normalizeName(value, "node");
    }

    /** Reads one parameter record's exact output name. */
    static getParameterName(parameter)
    {
        const value = typeof parameter?.GetName === "function"
            ? parameter.GetName()
            : parameter?.name;

        return CjsCharacterGStateParameterSink.normalizeName(value, "parameter");
    }

    /** Reads and validates one parameter record value. */
    static getParameterValue(parameter)
    {
        const value = Number(typeof parameter?.GetValue === "function"
            ? parameter.GetValue()
            : parameter?.value);

        if (!Number.isFinite(value))
        {
            throw new TypeError("GState parameter value must be finite");
        }

        return value;
    }

    /** Updates the persisted value that native PrePhysicsAnimation consumes. */
    static setParameterValue(parameter, value)
    {
        const result = Number(value);

        if (!Number.isFinite(result))
        {
            throw new TypeError("GState parameter value must be finite");
        }

        if (typeof parameter?.SetValue === "function")
        {
            parameter.SetValue(result);
        }
        else if (parameter && typeof parameter === "object")
        {
            parameter.value = result;
        }
        else
        {
            throw new TypeError("GState parameter record is not writable");
        }

        return result;
    }

    /** Validates a public node, parameter, or control name without folding case. */
    static normalizeName(value, label = "name")
    {
        if (typeof value !== "string" || !value.trim())
        {
            throw new TypeError(`GState ${label} name must be a non-empty string`);
        }

        return value.trim();
    }

    /** Returns whether the animation currently exposes one exact parameter. */
    HasParameter(controlName)
    {
        const { nodeName, parameterName } = CjsCharacterGStateParameterSink.parseParameterName(controlName);
        return CjsCharacterGStateParameterSink.findParameter(
            this.#gStateAnimation,
            nodeName,
            parameterName
        ) !== null;
    }

    /** Reads one exact parameter through the neutral control key. */
    GetParameterValue(controlName)
    {
        return CjsCharacterGStateParameterSink.getParameterValue(this.#resolve(controlName));
    }

    /** Implements the structural CjsCharacterControlSink parameter channel. */
    SetParameter(controlName, value)
    {
        const parsed = CjsCharacterGStateParameterSink.parseParameterName(controlName);
        const key = CjsCharacterGStateParameterSink.formatParameterName(
            parsed.nodeName,
            parsed.parameterName
        );
        const parameter = this.#resolve(key);

        if (!this.#defaults.has(key))
        {
            this.#defaults.set(key, CjsCharacterGStateParameterSink.getParameterValue(parameter));
        }

        CjsCharacterGStateParameterSink.setParameterValue(parameter, value);
    }

    /** Restores the value captured before this sink first controlled the parameter. */
    ResetParameter(controlName)
    {
        const parsed = CjsCharacterGStateParameterSink.parseParameterName(controlName);
        const key = CjsCharacterGStateParameterSink.formatParameterName(parsed.nodeName, parsed.parameterName);

        if (!this.#defaults.has(key))
        {
            return false;
        }

        CjsCharacterGStateParameterSink.setParameterValue(this.#resolve(key), this.#defaults.get(key));
        this.#defaults.delete(key);
        return true;
    }

    /** Restores every parameter owned by this sink in stable name order. */
    Reset()
    {
        let changed = false;

        for (const name of [ ...this.#defaults.keys() ].sort((left, right) =>
            String(left).localeCompare(String(right), "en", { numeric: true })))
        {
            changed = this.ResetParameter(name) || changed;
        }

        return changed;
    }

    /** Resolves an exact node/parameter key or throws when its record is absent. */
    #resolve(controlName)
    {
        const { nodeName, parameterName } = CjsCharacterGStateParameterSink.parseParameterName(controlName);
        const parameter = CjsCharacterGStateParameterSink.findParameter(
            this.#gStateAnimation,
            nodeName,
            parameterName
        );

        if (!parameter)
        {
            throw new Error(`GState parameter ${nodeName}/${parameterName} was not found`);
        }

        return parameter;
    }
}
