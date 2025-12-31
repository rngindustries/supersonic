import { ClientEvents } from "discord.js";
import { Event, EventString, EventNameOf, Supersonic } from "../types";

export function listener<S extends EventString>(
    event: S, 
    callback: (...args: ClientEvents[EventNameOf<S>]) => void
): Event<EventNameOf<S>> {
    let eventModule = parseEvent(event) as Event<EventNameOf<S>>;

    eventModule.execute = callback;

    return eventModule;
}

export function listen<E extends keyof ClientEvents>(
    this: Supersonic,
    eventModule: Event<E>
): void;
export function listen<S extends EventString>(
    this: Supersonic,
    event: S,
    callback: (...args: ClientEvents[EventNameOf<S>]) => void
): void;
export function listen<E extends keyof ClientEvents, S extends EventString>(
    this: Supersonic, 
    event: S | Event<E>, 
    callback?: (...args: ClientEvents[EventNameOf<S>]) => void
): void {
    const eventModule = typeof event === "string"
        ? listener(event, callback!)
        : event;
    const eventName = eventModule.name as keyof ClientEvents;

    // Events can have multiple handlers, so an event must be able to hold multiple event modules
    if (!this.events.has(eventName))
        this.events.set(eventName, []);

    this.events.get(eventName)!.push(eventModule as Event<keyof ClientEvents>);
}

export function parseEvent<S extends EventString>(event: S): Event<EventNameOf<S>> {
    // Types enforce @ prefix in event string 
    // if (!event.startsWith("@")) return {};
    
    let output = {} as Event<EventNameOf<S>>;

    // Event names follow the format `event/alias!` where `event` is the actual event name as defined by the API,
    // `alias` is the name that the developer/Supersonic hold the module as, and `!` determines if the event must be 
    // ran using `once` or `on`
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