export const Config = {
    regions: {
        dev: { name: "Local Server", address: "127.0.0.1:6942", https: false },
        devpublic: { name: "Less Autism", address: "98.234.71.160:6942", https: false }
        naw: { name: "NA WEST", address: "teleport-suroi.onrender.com:6942", https: false }
    },
    defaultRegion: "naw",
    mode: "normal"
} satisfies ConfigType as ConfigType;

export interface ConfigType {
    readonly regions: Record<string, {
        readonly name: string
        readonly address: string
        readonly https: boolean
    }>
    readonly defaultRegion: string
    readonly mode: string
}
