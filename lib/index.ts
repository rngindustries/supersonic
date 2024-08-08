import * as client from "./client";
import * as handlers from "./handlers";
import * as message from "./message";
import * as utils from "./utils";
import { Command, CommandMiddleware, Event } from "./types";
import { ClientEvents } from "discord.js";

export default {
    commands: new Map<string, Command>(),
    events: new Map<string, Event<keyof ClientEvents>>(),
    middleware: [] as CommandMiddleware[],
    categories: new Set<string>(),
    ...client,
    ...handlers,
    ...message,
    ...utils
};