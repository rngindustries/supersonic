import { ButtonInteraction, MessageComponentInteraction } from "discord.js";
import { Component, Supersonic } from "../types";

export function component<T extends MessageComponentInteraction>(
    name: string, 
    callback: (interaction: T) => void
): Component {
    return {
        name: name,
        execute: callback
    } as Component;
}

// TODO: add more components (e.g., select menus)
export function click(
    this: Supersonic,
    component: Component
): void;
export function click(
    this: Supersonic,
    name: string,
    callback: (interaction: ButtonInteraction) => void
): void;
export function click(
    this: Supersonic, 
    component: string | Component, 
    callback?: (interaction: ButtonInteraction) => void
): void {
    let componentModule = typeof component === "string"
        ? { name: component, execute: callback! } as Component
        : component;

    this.components.button.set(componentModule.name, componentModule);
}