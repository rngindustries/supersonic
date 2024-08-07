import * as client from "./client";
import * as command from "./handlers/command";
import * as middleware from "./handlers/middleware";
import * as event from "./handlers/event";
import { Command, CommandMiddleware, Event } from "./types";
import { ClientEvents } from "discord.js";

export default {
    commands: new Map<string, Command>(),
    events: new Map<string, Event<keyof ClientEvents>>(),
    middleware: [] as CommandMiddleware[],
    categories: new Set<string>(),
    ...client,
    ...command,
    ...event,
    ...middleware
};