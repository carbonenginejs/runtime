import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
export function sqliteFixture()
{
    const dir = mkdtempSync(join(tmpdir(), "cjs-tables-"));
    const path = join(dir, "test.sqlite");
    const db = new DatabaseSync(path);
    try
    {
        db.exec("CREATE TABLE graphics (graphicID INTEGER PRIMARY KEY, bytes BLOB, wide INTEGER); CREATE TABLE empty (name TEXT)");
        const insert = db.prepare("INSERT INTO graphics VALUES (?, ?, ?)");
        for (let i = 1; i <= 257; i++) insert.run(i, new Uint8Array([i % 256]), 9007199254740993n);
    }
    finally { db.close(); }
    try { return new Uint8Array(readFileSync(path)); }
    finally { rmSync(dir, { recursive: true, force: true }); }
}

export function fsdFixture()
{
    const schema = { schema: "carbonenginejs.fsdBinarySchema", schemaVersion: 1, name: "graphics",
        path: "res:/staticdata/test.fsdbinary", schemaID: "ab".repeat(24),
        container: { type: "MAP", recordSize: 16, key: { type: "UINT_32_IDENTIFIER", offset: 0 },
            fields: [{ name: "graphicID", type: "UINT_32_IDENTIFIER", offset: 0 }, { name: "size", type: "FLOAT_32", offset: 4 }] } };
    const bytes = new Uint8Array(144);
    bytes.fill(0xab, 0, 24);
    const view = new DataView(bytes.buffer);
    for (const [offset, value] of [[24,112],[32,32],[40,3],[56,1],[64,64],[88,3]]) view.setBigUint64(offset, BigInt(value), true);
    for (let i=0; i<3; i++) { view.setUint32(96+i*16, 10+i, true); view.setFloat32(100+i*16, 1.25+i, true); }
    return { bytes, schema };
}
