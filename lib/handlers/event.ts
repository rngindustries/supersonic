import { ClientEvents } from "discord.js";
import { Event, Supersonic } from "../types";

export function listener(
    event: string, 
    callback: (...args: ClientEvents[keyof ClientEvents]) => void
): Event<keyof ClientEvents> {
    let eventModule = parseEvent(event) as Event<keyof ClientEvents>;

    eventModule.execute = callback;

    return eventModule;
}

export function listen(
    this: Supersonic,
    eventModule: Event<keyof ClientEvents>
): void;
export function listen(
    this: Supersonic,
    event: string,
    callback: (...args: ClientEvents[keyof ClientEvents]) => void
): void;
export function listen(
    this: Supersonic, 
    event: string | Event<keyof ClientEvents>, 
    callback?: (...args: ClientEvents[keyof ClientEvents]) => void
): void {
    const eventModule = typeof event === "string"
        ? listener(event, callback!)
        : event;
    const eventName = eventModule.name as keyof ClientEvents;

    if (!this.events.has(eventName))
        this.events.set(eventName, []);

    this.events.get(eventName)!.push(eventModule);
}

export function parseEvent(event: string) {
    if (!event.startsWith("@")) return {};
    
    let output = {} as Event<keyof ClientEvents>;

    let pieces = event.split("/");
    let eventName = pieces[0] as string;
    let eventAlias = pieces[1] ?? "";
    
    if (eventAlias) {
        output.once = eventAlias.indexOf("!") !== -1;
        output.name = eventName.substring(1);
        output.alias = eventAlias.substring(0, output.once ? eventAlias.length-1 : eventAlias.length);
    } else {
        output.once = eventName.indexOf("!") !== -1;
        output.name = eventName.substring(1, output.once ? eventName.length-1 : eventName.length);
        output.alias = eventName;
    }

    return output;
}