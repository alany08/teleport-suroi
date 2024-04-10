import { existsSync, readFile, writeFile, writeFileSync } from "fs";
import { URLSearchParams } from "node:url";
import os from "os";
import { App, SSLApp, type HttpRequest, type HttpResponse, type WebSocket } from "uWebSockets.js";
import { GameConstants } from "../../common/src/constants";
import { Badges } from "../../common/src/definitions/badges";
import { Skins } from "../../common/src/definitions/skins";
import { Numeric } from "../../common/src/utils/math";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import { version } from "../../package.json";
import { Config } from "./config";
import { Game } from "./game";
import { type Player } from "./objects/player";
import { CustomTeam, CustomTeamPlayer, type CustomTeamPlayerContainer } from "./team";
import { Logger } from "./utils/misc";
import { cleanUsername } from "./utils/usernameFilter";

/**
 * Apply CORS headers to a response.
 * @param res The response sent by the server.
 */
function cors(res: HttpResponse): void {
    res.writeHeader("Access-Control-Allow-Origin", "*")
        .writeHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .writeHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with")
        .writeHeader("Access-Control-Max-Age", "3600");
}

function forbidden(res: HttpResponse): void {
    res.writeStatus("403 Forbidden").end("403 Forbidden");
}

// Initialize the server
const app = Config.ssl
    ? SSLApp({
        key_file_name: Config.ssl.keyFile,
        cert_file_name: Config.ssl.certFile
    })
    : App();

const games: Array<Game | undefined> = [];

export function newGame(id?: number): number {
    if (id !== undefined) {
        if (!games[id] || games[id]?.stopped) {
            Logger.log(`Game ${id} | Creating...`);
            games[id] = new Game(id);
            return id;
        }
    } else {
        const maxGames = Config.maxGames;
        for (let i = 0; i < maxGames; i++) {
            if (!games[i] || games[i]?.stopped) return newGame(i);
        }
    }
    return -1;
}

export function endGame(id: number, createNewGame: boolean): void {
    const game = games[id];
    if (game === undefined) return;
    game.allowJoin = false;
    game.stopped = true;
    for (const player of game.connectedPlayers) {
        player.socket.close();
    }
    Logger.log(`Game ${id} | Ended`);
    if (createNewGame) {
        Logger.log(`Game ${id} | Creating...`);
        games[id] = new Game(id);
    } else {
        games[id] = undefined;
    }
}

function canJoin(game?: Game): boolean {
    return game !== undefined && game.aliveCount < Config.maxPlayersPerGame && !game.over;
}

export function findGame(): { success: true, gameID: number } | { success: false } {
    try {
        for (let gameID = 0; gameID < Config.maxGames; gameID++) {
            const game = games[gameID];
            if (canJoin(game) && game?.allowJoin) {
                return { success: true, gameID };
            }
        }

        // Create a game if there's a free slot
        const gameID = newGame();
        if (gameID !== -1) {
            return { success: true, gameID };
        } else {
            // Join the game that most recently started
            const game = games
                .filter((g => g && !g.over) as (g?: Game) => g is Game)
                .reduce((a, b) => a.startedTime > b.startedTime ? a : b);

            return game
                ? { success: true, gameID: game.id }
                : { success: false };
        }
    } catch {
        return { success: false };
    }
}

const decoder = new TextDecoder();
function getIP(res: HttpResponse, req: HttpRequest): string {
    return Config.ipHeader
        ? req.getHeader(Config.ipHeader) ?? decoder.decode(res.getRemoteAddressAsText())
        : decoder.decode(res.getRemoteAddressAsText());
}

const simultaneousConnections: Record<string, number> = {};
let connectionAttempts: Record<string, number> = {};

export interface Punishment { readonly type: "rateLimit" | "warning" | "tempBan" | "permaBan", readonly expires?: number }
export let punishments: Record<string, Punishment> = {};

let ipBlocklist: string[] | undefined;

function removePunishment(ip: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete punishments[ip];
    if (!Config.protection?.punishments?.url) {
        writeFile(
            "punishments.json",
            JSON.stringify(punishments, null, 4),
            "utf8",
            (err) => {
                if (err) console.error(err);
            }
        );
    }
}

