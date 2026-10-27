/** Our storage opt-in declaration. Options are added only for a concrete consumer. */
export function validateStoragePolicy(policy, name)
{
    if (policy === null) return;
    if (!policy || Object.getPrototypeOf(policy) !== Object.prototype)
        throw new TypeError("Service " + name + ": storagePolicy must be null or a plain object");
    const keys = Reflect.ownKeys(policy);
    if (keys.length) throw new TypeError("Service " + name + ": unsupported storagePolicy field " + String(keys[0]));
}
