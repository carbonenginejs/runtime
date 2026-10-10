import test from "node:test";
import assert from "node:assert/strict";
import { CjsStorage, CjsStorageFormatCodec } from "../../../npm/dist/resource/storage/index.js";
import { CjsGraphFormat } from "../../../npm/dist/resource/formats/graph/index.js";
import { CjsGraphBinaryFormat } from "../../../npm/dist/resource/formats/graphbinary/index.js";

for (const format of [CjsGraphFormat, CjsGraphBinaryFormat])
{
    test(`${format.id} stores authored graph identity through the shared service`, async () =>
    {
        const codec = new CjsStorageFormatCodec({ id: format.wireFormat, version: format.version, format,
            graph: true, readOptions: { emit: "values" }, writeOptions: { input: "values" } });
        const service = new CjsStorage({ namespace: "editor", codecs: [codec] });
        const scene = { _type: "ExampleScene", _id: 1, name: "authored", child: { _type: "ExampleNode", parent: { _ref: 1 } } };
        assert.equal((await service.Write("scenes", "draft", scene, { codec: codec.id })).stored, true);
        assert.deepEqual((await service.Read("scenes", "draft")).value, scene);
        await service.Close();
    });
}
