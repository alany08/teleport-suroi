import { ItemType, ObjectDefinitions, type ItemDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { type AmmoDefinition } from "./ammos";
import { type HealingItemDefinition } from "./healingItems";
import { type ThrowableDefinition } from "./throwables";

export interface BackpackDefinition extends ItemDefinition {
    readonly itemType: ItemType.Backpack
    readonly level: number
    readonly maxCapacity: Record<ReferenceTo<HealingItemDefinition | AmmoDefinition | ThrowableDefinition>, number>
}

export const Backpacks = ObjectDefinitions.create<BackpackDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            itemType: ItemType.Backpack,
            noDrop: false
        }),
        backpack_factory: (name: string) => ({
            idString: `${name.toLowerCase()}_pack`,
            name: `${name} Pack`
        })
    })
)(
    apply => [
        {
            idString: "bag",
            name: "Bag",
            level: 0,
            maxCapacity: {
                gauze: Infinity,
                medikit: Infinity,
                cola: Infinity,
                tablets: Infinity,
                "12g": Infinity,
                "556mm": Infinity,
                "762mm": Infinity,
                "9mm": Infinity,
                "127mm": Infinity,
                power_cell: Infinity,
                curadell: Infinity,
                frag_grenade: Infinity,
                smoke_grenade: Infinity
            },
            noDrop: true
        },
        apply(
            "backpack_factory",
            {
                level: 1,
                maxCapacity: {
                    gauze: Infinity,
                    medikit: Infinity,
                    cola: Infinity,
                    tablets: Infinity,
                    "12g": Infinity,
                    "556mm": Infinity,
                    "762mm": Infinity,
                    "9mm": Infinity,
                    "127mm": Infinity,
                    power_cell: Infinity,
                    curadell: Infinity,
                    frag_grenade: Infinity,
                    smoke_grenade: Infinity
                }
            },
            "Basic"
        ),
        apply(
            "backpack_factory",
            {
                level: 2,
                maxCapacity: {
                    gauze: Infinity,
                    medikit: Infinity,
                    cola: Infinity,
                    tablets: Infinity,
                    "12g": Infinity,
                    "556mm": Infinity,
                    "762mm": Infinity,
                    "9mm": Infinity,
                    "127mm": Infinity,
                    power_cell: Infinity,
                    curadell: Infinity,
                    frag_grenade: Infinity,
                    smoke_grenade: Infinity
                }
            },
            "Regular"
        ),
        apply(
            "backpack_factory",
            {
                level: 3,
                maxCapacity: {
                    gauze: Infinity,
                    medikit: Infinity,
                    cola: Infinity,
                    tablets: Infinity,
                    "12g": Infinity,
                    "556mm": Infinity,
                    "762mm": Infinity,
                    "9mm": Infinity,
                    "127mm": Infinity,
                    power_cell: Infinity,
                    curadell: Infinity,
                    frag_grenade: Infinity,
                    smoke_grenade: Infinity
                }
            },
            "Tactical"
        )
    ]
);
