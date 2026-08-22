import { CjsShipTreeMemorySource } from "../../src/ship-tree/index.js";
import { TnyShipTreeWindow } from "../../src/ship-tree/ui/index.js";
import { syntheticShipTree } from "./fixture.js";

const window = new TnyShipTreeWindow({
    source: new CjsShipTreeMemorySource({ trees: [ syntheticShipTree ] }),
    initialFactionID: syntheticShipTree.factionID,
    onOpenType(type)
    {
        const status = document.querySelector("#selection-status");
        const url = new URL("../ship-show-info/", location.href);

        url.searchParams.set("typeID", type.typeID);
        url.searchParams.set("regionID", 10000002);
        status.textContent = `Opening Show Info for ${type.name} (${type.typeID})`;
        location.assign(url);
    }
});

await window.Mount(document.querySelector("#ship-tree-root"));
globalThis.shipTreeWindow = window;
