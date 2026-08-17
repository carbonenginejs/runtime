import { CjsShipShowInfoDemo } from "../../src/demo-apps/index.js";
import { CjsESIShipShowInfoMemorySource } from "../../src/ship-show-info/index.js";

const records = [
    Record(7001, "Synthetic Survey Hull", "synthetic_survey:base:race", 7002),
    Record(7002, "Synthetic Survey Hull II", "synthetic_survey:variant:race", 7001)
];
const source = new CjsESIShipShowInfoMemorySource({ records });
const parameters = new URLSearchParams(location.search);
const resourceRoot = parameters.get("resourceRoot") || "/eve/latest/resources/ui/texture/";
const demo = new CjsShipShowInfoDemo({
    shipSource: source,
    initialTypeID: 7001,
    initialRegionID: 90000001,
    uiResourceRoot: resourceRoot
});

await demo.Mount(document.querySelector("#demo-root"));
globalThis.shipShowInfoDemo = demo;

function Record(typeID, name, dna, variationTypeID)
{
    return {
        ship: {
            typeID,
            name,
            groupName: "Demonstration Hull",
            metaLabel: "Caller-owned memory data",
            dna,
            longAxis: 240
        },
        price: { estimatedPrice: typeID * 100000 },
        overview: {
            description: "This standalone window uses synthetic browser-memory records.",
            bonuses: []
        },
        attributes: {
            longAxis: 240,
            groups: []
        },
        fitting: {
            rows: [],
            hardpoints: []
        },
        skills: {
            requirements: [],
            tiers: [],
            profileState: { status: "anonymous" }
        },
        variations: {
            selectedTypeID: typeID,
            variations: [
                { typeID, name },
                {
                    typeID: variationTypeID,
                    name: variationTypeID === 7001
                        ? "Synthetic Survey Hull"
                        : "Synthetic Survey Hull II"
                }
            ]
        },
        industry: {
            materials: []
        },
        skins: {
            skins: []
        }
    };
}