app.get("/api/serverInfo", (res) => {
    cors(res);
    res
        .writeHeader("Content-Type", "application/json")
        .end(JSON.stringify({
            playerCount: games.reduce((a, b) => {
                return a + (b ? b.connectedPlayers.size : 0);
            }, 0),
            maxTeamSize: Config.maxTeamSize,
            protocolVersion: GameConstants.protocolVersion
        }));
});

app.get("/api/getGame", async(res, req) => {
    let aborted = false;
    res.onAborted(() => { aborted = true; });
    cors(res);

    let response: {
        success: boolean
        gameID?: number
        message?: "rateLimit" | "warning" | "tempBan" | "permaBan"
    };

    const ip = getIP(res, req);
    const punishment = punishments[ip];
    if (punishment) {
        response = { success: false, message: punishment.type };
        if (punishment.type === "warning") {
            const protection = Config.protection;
            if (protection?.punishments?.url) {
                fetch(`${protection.punishments.url}/api/removePunishment?ip=${ip}`, { headers: { Password: protection.punishments.password } })
                    .catch(e => console.error("Error acknowledging warning. Details: ", e));
            }
            removePunishment(ip);
        }
    } else {
        response = findGame();
    }

    if (!aborted) {
        res.cork(() => {
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify(response));
        });
    }
});

app.get("/api/punishments", (res, req) => {
    cors(res);

    if (req.getHeader("password") === Config.protection?.punishments?.password) {
        res.writeHeader("Content-Type", "application/json").end(JSON.stringify(punishments));
    } else {
        forbidden(res);
    }
});

app.post("/api/addPunishment", (res, req) => {
    cors(res);

    res.onAborted(() => {});

    const password = req.getHeader("password");
    res.onData((data) => {
        if (password === Config.protection?.punishments?.password) {
            const body = decoder.decode(data);
            punishments = {
                ...punishments,
                ...JSON.parse(body)
            };
            res.writeStatus("204 No Content").endWithoutBody(0);
        } else {
            forbidden(res);
        }
    });
});

app.get("/api/removePunishment", (res, req) => {
    cors(res);

    if (req.getHeader("password") === Config.protection?.punishments?.password) {
        const ip = new URLSearchParams(req.getQuery()).get("ip");
        if (ip) removePunishment(ip);
        res.writeStatus("204 No Content").endWithoutBody(0);
    } else {
        forbidden(res);
    }
});

export interface PlayerContainer {
    readonly gameID: number
    readonly teamID?: string
    readonly autoFill: boolean
    player?: Player
    readonly ip: string | undefined
    readonly role?: string

    readonly isDev: boolean
    readonly nameColor?: number
    readonly lobbyClearing: boolean
    readonly weaponPreset: string
}

