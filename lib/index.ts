import * as client from "./client";
import * as command from "./command";
import { Command } from "./types";

let r = {
    commands: new Map<string, Command>(),
    categories: new Set<string>(),
    ...client,
    ...command
};

export default r;