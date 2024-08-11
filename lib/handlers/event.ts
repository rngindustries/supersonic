import { ClientEvents } from "discord.js";
import { Event } from "../types";

export function listen(event: string, callback: (...args: ClientEvents[keyof ClientEvents]) => void) {
    let event_module = parse_event(event) as Event<keyof ClientEvents>;
    
    event_module.execute = callback;
    
    this.events.set(event_module.alias || event_module.name, event_module);
}

export function listener(event: string, callback: (...args: ClientEvents[keyof ClientEvents]) => void) {
    let event_module = parse_event(event) as Event<keyof ClientEvents>;

    event_module.execute = callback;

    return event_module;
}

export function parse_event(event: string) {
    if (!event.startsWith("@")) return {};
    
    let output = {} as Event<keyof ClientEvents>;

    let pieces = event.split("/");
    let event_name = pieces[0] as string;
    let event_alias = pieces[1] ?? "";
    
    if (event_alias) {
        output.once = event_alias.indexOf("!") !== -1;
        output.name = event_name.substring(1);
        output.alias = event_alias.substring(0, output.once ? event_alias.length-1 : event_alias.length);
    } else {
        output.once = event_name.indexOf("!") !== -1;
        output.name = event_name.substring(1, output.once ? event_name.length-1 : event_name.length);
        output.alias = event_name;
    }

    return output;
}