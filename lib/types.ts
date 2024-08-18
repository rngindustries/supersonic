import { 
    APIActionRowComponent,
    APIButtonComponentWithCustomId,
    APIEmbed,
    APIMessage,
    ApplicationCommandType,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Client,
    ClientEvents,
    CommandInteraction,
    ClientOptions as DiscordClientOptions,
    InteractionCollector,
    Message,
    MessageComponentInteraction,
    MessageContextMenuCommandInteraction,
    UserContextMenuCommandInteraction,
} from "discord.js";

export type SlashCommandInteraction = | ChatInputCommandInteraction | MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;

export interface Reball extends HeaderClient, HeaderMessage, HeaderHandlers, HeaderUtils {
    commands: CommandList;
    components: ComponentList;
    events: Map<string, Event<keyof ClientEvents>>;
    middleware: CommandMiddleware<CommandInteraction>[];
    categories: Set<string>;
    opts: ClientOptions;
    client?: Client;
}

export interface HeaderMessage {
    paginate: (options: DynamicPaginationOptions) => Promise<InteractionCollector<ButtonInteraction> | undefined>;
    paginateList: <T>(options: ListPaginationOptions<T>) => Promise<InteractionCollector<ButtonInteraction> | undefined>;
    paginateListStr: <T>(options: StringListPaginationOptions<T>) => Promise<InteractionCollector<ButtonInteraction> | undefined>;
    paginateStatic: (options: StaticPaginationOptions) => Promise<StaticPaginator>;
}

export interface HeaderHandlers {
    module: <T extends CommandInteraction>(command: string, ...callbacks: CommandCallbacks<T>) => Command<T>;
    attach: <T extends CommandInteraction>(command: string, ...callbacks: CommandCallbacks<T>) => void;
    parseCommand: (command: string) => CommandData;

    component: <T extends MessageComponentInteraction>(name: string, callback: (interaction: T) => void) => Component;
    click: (name: string, callback: (interaction: ButtonInteraction) => void) => void;

    listen: (event: string, callback: (...args: ClientEvents[keyof ClientEvents]) => void) => void;
    listener: (event: string, callback: (...args: ClientEvents[keyof ClientEvents]) => void) => Event<keyof ClientEvents>;

    use: <T extends CommandInteraction>(middlewareFn: CommandMiddleware<T>) => void;
    handleMiddleware: <T extends CommandInteraction>(this: Reball, interaction: T, command: Command<T>) => void;
}

export interface HeaderClient {
    initialize: (options?: ClientOptions | string) => Promise<Client<boolean>>;
    build: (token: string) => Promise<void>;
}

export interface HeaderUtils {
    gucid: (name: string, state?: string[]) => string;
}

export interface CommandList {
    chat: Map<string, Command<ChatInputCommandInteraction>>;
    user: Map<string, Command<UserContextMenuCommandInteraction>>;
    message: Map<string, Command<MessageContextMenuCommandInteraction>>;
}

export interface Command<T extends CommandInteraction> {
    command: CommandData;
    middleware: CommandMiddleware<T>[];
    execute: { [key: string]: CommandExecutor<T> };
}

export interface CommandData {
    name: string;
    description: string;
    category?: string;
    prefixed?: boolean;
    subcommand_group?: string;
    subcommand?: string;
    group_description?: string;
    sub_description?: string;
    type: ApplicationCommandType;
    options: CommandDataOption[];
}

export interface CommandDataOption {
    name: string;
    description: string;
    type: number;
    required: boolean;
    autocomplete: boolean;
    choices?: Choice[];
    min_value?: number;
    max_value?: number;
    min_length?: number;
    max_length?: number;
    channel_types?: number[];
    options?: CommandDataOption[];
}

export interface Choice {
    name: string;
    value: string | number;
}

export type CommandMiddleware<T extends CommandInteraction = SlashCommandInteraction> = (interaction: T, next: () => void) => void;
export type CommandExecutor<T extends CommandInteraction = SlashCommandInteraction> = (interaction: T) => void;

export type CommandCallbacks<T extends CommandInteraction> = [...CommandMiddleware<T>[], CommandExecutor<T>];

export interface Event<E extends keyof ClientEvents> {
    name: string;
    alias: string;
    once: boolean;
    execute: (...args: ClientEvents[E]) => void;
}

export interface ComponentList {
    button: Map<string, Component>;
}

export interface Component {
    name: string;
    execute: (interaction: MessageComponentInteraction) => void;
}

export interface ClientOptions extends DiscordClientOptions {
    environment: string;
    module: boolean;
    command_directory?: string;
    event_directory?: string;
    middleware_directory?: string;
    component_directory?: string;
    guilds?: { [name: string]: string };
    use_directory_as_category?: boolean;
    default_category?: string;
    timeout?: number;
}

export interface BasePaginationOptions {
    interaction: CommandInteraction;
    page_start?: number;
    timeout?: number;
    row_type?: "basic" | "labels" | "page_number" | "ends";
    custom_row?: APIActionRowComponent<APIButtonComponentWithCustomId>;
}

export interface DynamicPaginationOptions extends BasePaginationOptions {
    embed_options: APIEmbed;
    max_pages: number;  
    on_initial: (
        embed: APIEmbed, 
        row: APIActionRowComponent<APIButtonComponentWithCustomId>
    ) => Promise<APIMessage | Message>;
    on_page_change: (
        embed: APIEmbed,
        row: APIActionRowComponent<APIButtonComponentWithCustomId>, 
        page: number
    ) => void;
}

export interface StaticPaginationOptions extends BasePaginationOptions {
    embeds?: APIEmbed[];
}

export interface StaticPaginator {
    (): Promise<void>;
    embeds: APIEmbed[];
    add_embed: (embed: APIEmbed) => this;
    collector?: InteractionCollector<ButtonInteraction>;
}

export interface ListPaginationOptions<T> extends BasePaginationOptions {
    embed_options: APIEmbed;
    max_pages?: number;
    amount_per_page: number;
    list_name: string;
    list: T[];
    inline?: string;
}

export interface StringListPaginationOptions<T> extends BasePaginationOptions {
    max_pages?: number;
    amount_per_page: number;
    list_name?: string;
    list: T[];
    inline?: string;
    formatting?: `${string}\${entry_name}${string}\${entries}${string}` | `${string}\${entries}\${string}`;
}
