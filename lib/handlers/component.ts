import { ButtonInteraction, MessageComponentInteraction } from "discord.js";
import { Component, Reball } from "../types";

export function component<T extends MessageComponentInteraction>(name: string, callback: (interaction: T) => void) {
    return {
        name: name,
        execute: callback
    } as Component;
}

export function click(this: Reball, name: string, callback: (interaction: ButtonInteraction) => void) {
    this.components.button.set(name, {
        name: name,
        execute: callback
    } as Component);
}