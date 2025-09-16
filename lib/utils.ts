import { randomBytes } from "crypto";
import { Supersonic } from "./types";
import { Client } from "discord.js";

export function gucid(name: string, state?: string[]) {
    // Globally unique custom id - helper function to differentiate between component custom ids
    let random = randomBytes(10).toString("hex");

    return `${name}${state ? "|" + state?.join("|") : ""}|${random}`;
}

export function getClient(this: Supersonic): Client {
    // this.client is optional, so getClient provides a type-safe way to get the client
    if (!this.client)
        // TODO: add better error handling
        throw new Error("Client is not initialized! Run s.initialize() first.");
    return this.client;
}