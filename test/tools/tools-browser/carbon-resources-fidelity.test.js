import assert from "node:assert/strict";
import test from "node:test";
import {
    ResourceGroup, ResourceGroupImpl, ResourceInfo, ResourceInfoParams, ResultType,
    VersionInternal, ResourceGroupMergeParams, StatusSettings, CallbackSettings, ParameterInfo, Parameter
} from "../../../src/tools/fileindex/carbon/index.js";

import { CjsResFileIndexFormat } from "../../../src/resource/formats/resfileindex/CjsResFileIndexFormat.js";

// Each test pins one finding of the 2026-09-27 fidelity review against
// E:/carbonengine/resources, citing the Carbon lines it follows.

const csv = text =>
{
    const group = new ResourceGroup();
    assert.equal(group.m_impl.ImportFromCSV(text).type, ResultType.SUCCESS);
    return group;
};

const exportCsv = group =>
{
    const out = { value: "" };
    assert.equal(group.m_impl.ExportCsv(new VersionInternal(0, 0, 0), out).type, ResultType.SUCCESS);
    return out.value;
};

const yamlGroup = lines => [ "Version: 0.1.0", "Type: ResourceGroup", ...lines ].join("\n") + "\n";

const RESOURCE = [
    "Resources:",
    "  - RelativePath: a.txt",
    "    Type: Resource",
    "    Location: aa/aa_1",
    "    Checksum: \"0123\"",
    "    UncompressedSize: 5"
];

test("finding 1: YAML import refuses a group missing TotalResourcesSizeUnCompressed or Resources", () =>
{
    // ResourceGroupImpl.cpp:1616-1633.
    const noTotal = new ResourceGroupImpl();
    assert.equal(noTotal.ImportFromYamlString(yamlGroup([ "NumberOfResources: 0", "Resources: []" ])).type, ResultType.MALFORMED_RESOURCE_GROUP);

    const noResources = new ResourceGroupImpl();
    assert.equal(noResources.ImportFromYamlString(yamlGroup([ "NumberOfResources: 0", "TotalResourcesSizeUnCompressed: 0" ])).type, ResultType.MALFORMED_RESOURCE_GROUP);
});

test("finding 1: without TotalResourcesSizeCompressed the total is unset, and export omits it", () =>
{
    // ResourceGroupImpl.cpp:1610-1614 resets; ExportYaml writes it only when set (:1745-1752).
    const group = new ResourceGroupImpl();
    assert.equal(group.ImportFromYamlString(yamlGroup([ "NumberOfResources: 1", "TotalResourcesSizeUnCompressed: 5", ...RESOURCE ])).type, ResultType.SUCCESS);
    assert.equal(group.m_totalResourcesSizeCompressed.HasValue(), false);
    const out = {};
    assert.equal(group.ExportYaml(new VersionInternal(0, 1, 0), out).type, ResultType.SUCCESS);
    assert.doesNotMatch(out.value, /TotalResourcesSizeCompressed/u);
});

test("CE-40: a compressed resource after that reset throws bad optional access, as Carbon does", () =>
{
    // ResourceGroupImpl.cpp:2942 reads GetValue() on the reset total.
    const group = new ResourceGroupImpl();
    const withCompressed = [ ...RESOURCE, "    CompressedSize: 3" ];
    assert.throws(
        () => group.ImportFromYamlString(yamlGroup([ "NumberOfResources: 1", "TotalResourcesSizeUnCompressed: 5", ...withCompressed ])),
        /bad optional access/u);
});

test("finding 2: paths order as std::filesystem::path, element by element", () =>
{
    // ResourceInfo.cpp:1051-1063 compares paths; `/` separates before `-` and `.` compare.
    const group = csv([ "res:/a.b,x/1,c,1,1", "res:/a-b,x/2,c,1,1", "res:/a/b,x/3,c,1,1" ].join("\n"));
    assert.equal(exportCsv(group), "res:/a/b,x/3,c,1,1\nres:/a-b,x/2,c,1,1\nres:/a.b,x/1,c,1,1\n");

    const one = new ResourceInfoParams();
    one.relativePath = "dir//file";
    const two = new ResourceInfoParams();
    two.relativePath = "dir\\file";
    assert.equal(new ResourceInfo(one).Equals(new ResourceInfo(two)), true, "repeated and back slashes are one separator");
});