app.ws("/play", {
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade(res, req, context) {
        /* eslint-disable-next-line @typescript-eslint/no-empty-function */
        res.onAborted((): void => { });

        const ip = getIP(res, req);

        //
        // Cheater protection
        //
        if (Config.protection) {
            const maxSimultaneousConnections = Config.protection.maxSimultaneousConnections ?? Infinity;
            const maxJoinAttempts = Config.protection.maxJoinAttempts;
            const exceededRateLimits =
                (simultaneousConnections[ip] >= maxSimultaneousConnections) ||
                (connectionAttempts[ip] >= (maxJoinAttempts?.count ?? Infinity));

            if (
                punishments[ip] ||
                exceededRateLimits ||
                ipBlocklist?.includes(ip)
            ) {
                if (exceededRateLimits && !punishments[ip]) punishments[ip] = { type: "rateLimit" };
                forbidden(res);
                Logger.log(`Connection blocked: ${ip}`);
                return;
            } else {
                if (maxSimultaneousConnections) {
                    simultaneousConnections[ip] = (simultaneousConnections[ip] ?? 0) + 1;
                    Logger.log(`${simultaneousConnections[ip]}/${maxSimultaneousConnections} simultaneous connections: ${ip}`);
                }

                if (maxJoinAttempts) {
                    connectionAttempts[ip] = (connectionAttempts[ip] ?? 0) + 1;
                    Logger.log(`${connectionAttempts[ip]}/${maxJoinAttempts.count} join attempts in the last ${maxJoinAttempts.duration} ms: ${ip}`);
                }
            }
        }

        const searchParams = new URLSearchParams(req.getQuery());

        //
        // Validate game ID
        //
        let gameID = Number(searchParams.get("gameID"));
        if (gameID < 0 || gameID > Config.maxGames - 1) gameID = 0;
        if (!canJoin(games[gameID])) {
            forbidden(res);
            return;
        }

        const teamID = searchParams.get("teamID") ?? undefined;

        const autoFill = Boolean(searchParams.get("autoFill"));

        //
        // Role
        //
        const password = searchParams.get("password");
        const givenRole = searchParams.get("role");
        let role: string | undefined;
        let isDev = false;

        let nameColor: number | undefined;
        if (
            password !== null &&
            givenRole !== null &&
            givenRole in Config.roles &&
            Config.roles[givenRole].password === password
        ) {
            role = givenRole;
            isDev = Config.roles[givenRole].isDev ?? false;

            if (isDev) {
                try {
                    const colorString = searchParams.get("nameColor");
                    if (colorString) nameColor = Numeric.clamp(parseInt(colorString), 0, 0xffffff);
                } catch {}
            }
        }

        //
        // Upgrade the connection
        //
        const userData: PlayerContainer = {
            gameID,
            teamID,
            autoFill,
            player: undefined,
            ip,
            role,
            isDev,
            nameColor,
            lobbyClearing: searchParams.get("lobbyClearing") === "true",
            weaponPreset: searchParams.get("weaponPreset") ?? ""
        };
        res.upgrade(
            userData,
            req.getHeader("sec-websocket-key"),
            req.getHeader("sec-websocket-protocol"),
            req.getHeader("sec-websocket-extensions"),
            context
        );
    },

    /**
     * Handle opening of the socket.
     * @param socket The socket being opened.
     */
    open(socket: WebSocket<PlayerContainer>) {
        const data = socket.getUserData();
        const game = games[data.gameID];
        if (game === undefined) return;
        data.player = game.addPlayer(socket);
        // data.player.sendGameOverPacket(false); // uncomment to test game over screen
    },

    /**
     * Handle messages coming from the socket.
     * @param socket The socket in question.
     * @param message The message to handle.
     */
    message(socket: WebSocket<PlayerContainer>, message) {
        const stream = new SuroiBitStream(message);
        try {
            const player = socket.getUserData().player;
            if (player === undefined) return;
            player.game.onMessage(stream, player);
        } catch (e) {
            console.warn("Error parsing message:", e);
        }
    },

    /**
     * Handle closing of the socket.
     * @param socket The socket being closed.
     */
    close(socket: WebSocket<PlayerContainer>) {
        const data = socket.getUserData();
        if (Config.protection) simultaneousConnections[data.ip!]--;
        const game = games[data.gameID];
        const player = data.player;
        if (game === undefined || player === undefined) return;
        Logger.log(`Game ${data.gameID} | "${player.name}" left`);
        game.removePlayer(player);
    }
});

export const customTeams: Map<string, CustomTeam> = new Map<string, CustomTeam>();

app.ws("/team", {
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade(res, req, context) {
        /* eslint-disable-next-line @typescript-eslint/no-empty-function */
        res.onAborted((): void => { });

        const searchParams = new URLSearchParams(req.getQuery());

        const teamID = searchParams.get("teamID");

        if (teamID && !customTeams.has(teamID)) {
            forbidden(res);
            return;
        }

        let team: CustomTeam;
        let isLeader: boolean;
        if (!teamID) {
            isLeader = true;
            team = new CustomTeam();
            customTeams.set(team.id, team);
        } else {
            isLeader = false;
            team = customTeams.get(teamID)!;
            if (team.locked || team.players.length >= Config.maxTeamSize) {
                forbidden(res); // TODO "Team is locked" and "Team is full" messages
                return;
            }
        }

        const name = cleanUsername(searchParams.get("name"));
        let skin = searchParams.get("skin") ?? GameConstants.player.defaultSkin;
        let badge = searchParams.get("badge") ?? undefined;

        //
        // Role
        //
        const password = searchParams.get("password");
        const givenRole = searchParams.get("role");
        let role = "";
        let nameColor: number | undefined;

        if (
            password !== null &&
            givenRole !== null &&
            givenRole in Config.roles &&
            Config.roles[givenRole].password === password
        ) {
            role = givenRole;

            if (Config.roles[givenRole].isDev) {
                try {
                    const colorString = searchParams.get("nameColor");
                    if (colorString) nameColor = Numeric.clamp(parseInt(colorString), 0, 0xffffff);
                } catch {}
            }
        }

        // Validate skin
        const roleRequired = Skins.fromStringSafe(skin)?.roleRequired;
        if (roleRequired && roleRequired !== role) {
            skin = GameConstants.player.defaultSkin;
        }

        // Validate badge
        const roles = badge ? Badges.fromStringSafe(badge)?.roles : undefined;
        if (roles?.length && !roles.includes(role)) {
            badge = undefined;
        }

        res.upgrade(
            {
                player: new CustomTeamPlayer(
                    team,
                    isLeader,
                    name,
                    skin,
                    badge,
                    nameColor
                )
            },
            req.getHeader("sec-websocket-key"),
            req.getHeader("sec-websocket-protocol"),
            req.getHeader("sec-websocket-extensions"),
            context
        );
    },

    /**
     * Handle opening of the socket.
     * @param socket The socket being opened.
     */
    open(socket: WebSocket<CustomTeamPlayerContainer>) {
        const player = socket.getUserData().player;
        player.socket = socket;
        player.team.addPlayer(player);
    },

    /**
     * Handle messages coming from the socket.
     * @param socket The socket in question.
     * @param message The message to handle.
     */
    message(socket: WebSocket<CustomTeamPlayerContainer>, message: ArrayBuffer) {
        const player = socket.getUserData().player;
        player.team.onMessage(player, JSON.parse(decoder.decode(message)));
    },

    /**
     * Handle closing of the socket.
     * @param socket The socket being closed.
     */
    close(socket: WebSocket<CustomTeamPlayerContainer>) {
        const player = socket.getUserData().player;
        player.team.removePlayer(player);
    }
});

