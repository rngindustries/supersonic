import type { 
    Command, 
    CommandList, 
    CommandMiddleware,
    Component, 
    ComponentList, 
    Event,
    ClientOptions,
    Supersonic
} from "./types";
import { 
    ChatInputCommandInteraction, 
    ClientEvents, 
    CommandInteraction, 
    MessageContextMenuCommandInteraction, 
    UserContextMenuCommandInteraction 
} from "discord.js";
import * as client from "./client";
import * as handlers from "./handlers";
import * as message from "./message";
import * as utils from "./utils";

export function createSupersonic(): Supersonic {
    return {
        commands: {
            chat: new Map<string, Command<ChatInputCommandInteraction>>(),
            user: new Map<string, Command<UserContextMenuCommandInteraction>>(),
            message: new Map<string, Command<MessageContextMenuCommandInteraction>>()
        } as CommandList,
        components: {
            button: new Map<string, Component>()
        } as ComponentList,
        events: new Map<string, Event<keyof ClientEvents>>(),
        middleware: [] as CommandMiddleware<CommandInteraction>[],
        categories: new Set<string>(),
        opts: {} as ClientOptions,
        ...client,
        ...handlers,
        ...message,
        ...utils
    };
}

export default createSupersonic();