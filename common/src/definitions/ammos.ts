import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface AmmoDefinition extends ItemDefinition {
    readonly itemType: ItemType.Ammo
    readonly maxStackSize: number
    readonly characteristicColor: {
        readonly hue: number
        readonly saturation: number
        readonly lightness: number
    }
    /**
     * Marking an ammo type as `ephemeral` does the following:
     * - All players start with it maxed out
     * - It cannot be depleted nor dropped
     * - It does not show up on the HUD
     * - It can always be picked up
     */
    readonly ephemeral: boolean
    readonly defaultCasingFrame: string
    readonly hideUnlessPresent: boolean
}

export const Ammos = ObjectDefinitions.create<AmmoDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            itemType: ItemType.Ammo,
            noDrop: false,
            ephemeral: false,
            defaultCasingFrame: "",
            hideUnlessPresent: false
        })
    })
)(
    () => [
        {
            idString: "12g",
            name: "12 gauge",
            maxStackSize: Infinity,
            characteristicColor: {
                hue: 0,
                saturation: 100,
                lightness: 89
            },
            defaultCasingFrame: "casing_12ga_275in"
        },
        {
            idString: "556mm",
            name: "5.56mm",
            maxStackSize: Infinity,
            characteristicColor: {
                hue: 120,
                saturation: 100,
                lightness: 75
            },
            defaultCasingFrame: "casing_556x45mm"
        },
        {
            idString: "762mm",
            name: "7.62mm",
            maxStackSize: Infinity,
            characteristicColor: {
                hue: 210,
                saturation: 100,
                lightness: 65
            },
            defaultCasingFrame: "casing_762x51mm"
        },
        {
            idString: "9mm",
            name: "9mm",
            maxStackSize: Infinity,
            characteristicColor: {
                hue: 48,
                saturation: 100,
                lightness: 75
            },
            defaultCasingFrame: "casing_9x19mm"
        },
        {
            idString: "127mm",
            name: "12.7mm",
            maxStackSize: Infinity,
            characteristicColor: {
                hue: 75,
                saturation: 100,
                lightness: 75
            },
            defaultCasingFrame: "casing_50bmg",
            hideUnlessPresent: true
        },
        {
            idString: "curadell",
            name: "Curadell",
            maxStackSize: Infinity,
            characteristicColor: {
                hue: 26,
                saturation: 100,
                lightness: 75
            },
            defaultCasingFrame: "casing_curadell",
            hideUnlessPresent: true
        },
        /*
        {
            idString: "50ae",
            name: ".50 AE",
            itemType: ItemType.Ammo
        }, */

        // Ephemeral ammo types below

        {
            idString: "power_cell",
            name: "P.O.W.E.R. cell",
            maxStackSize: Infinity,
            characteristicColor: {
                hue: 190,
                saturation: 100,
                lightness: 85
            },
            defaultCasingFrame: "casing_power_cell",
            ephemeral: true
        },
        {
            idString: "bb",
            name: "6mm BB",
            maxStackSize: Infinity,
            characteristicColor: {
                hue: 0,
                saturation: 0,
                lightness: 75
            },
            ephemeral: true
        }
    ]
);
