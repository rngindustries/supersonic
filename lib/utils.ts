import { randomBytes } from "crypto";
import { Supersonic } from "./types";
import { Client } from "discord.js";

// globally unique custom id 
export function gucid(name: string, state?: string[]) {
    let random = randomBytes(10).toString("hex");

    return `${name}${state ? "|" + state?.join("|") : ""}|${random}`;
}

export function getClient(this: Supersonic): Client {
    if (!this.client)
        throw new Error("Client is not initialized! Run s.initialize() first.");
    return this.client;
}