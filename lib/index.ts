import * as client from "./client";
import * as command from "./handlers/command";
import * as middleware from "./handlers/middleware";
import { Command, CommandMiddleware } from "./types";

export default {
    commands: new Map<string, Command>(),
    middleware: [] as CommandMiddleware[],
    categories: new Set<string>(),
    ...client,
    ...command,
    ...middleware
};