import { 
    ChatInputCommandInteraction,
    ClientOptions as DiscordClientOptions,
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

type ChatInputCommandMiddleware = (interaction: ChatInputCommandInteraction, next: () => void) => void;
type MessageContextMenuCommandMiddleware = (interaction: MessageContextMenuCommandInteraction, next: () => void) => void;
type UserContextMenuCommandMiddleware = (interaction: UserContextMenuCommandInteraction, next: () => void) => void;
export type SlashCommandMiddleware = (interaction: SlashCommandInteraction, next: () => void) => void;

type ChatInputCommandExecutor = (interaction: ChatInputCommandInteraction) => void;
type MessageContextMenuCommandExecutor = (interaction: MessageContextMenuCommandInteraction) => void;
type UserContextMenuCommandExecutor = (interaction: UserContextMenuCommandInteraction) => void;
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

export interface ClientOptions extends DiscordClientOptions {
    environment: string;
    module: boolean;
    command_directory?: string;
    events_directory?: string;
    middleware_directory?: string;
    static_directory?: string;
    emojis?: { [name: string]: string };
    channels?: { [name: string]: string };
    guilds?: { [name: string]: string };
    use_directory_as_category?: boolean;
    default_category?: string;
}