test("findings 3 and 4: YAML scalars stay source text, and BinaryOperation 0 is cleared on merge", () =>
{
    // ResourceInfo.cpp:832-857 read strings with as<std::string>(); :1024-1031 reset a zero operation.
    const group = new ResourceGroup();
    assert.equal(group.m_impl.ImportFromYamlString(yamlGroup([
        "NumberOfResources: 1", "TotalResourcesSizeCompressed: 0", "TotalResourcesSizeUnCompressed: 5",
        ...RESOURCE, "    BinaryOperation: 0"
    ])).type, ResultType.SUCCESS);
    const resource = group.m_impl.m_resourcesParameter[0];
    const checksum = {};
    resource.GetChecksum(checksum);
    assert.equal(checksum.value, "0123", "leading zero kept");
    const operation = {};
    resource.GetBinaryOperation(operation);
    assert.equal(operation.value, 0);

    const merged = new ResourceGroup();
    const params = new ResourceGroupMergeParams();
    params.mergedResourceGroup = merged;
    params.resourceGroupToMerge = new ResourceGroup();
    assert.equal(group.Merge(params).type, ResultType.SUCCESS);
    assert.equal(merged.m_impl.m_resourcesParameter[0].m_binaryOperation.HasValue(), false);
});

test("finding 5: resource YAML is written in Carbon's key order", () =>
{
    // ResourceInfo.cpp:1164-1266: RelativePath, Type, Location, Checksum, UncompressedSize, CompressedSize, BinaryOperation, Prefix.
    const group = csv("res:/dir/a.txt,aa/aa_1,sum,5,3,2");
    const out = {};
    assert.equal(group.m_impl.ExportYaml(new VersionInternal(0, 1, 0), out).type, ResultType.SUCCESS);
    const keys = [ ...out.value.matchAll(/^\s+-?\s*(\w+):/gmu) ].map(match => match[1]);
    assert.deepEqual(keys, [ "RelativePath", "Type", "Location", "Checksum", "UncompressedSize", "CompressedSize", "BinaryOperation", "Prefix" ]);
});

test("finding 6: a missing or unknown resource Type is MALFORMED_RESOURCE; known unported types throw", () =>
{
    // ResourceGroupFactory.cpp:86-138.
    const group = new ResourceGroupImpl();
    const missing = group.ImportFromYamlString(yamlGroup([
        "NumberOfResources: 1", "TotalResourcesSizeUnCompressed: 0", "Resources:", "  - RelativePath: a"
    ]));
    assert.equal(missing.type, ResultType.MALFORMED_RESOURCE);
    assert.equal(missing.info, "Tried to load a resource info without a 'Type' attribute.");

    const unknown = new ResourceGroupImpl().ImportFromYamlString(yamlGroup([
        "NumberOfResources: 1", "TotalResourcesSizeUnCompressed: 0", "Resources:", "  - Type: Nope"
    ]));
    assert.equal(unknown.type, ResultType.MALFORMED_RESOURCE);
    assert.equal(unknown.info, "Unexpected Resource Info Type: 'Nope'.");

    assert.throws(() => new ResourceGroupImpl().ImportFromYamlString(yamlGroup([
        "NumberOfResources: 1", "TotalResourcesSizeUnCompressed: 0", "Resources:", "  - Type: BinaryPatch"
    ])), /BinaryPatch is not ported/u);
});

