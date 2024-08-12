import { ButtonInteraction } from "discord.js";
import { Component } from "../types";

export function button(name: string, callback: (interaction: ButtonInteraction) => void) {
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