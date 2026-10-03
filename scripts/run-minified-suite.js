import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const loader = new URL("./minified-test-loader.js", import.meta.url).href;
const env = { ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --experimental-loader=${loader}`.trim(),
    CJS_MINIFIED_TEST: "1"
};
const result = spawnSync(process.execPath, ["--test", ...process.argv.slice(2)], {
    cwd: root, env, stdio: "inherit", windowsHide: true
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
