import { 
    APIActionRowComponent,
    APIButtonComponent,
    APIEmbed,
    APIMessage,
    ChatInputCommandInteraction,
    ClientEvents,
    ClientOptions as DiscordClientOptions,
    Message,
    MessageContextMenuCommandInteraction,
    UserContextMenuCommandInteraction,
} from "discord.js";

export type SlashCommandInteraction = | ChatInputCommandInteraction | MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;

export interface Command {
    command: CommandData;
    middleware: CommandMiddleware[];
    execute: CommandExecutor;
}

export interface CommandData {
    name: string;
    description: string;
    category?: string;
    global: boolean;
    type: "CHAT_INPUT" | "USER" | "MESSAGE";
    options: CommandDataOption[];
}

export type ChatInputCommandMiddleware = (interaction: ChatInputCommandInteraction, next: () => void) => void;
export type MessageContextMenuCommandMiddleware = (interaction: MessageContextMenuCommandInteraction, next: () => void) => void;
export type UserContextMenuCommandMiddleware = (interaction: UserContextMenuCommandInteraction, next: () => void) => void;
export type SlashCommandMiddleware = (interaction: SlashCommandInteraction, next: () => void) => void;

export type ChatInputCommandExecutor = (interaction: ChatInputCommandInteraction) => void;
export type MessageContextMenuCommandExecutor = (interaction: MessageContextMenuCommandInteraction) => void;
export type UserContextMenuCommandExecutor = (interaction: UserContextMenuCommandInteraction) => void;
export type SlashCommandExecutor = (interaction: SlashCommandInteraction) => void; 

export type CommandMiddleware = | ChatInputCommandMiddleware | MessageContextMenuCommandMiddleware | UserContextMenuCommandMiddleware | SlashCommandMiddleware;
export type CommandExecutor = | ChatInputCommandExecutor | MessageContextMenuCommandExecutor | UserContextMenuCommandExecutor | SlashCommandExecutor;

export type CommandCallbacks = [...CommandMiddleware[], CommandExecutor];

export interface CommandDataOption {
    name: string;
    description: string;
    type: number;
    required: boolean;
    min_value?: number;
    max_value?: number;
}

export interface Event<E extends keyof ClientEvents> {
    name: string;
    alias: string;
    once: boolean;
    execute: (...args: ClientEvents[E]) => void;
}

export interface ClientOptions extends DiscordClientOptions {
    environment: string;
    module: boolean;
    command_directory?: string;
    event_directory?: string;
    middleware_directory?: string;
    static_directory?: string;
    emojis?: { [name: string]: string };
    channels?: { [name: string]: string };
    guilds?: { [name: string]: string };
    use_directory_as_category?: boolean;
    default_category?: string;
    timeout?: number;
}

export interface DynamicPaginationOptions {
    interaction: SlashCommandInteraction;
    embed_options: APIEmbed;
    max_pages: number;  
    timeout?: number;
    on_initial: (
        embed: APIEmbed, 
        row: APIActionRowComponent<APIButtonComponent>
    ) => Promise<APIMessage | Message>;
    on_page_change: (
        embed: APIEmbed,
        row: APIActionRowComponent<APIButtonComponent>, 
        page: number
    ) => void;
}