import { ClientEvents } from "discord.js";
import { Event, Reball } from "../types";

export function listen(this: Reball, event: string, callback: (...args: ClientEvents[keyof ClientEvents]) => void) {
    let eventModule = parseEvent(event) as Event<keyof ClientEvents>;
    
    eventModule.execute = callback;
    
    this.events.set(eventModule.alias || eventModule.name, eventModule);
}

export function listener(event: string, callback: (...args: ClientEvents[keyof ClientEvents]) => void) {
    let eventModule = parseEvent(event) as Event<keyof ClientEvents>;

    eventModule.execute = callback;

    return eventModule;
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