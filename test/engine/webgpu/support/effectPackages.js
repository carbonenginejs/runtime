import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Build the manifest's pinned packages in process, from source effect bytes.
 *
 * These two tests used to need a directory of pre-built `.carbonwebgpu` files, named
 * by `CJS_WEBGPU_FIXTURE_DIR`. Nobody had one, so both tests skipped for weeks
 * while the path they cover stopped working - the engine kept reading a chunk
 * package that the producer had stopped emitting, and 237 synthetic-record
 * tests stayed green throughout.
 *
 * A pre-built package is the wrong artifact to gate on twice over: it is fully
 * determined by (source bytes, compiler), so storing it duplicates a guarantee
 * the compiler already gives, and it rots silently when the compiler moves -
 * which is exactly what the manifest's own rationale says. Building in process
 * removes the stale-artifact class entirely: the package under test is always
 * the one today's code produces.
 *
 * What cannot be removed is the need for CCP source bytes. They are game files,
 * never committed and never published, so the gate stays - but it moves to the
 * source corpus the format proofs already use, `CARBON_EFFECT_CORPUS_DIR`, which
 * is one directory holding `graphics/effect.dx11/` and `graphics/effect.dx12/`
 * at the manifest's pinned build.
 *
 * Provenance is asserted, not assumed: every source file's sha256 is checked
 * against the manifest before it is built. A corpus at the wrong build fails by
 * name here rather than producing a package that differs for reasons the test
 * would then attribute to the engine.
 */

const CORPUS_DIR = process.env.CARBON_EFFECT_CORPUS_DIR || null;

/**
 * The reason these tests skip, or `false` when they can run.
 *
 * `false`, not null or undefined: `node --test` reports a test as `# SKIP`
 * whenever the `skip` key is *present*, whatever its value, while still running
 * the body. A nullish reason therefore produces a test that runs and reports as
 * skipped - which is how this suite came to look green while covering nothing.
 *
 * @returns {string|false} Skip reason, or false to run.
 */
export function corpusSkipReason()
{
  return CORPUS_DIR
    ? false
    : "set CARBON_EFFECT_CORPUS_DIR to a source effect corpus at build 3444265 "
      + "(one directory holding graphics/effect.dx11/ and graphics/effect.dx12/), "
      + "fetched through tools-core; see test/fixtures/quadv5/manifest.json";
}

/**
 * Read one fixture record from the pinned manifest.
 *
 * @param {string} id Fixture id, such as `quadv5-ppt-main`.
 * @returns {Promise<object>} Manifest fixture record.
 */
export async function manifestFixture(id)
{
  const manifest = JSON.parse(
    await readFile(new URL("../fixtures/quadv5/manifest.json", import.meta.url), "utf8")
  );
  const fixture = manifest.fixtures.find((entry) => entry.id === id);
  if (!fixture) throw new Error(`manifest has no fixture ${id}`);
  return fixture;
}

function sha256Hex(bytes)
{
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Read the pinned source effect for one backend, checking its identity.
 *
 * @param {object} fixture Manifest fixture record.
 * @param {string} backend `dx11` or `dx12`.
 * @returns {Promise<Uint8Array>} Source effect bytes.
 */
export async function sourceEffectBytes(fixture, backend)
{
  const record = fixture.backends.find((entry) => entry.backend === backend);
  if (!record) throw new Error(`fixture ${fixture.id} declares no ${backend} source`);

  const relative = record.sourceLogicalPath.replace(/^res:\//u, "");
  const path = join(CORPUS_DIR, relative);
  await stat(path).catch(() =>
  {
    throw new Error(`${fixture.id} ${backend}: ${relative} is not in ${CORPUS_DIR}`);
  });

  const bytes = new Uint8Array(await readFile(path));
  const digest = sha256Hex(bytes);
  if (digest !== record.sourceSha256)
  {
    throw new Error(
      `${fixture.id} ${backend}: ${relative} is sha256 ${digest}, but the manifest pins `
      + `${record.sourceSha256}. The corpus is not at build ${fixture.buildId}.`
    );
  }
  return bytes;
}

/**
 * Build the fixture's selected-body package from source, in process.
 *
 * The permutation is asserted axis by axis by the builder itself, so a body
 * chosen by a different set of options fails at build time rather than being
 * compared as if it were the pinned one.
 *
 * @param {object} format `CjsWebgpuFormat`.
 * @param {object} fixture Manifest fixture record.
 * @param {string} backend `dx11` or `dx12`.
 * @returns {Promise<object>} `{bytes, source}`.
 */
export async function buildSelectedPackage(format, fixture, backend)
{
  const bytes = await sourceEffectBytes(fixture, backend);
  const source = fixture.backends.find((entry) => entry.backend === backend).sourceLogicalPath;
  const permutation = Object.entries(fixture.permutation).map(([ name, value ]) => ({ name, value }));

  return { bytes: format.buildEffect(bytes, { source, permutation }).bytes, source };
}

/**
 * Build the fixture's every-body package from source, in process.
 *
 * @param {object} format `CjsWebgpuFormat`.
 * @param {object} fixture Manifest fixture record.
 * @param {string} backend `dx11` or `dx12`.
 * @returns {Promise<object>} `{bytes, source, expected}`.
 */
export async function buildAllBodyPackage(format, fixture, backend)
{
  const bytes = await sourceEffectBytes(fixture, backend);
  const source = fixture.backends.find((entry) => entry.backend === backend).sourceLogicalPath;
  const expected = fixture.allBody.find((entry) => entry.backend === backend) ?? null;

  return { bytes: format.buildEffect(bytes, { source, mode: "all" }).bytes, source, expected };
}
