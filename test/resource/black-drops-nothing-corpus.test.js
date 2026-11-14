// The Black reader drops nothing, over a real build (format-ownership.md § Readers and factories drop nothing).
//
// A .black file names every attribute it stores. The reader finds the class's persisted member for each one or
// throws "Invalid attribute", as Carbon's does (blue/src/IRootReader.cpp), so a file that reads has had every
// attribute placed. Two things can still lose what a file says, and both are logged: a list that refuses an item
// of the wrong class, and anything a reader warns about. So the test reads a fixed sample of the build's .black
// files with every class registered, builds every object a proxy defers, and fails on a read that throws or that
// logs a warning or an error, unless DROPS lists it with its proof.
//
// What this does not prove: that a value placed is a value kept. A handler that read an attribute and threw its
// value away would pass here. A byte-exact round trip of the same files through the Black writer would catch
// that; it is the next Black test of the plan's step 19, and until it exists this is the residual.
//
// Game files are never committed (org rule). The files come from the tools-core service by res:/ path; the test
// skips when it is not running (CJS_TOOLS_SERVER, default http://127.0.0.1:5510). It follows the build the service
// calls latest, on purpose: a new build is where a new attribute appears. Set CJS_CLIENT_BUILD to repeat a run on
// one build; the build read is printed with the result.
import assert from "node:assert/strict";
import { test } from "node:test";
import { clientResources } from "../support/clientResources.js";
import { ImportAllDistModules } from "../support/allDistClasses.js";
import { blackBuilder } from "../support/blackReader.js";
import { CcpLog } from "../../npm/dist/global/index.js";

/** How many of the build's .black files are read: every Nth path in sorted order. */
const SAMPLE = 1200;

/**
 * What a read may report and still pass, each with its proof: the message, with file names taken out.
 * Empty: nothing is dropped.
 * @type {Object<string, string>}
 */
const DROPS = {};

/**
 * Log lines that say nothing about a file's content. Some Carbon constructors load an effect (Tr2LineSet, the
 * volumetrics renderer), and this test registers no resource factories, so resMan reports each one.
 */
const NOT_THE_FILE = [ "No factory found for extension (" ];

const resources = await clientResources();

test("the Black reader places every attribute of a sample of the build's files", { skip: resources.skip ?? false }, async t =>
{
  await ImportAllDistModules();
  const paths = resources.Sample(".black", SAMPLE);
  assert.ok(paths.length > 0, "the build ships .black files");

  const logged = [];
  const sink = (_channel, _type, _userData, message) => logged.push(message);
  CcpLog.UnregisterLogEcho(CcpLog.LogToDebugger);
  CcpLog.RegisterLogEcho(sink, CcpLog.LogType.LOGTYPE_WARN);
  t.after(() =>
  {
    CcpLog.UnregisterLogEcho(sink);
    CcpLog.RegisterLogEcho(CcpLog.LogToDebugger);
  });

  /** Each finding once, with how many files had it and one of them. */
  const findings = new Map();
  const report = (message, path) =>
  {
    const key = message.replaceAll(path, "<file>");
    if (Object.hasOwn(DROPS, key)) return;
    const finding = findings.get(key) ?? { count: 0, example: path };
    finding.count++;
    findings.set(key, finding);
  };

  let objects = 0;
  const unavailable = [];
  for (const path of paths)
  {
    // A file the service cannot hand over says nothing about the reader; too many of them fails below.
    let bytes;
    try { bytes = await resources.Read(path); }
    catch (error) { unavailable.push(`${path}: ${error.message}`); continue; }
    logged.length = 0;
    try
    {
      const reader = blackBuilder(bytes, { initialize: false });
      // Marker 0 is the root; a proxy met on the way adds the object it defers. Each position is built once.
      const built = new Set();
      for (let marker = 0; marker < reader._objectMarkers.length; marker++)
      {
        const position = reader._objectMarkers[marker];
        if (built.has(position)) continue;
        built.add(position);
        if (reader.CreateObject(marker) === null) report(reader.GetErrorMessage() || "the reader gave no object", path);
        else objects++;
      }
    }
    catch (error)
    {
      report(`${error.name}: ${error.message}`, path);
    }
    for (const message of logged) if (!NOT_THE_FILE.some(start => message.startsWith(start))) report(`logged: ${message}`, path);
  }

  const read = paths.length - unavailable.length;
  t.diagnostic(`build ${resources.build}: ${read} of ${resources.Paths(".black").length} .black files read, ${objects} root and deferred objects built`);
  if (unavailable.length) t.diagnostic(`${unavailable.length} sampled file(s) could not be downloaded, e.g. ${unavailable[0]}`);
  assert.ok(read >= paths.length * 0.9, `the service handed over only ${read} of the ${paths.length} sampled files`);
  assert.deepEqual(
    [ ...findings ].map(([ message, { count, example } ]) => `${count} file(s), e.g. ${example}: ${message}`),
    [],
    "every attribute of every sampled file reaches a member, or DROPS lists it with its proof"
  );
});