test("finding 11: an empty sixth column followed by more is malformed; a trailing comma is not", () =>
{
    // ResourceGroupImpl.cpp:1418-1442: getline yields "" and stoull throws.
    assert.equal(new ResourceGroupImpl().ImportFromCSV("res:/a,x/1,c,2,2,,7\n").type, ResultType.MALFORMED_RESOURCE_INPUT);
    const trailing = new ResourceGroupImpl();
    assert.equal(trailing.ImportFromCSV("res:/a,x/1,c,2,2,\n").type, ResultType.SUCCESS);
    assert.equal(trailing.m_resourcesParameter[0].m_binaryOperation.HasValue(), false);
    assert.throws(() => CjsResFileIndexFormat.read("res:/a,x/1,c,2,2,,7\n"), SyntaxError);
});

test("the format and the Carbon port read CSV rows through the same rules", () =>
{
    const line = "res:/Dir/A.dds,ab/ab_1,sum,18446744073709551615,-1,4294967295";
    const row = CjsResFileIndexFormat.readRow(line);
    assert.equal(row.uncompressedSize, 18446744073709551615n);
    assert.equal(row.compressedSize, 18446744073709551615n, "negative wraps as stoull does");
    assert.equal(row.binaryOperation, 4294967295);
    assert.throws(() => CjsResFileIndexFormat.readRow("res:/a,x/1,c,1,1,4294967296"), RangeError);

    const group = csv(line);
    const resource = group.m_impl.m_resourcesParameter[0];
    const path = {};
    resource.GetRelativePath(path);
    assert.equal(path.value, "Dir/A.dds", "case kept");
});

test("finding 12: the resource count is uintmax_t", () =>
{
    assert.equal(csv("res:/a,x/1,c,1,1").m_impl.m_numberOfResources.GetValue(), 1n);
});

test("finding 13: callback settings are copied, and a missing callback is one answer", () =>
{
    // StatusSettings.cpp:22-25 assigns the struct; :27-31 and :60-65 test the callback.
    const settings = new CallbackSettings();
    const calls = [];
    settings.statusCallback = (...args) => calls.push(args);
    const status = new StatusSettings();
    status.SetCallbackSettings(settings);
    settings.statusCallback = null;
    status.Update(0, 50, 0, "copied");
    assert.equal(calls.length, 1, "the scope kept its own copy");

    const empty = new StatusSettings();
    empty.m_callbackSettings.statusCallback = undefined;
    assert.equal(empty.RequiresStatusUpdates(), false);
});

test("finding 15: version gates come from Carbon's parameter table", () =>
{
    // ParameterVersion.cpp:27 and :57-72: Type is carried from 0.1.0, in both contexts.
    assert.equal(ParameterInfo.isParameterExpected(Parameter.TYPE, "Resource", new VersionInternal(0, 0, 0)), false);
    assert.equal(ParameterInfo.isParameterExpected(Parameter.TYPE, "Resource", new VersionInternal(0, 1, 0)), true);
    // Quirk, reproduced (CE-41): operator> is true when ANY component is greater
    // (VersionInternal.cpp:26-43), so 0.1.0 > 1.0.0 and the gate's 0.1.0 <= 1.0.0
    // is false: a 1.0.0 document does not carry Type.
    assert.equal(ParameterInfo.isParameterExpected(Parameter.TYPE, "Resource", new VersionInternal(1, 0, 0)), false);
    assert.equal(ParameterInfo.isParameterExpected(Parameter.RELATIVE_PATH, "ResourceGroup", new VersionInternal(0, 1, 0)), false);
    assert.equal(ParameterInfo.isParameterRequired(Parameter.PREFIX, "Resource", new VersionInternal(0, 1, 0)), false, "optional");
});

test("finding 17: invalid UTF-8 from the host reader is FAILED_TO_OPEN_FILE", async () =>
{
    const group = new ResourceGroupImpl();
    const result = await group.ImportFromFile({ filename: "index.txt", read: () => new Uint8Array([ 0xff, 0xfe ]) });
    assert.equal(result.type, ResultType.FAILED_TO_OPEN_FILE);
});
