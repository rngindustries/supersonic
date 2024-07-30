import * as client from "./client";
import * as command from "./handlers/command";
import { Command } from "./types";

export default {
    commands: new Map<string, Command>(),
    categories: new Set<string>(),
    ...client,
    ...command
};