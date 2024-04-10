import { GasState } from "../../../common/src/constants";

export interface GasStage {
    readonly state: GasState
    readonly duration: number
    readonly oldRadius: number
    readonly newRadius: number
    readonly dps: number
    readonly summonAirdrop?: boolean
}

export const GasStages: GasStage[] = [
    {
        state: GasState.Inactive,
        duration: 0,
        oldRadius: 0.762,
        newRadius: 0.762,
        dps: 0,
        summonAirdrop: true
    },
    {
        state: GasState.Waiting,
        duration: 90,
        oldRadius: 0.762,
        newRadius: 0.381,
        dps: 0,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 30,
        oldRadius: 0.762,
        newRadius: 0.381,
        dps: 1
    },
    {
        state: GasState.Waiting,
        duration: 70,
        oldRadius: 0.381,
        newRadius: 0.238,
        dps: 2
    },
    {
        state: GasState.Advancing,
        duration: 25,
        oldRadius: 0.381,
        newRadius: 0.238,
        dps: 3
    },
    {
        state: GasState.Waiting,
        duration: 50,
        oldRadius: 0.238,
        newRadius: 0.095,
        dps: 4,
        summonAirdrop: true
    },
    {
        state: GasState.Advancing,
        duration: 20,
        oldRadius: 0.238,
        newRadius: 0.095,
        dps: 6
    },
    {
        state: GasState.Waiting,
        duration: 40,
        oldRadius: 0.095,
        newRadius: 0.048,
        dps: 7
    },
    {
        state: GasState.Advancing,
        duration: 10,
        oldRadius: 0.095,
        newRadius: 0.048,
        dps: 8
    },
    {
        state: GasState.Waiting,
        duration: 25,
        oldRadius: 0.048,
        newRadius: 0.024,
        dps: 10
    },
    {
        state: GasState.Advancing,
        duration: 10,
        oldRadius: 0.048,
        newRadius: 0.024,
        dps: 12
    },
    {
        state: GasState.Waiting,
        duration: 15,
        oldRadius: 0.024,
        newRadius: 0,
        dps: 14
    },
    {
        state: GasState.Advancing,
        duration: 10,
        oldRadius: 0.024,
        newRadius: 0,
        dps: 16
    },
    {
        state: GasState.Waiting,
        duration: 0,
        oldRadius: 0,
        newRadius: 0,
        dps: 18
    }
];

// console.log(GasStages.reduce((a, b) => a + b.duration, 0));
