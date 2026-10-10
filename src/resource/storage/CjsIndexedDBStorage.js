import { matchesStorage, storageKey } from "./storageRecord.js";

/** Our persistent adapter, available in windows and workers with an injected IndexedDB factory. */
export class CjsIndexedDBStorage
{
    static className = "CjsIndexedDBStorage";
    capabilities = { persistent: true, atomicBatch: true, binary: true };
    factory = null;
    ranges = null;
    name = "";
    database = null;
    opening = null;

    /** Delay opening until an operation needs persistence. */
    constructor({ name = "carbonenginejs-storage", indexedDB = globalThis.indexedDB, keyRange = globalThis.IDBKeyRange } = {})
    {
        if (!indexedDB || !keyRange) throw new Error("IndexedDB storage is unavailable in this host");
        this.factory = indexedDB;
        this.ranges = keyRange;
        this.name = name;
    }

    /** Open our own versioned store without modifying unrelated databases. */
    async _Open()
    {
        if (this.database) return this.database;
        if (!this.opening)
        {
            this.opening = new Promise((resolve, reject) =>
            {
                const request = this.factory.open(this.name, 1);
                let failed = false;
                request.onupgradeneeded = () => request.result.createObjectStore("records", { keyPath: "storageID" });
                request.onerror = () => { failed = true; reject(request.error); };
                request.onblocked = () => { failed = true; reject(new Error("IndexedDB open blocked by another connection")); };
                request.onsuccess = () =>
                {
                    if (failed) { request.result.close(); return; }
                    this.database = request.result;
                    this.database.onversionchange = () => { this.database.close(); this.database = null; };
                    resolve(this.database);
                };
            }).finally(() => { this.opening = null; });
        }
        return this.opening;
    }

    /** Complete only after the transaction commits, not after a request succeeds. */
    async _Run(mode, submit)
    {
        const database = await this._Open();
        return new Promise((resolve, reject) =>
        {
            const transaction = database.transaction("records", mode);
            let result = null;
            let failure = null;
            transaction.oncomplete = () => resolve(result);
            transaction.onabort = () => reject(failure || transaction.error || new Error("IndexedDB transaction aborted"));
            transaction.onerror = () => { failure = transaction.error; };
            try { submit(transaction.objectStore("records"), value => { result = value; }); }
            catch (error) { failure = error; transaction.abort(); }
        });
    }

    /** Read one owned structured-clone snapshot. */
    Read(address)
    {
        const key = storageKey(address);
        return this._Run("readonly", (store, result) =>
        {
            const request = store.get(key);
            request.onsuccess = () => result(request.result?.record ?? null);
        });
    }

    /** Commit a batch atomically. Values must already be encoded before entering the transaction. */
    WriteBatch(records)
    {
        const entries = records.map(record => ({ storageID: storageKey(record.address), record }));
        return this._Run("readwrite", store =>
        {
            for (const entry of entries) store.put(entry);
        });
    }

    /** Delete exactly one identity. */
    Delete(address)
    {
        const key = storageKey(address);
        return this._Run("readwrite", store => { store.delete(key); });
    }

    /**
     * Read bounded cursor pages. Every page closes its transaction before yielding,
     * so a slow consumer cannot encounter an auto-committed cursor transaction.
     * Concurrent writers can change later pages; this is not a snapshot scan.
     */
    async *List(query)
    {
        let after = null;
        while (true)
        {
            const page = await this._Run("readonly", (store, result) =>
            {
                const records = [];
                let visited = 0;
                const request = store.openCursor(after === null ? null : this.ranges.lowerBound(after, true));
                request.onsuccess = () =>
                {
                    const cursor = request.result;
                    if (!cursor) { result({ records, after: null }); return; }
                    if (matchesStorage(cursor.value.record, query)) records.push(cursor.value.record);
                    visited++;
                    if (visited === 128) { result({ records, after: cursor.primaryKey }); return; }
                    cursor.continue();
                };
            });
            for (const record of page.records) yield record;
            if (page.after === null) return;
            after = page.after;
        }
    }

    /** Release the connection; stored data survives. */
    async Close()
    {
        if (this.opening) await this.opening;
        if (this.database) this.database.close();
        this.database = null;
    }
}
