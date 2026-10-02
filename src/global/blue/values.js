import { CjsSchema } from "../schema/CjsSchema.js";
import { DictWriter } from "./DictWriter.js";
import { DictReader } from "./DictReader.js";
import { applyValues } from "../compose/values.js";

// Values are a service over registered declarations. Importing Blue installs
// this bridge; a class needs no model base or instance transport methods.
// Existing format-specific factories and values methods keep their contracts.
// Construction resolves references before the native mapped initialization phase.
CjsSchema.registerValuesService({
    /** Exports fields through a custom format contract or the Blue dictionary writer. */
    getValues(target, out = {}, options = {})
    {
        if (target && typeof target.GetValues === "function") return target.GetValues(options);
        return new DictWriter().WriteObject(target, out, options);
    },
    /** Applies values through the existing custom or schema transport contract. */
    setValues(target, values = {}, options = {})
    {
        if (target && typeof target.SetValues === "function") return target.SetValues(values, options);
        return ReadValues(target, values, options);
    },
    /** Resolves a registered values factory, preserving its class-owned normalization. */
    from(className, values = {}, options = {})
    {
        const name = typeof className === "string" ? className.trim() : "";
        const Constructor = CjsSchema.GetConstructor(name);
        if (!Constructor)
        {
            throw new TypeError(`CjsSchema.from has no class registered for "${String(className)}".`);
        }
        if (typeof Constructor.from === "function") return Constructor.from(values, options);
        return new DictReader(options, applyValues).CreateObject(values, Constructor);
    }
});

/** Populates declared values without redispatching a class-owned SetValues override. */
export function ReadValues(target, values = {}, options = {})
{
    return applyValues(target, options, recordWrite =>
        new DictReader(options).ReadInto(target, values, null, recordWrite));
}