// Start the server
app.listen(Config.host, Config.port, (): void => {
    console.log(
        `
 _____ _   _______ _____ _____
/  ___| | | | ___ \\  _  |_   _|
\\ \`--.| | | | |_/ / | | | | |
 \`--. \\ | | |    /| | | | | |
/\\__/ / |_| | |\\ \\\\ \\_/ /_| |_
\\____/ \\___/\\_| \\_|\\___/ \\___/
        `);

    Logger.log(`Suroi Server v${version}`);
    Logger.log(`Listening on ${Config.host}:${Config.port}`);
    Logger.log("Press Ctrl+C to exit.");

    newGame(0);

    const { protection } = Config;
    if (protection) {
        if (protection.maxJoinAttempts) {
            setInterval((): void => {
                connectionAttempts = {};
            }, protection.maxJoinAttempts.duration);
        }

        setInterval(() => {
            if (protection.punishments?.url) {
                void (async() => {
                    try {
                        if (!protection.punishments?.url) return;
                        const response = await fetch(`${protection.punishments.url}/api/punishments`, { headers: { Password: protection.punishments.password } });
                        if (response.ok) punishments = await response.json();
                        else console.error("Error: Unable to fetch punishment list.");
                    } catch (e) {
                        console.error("Error: Unable to fetch punishment list. Details:", e);
                    }
                })();
            } else {
                if (!existsSync("punishments.json")) writeFileSync("punishments.json", "{}");
                readFile("punishments.json", "utf8", (error, data) => {
                    if (!error) {
                        try {
                            punishments = data === "" ? {} : JSON.parse(data);
                        } catch (e) {
                            console.error("Error: Unable to parse punishment list. Details:", e);
                        }
                    } else {
                        console.error("Error: Unable to load punishment list. Details:", error);
                    }
                });
            }

            const now = Date.now();
            for (const [ip, punishment] of Object.entries(punishments)) {
                if (
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    (punishment.expires && punishment.expires < now) ||
                    punishment.type === "rateLimit"
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                ) delete punishments[ip];
            }

            Logger.log("Reloaded punishment list");
        }, protection.refreshDuration);

        if (protection.ipBlocklistURL) {
            void (async() => {
                try {
                    const response = await fetch(protection.ipBlocklistURL!);
                    ipBlocklist = (await response.text()).split("\n").map(line => line.split("/")[0]);
                } catch (e) {
                    console.error("Error: Unable to load IP blocklist. Details:", e);
                }
            })();
        }
    }
});

setInterval(() => {
    const memoryUsage = process.memoryUsage().rss;

    let perfString = `Server | Memory usage: ${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`;

    // windows L
    if (os.platform() !== "win32") {
        const load = os.loadavg().join("%, ");
        perfString += ` | Load (1m, 5m, 15m): ${load}%`;
    }

    Logger.log(perfString);
}, 60000);
