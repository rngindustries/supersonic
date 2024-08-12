import { ButtonInteraction, MessageComponentInteraction } from "discord.js";
import { Component } from "../types";

export function component(name: string, callback: (interaction: MessageComponentInteraction) => void) {
    return {
        name: name,
        execute: callback
    } as Component;
}

export function click(name: string, callback: (interaction: ButtonInteraction) => void) {
    this.components.button.set(name, {
        name: name,
        execute: callback
    } as Component);
}