import { open, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

/** Writes one artifact through a same-directory fsynced temporary file. */
export async function writeFileAtomic(targetPath, data, encoding) {
  const resolved = path.resolve(targetPath);
  const temporaryPath = path.join(
    path.dirname(resolved),
    `.${path.basename(resolved)}.${process.pid}.${randomUUID()}.tmp`
  );
  let handle = null;
  try {
    handle = await open(temporaryPath, "wx");
    await handle.writeFile(data, encoding);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporaryPath, resolved);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}
