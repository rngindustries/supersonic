import { 
    ChatInputCommandInteraction,
    ClientOptions as DiscordClientOptions,
    MessageContextMenuCommandInteraction,
    UserContextMenuCommandInteraction
} from "discord.js";

export type SlashCommandInteraction = | ChatInputCommandInteraction | MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;

export interface Command {
    command: CommandData;
    middleware: Function[]; // TODO: add middleware capabilities
    execute: (interaction: SlashCommandInteraction) => void;
}

export interface CommandData {
    name: string;
    description: string;
    category?: string;
    global: boolean;
    type: "CHAT_INPUT" | "USER" | "MESSAGE";
    options: CommandDataOption[];
}

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