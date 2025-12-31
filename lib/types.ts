import { 
    APIActionRowComponent,
    APIButtonComponentWithCustomId,
    APIEmbed,
    APIMessage,
    ApplicationCommandOptionType,
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
import { Environment } from "./helpers";

export type SlashCommandInteraction = | ChatInputCommandInteraction | MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;

export type SupportedCommandType = Exclude<ApplicationCommandType, ApplicationCommandType.PrimaryEntryPoint>;

export type EventString = `@${keyof ClientEvents}${string}`;

export type EventNameOf<S extends string> = 
    S extends `@${infer E}/${string}` ? E & keyof ClientEvents : 
    S extends `@${infer E}!` ? E & keyof ClientEvents :
    S extends `@${infer E}` ? E & keyof ClientEvents :
    never;

export interface Supersonic extends HeaderClient, HeaderMessage, HeaderHandlers, HeaderUtils {
    commands: CommandList;
    mappings: Map<string, string>;
    components: ComponentList;
    events: Map<keyof ClientEvents, Event<keyof ClientEvents>[]>;
    middleware: CommandMiddleware<CommandInteraction>[];
    categories: Set<string>;
    opts: ClientOptions;
    client?: Client;
    environment: Environment;
}

export interface HeaderMessage {
    paginate(options: DynamicPaginationOptions): Promise<InteractionCollector<ButtonInteraction> | undefined>;
    paginateList<T>(options: ListPaginationOptions<T>): Promise<InteractionCollector<ButtonInteraction> | undefined>;
    paginateListStr<T>(options: StringListPaginationOptions<T>): Promise<InteractionCollector<ButtonInteraction> | undefined>;
    paginateStatic(options: StaticPaginationOptions): Promise<StaticPaginator>;
}

export interface HeaderCommandHandler {
    module<T extends CommandInteraction>(payload: CommandPayload, ...callbacks: CommandCallbacks<T>): Command<T>;
    attach<T extends CommandInteraction>(commandModule: Command<T>, ...callbacks: []): void;
    attach<T extends CommandInteraction>(payload: CommandPayload, ...callbacks: CommandCallbacks<T>): void;
}

export interface HeaderComponentHandler {
    component<T extends MessageComponentInteraction>(name: string, callback: (interaction: T) => void): Component;
    click(name: string, callback: (interaction: ButtonInteraction) => void): void;
}

export interface HeaderEventHandler {
    listener<S extends EventString>(event: S, callback: (...args: ClientEvents[EventNameOf<S>]) => void): Event<EventNameOf<S>>;
    listen<S extends EventString>(event: S, callback: (...args: ClientEvents[EventNameOf<S>]) => void): void;
    listen<E extends keyof ClientEvents>(eventModule: Event<E>): void;
}

export interface HeaderMiddlewareHandler {
    use<T extends CommandInteraction>(middlewareFn: CommandMiddleware<T>): void;
    handleMiddleware<T extends CommandInteraction>(this: Supersonic, interaction: T, command: Command<T>): void;
}

export type HeaderHandlers = & HeaderCommandHandler & HeaderComponentHandler & HeaderEventHandler & HeaderMiddlewareHandler;

export interface HeaderClient {
    initialize(options?: ClientOptions | string): Promise<Client<boolean>>;
    build(token: string): Promise<void>;
}

export interface HeaderUtils {
    gucid(name: string, state?: string[]): string;
    getClient(): Client;
}

export interface CommandList {
    chat: Map<string, Command<ChatInputCommandInteraction>>;
    user: Map<string, Command<UserContextMenuCommandInteraction>>;
    message: Map<string, Command<MessageContextMenuCommandInteraction>>;
}

export interface Command<T extends CommandInteraction> {
    data: CommandData;
    middleware: CommandMiddleware<T>[];
    execute: Record<string, CommandExecutor<T>>;
}

export interface CommandPayload {
    command: string;
    description?: string;
    groupDescription?: string;
    subDescription?: string;
    guilds?: string[];
    category?: string;
    nsfw?: boolean;
    type?: SupportedCommandType;
    options?: CommandPayloadOption[];
}

export interface CommandPayloadOption {
    name: string;
    description?: string;
    type?: Exclude<
        ApplicationCommandOptionType, 
        ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup
    >;
    required?: boolean;
    autocomplete?: boolean;
    choices?: Choice[];
    min?: number;
    max?: number;
    channelTypes?: number[];
}

export interface CommandData {
    name: string;
    groupName?: string;
    subName?: string;
    description: string;
    groupDescription?: string;
    subDescription?: string;
    guilds?: string[];
    category?: string;
    nsfw?: boolean;
    type: SupportedCommandType;
    options: CommandDataOption[];
}

export interface CommandDataOption {
    name: string;
    description: string;
    type: number;
    required?: boolean;
    autocomplete?: boolean;
    choices?: Choice[];
    minValue?: number;
    maxValue?: number;
    minLength?: number;
    maxLength?: number;
    channelTypes?: number[];
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
    commandDirectory?: string;
    eventDirectory?: string;
    middlewareDirectory?: string;
    componentDirectory?: string;
    guilds?: Record<string, string>;
    useDirectoryAsCategory?: boolean;
    defaultCategory?: string;
    timeout?: number;
}

export interface BasePaginationOptions {
    interaction: CommandInteraction;
    pageStart?: number;
    timeout?: number;
    rowType?: "basic" | "labels" | "page-number" | "ends";
    customRow?: APIActionRowComponent<APIButtonComponentWithCustomId>;
}

export interface DynamicPaginationOptions extends BasePaginationOptions {
    embedOptions: APIEmbed;
    maxPages: number;  
    onInitial: (
        embed: APIEmbed, 
        row: APIActionRowComponent<APIButtonComponentWithCustomId>
    ) => Promise<APIMessage | Message>;
    onPageChange: (
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
    addEmbed: (embed: APIEmbed) => this;
    collector?: InteractionCollector<ButtonInteraction>;
}

export interface ListPaginationOptions<T> extends BasePaginationOptions {
    embedOptions: APIEmbed;
    maxPages?: number;
    amountPerPage: number;
    listName: string;
    list: T[];
    inline?: string;
}

export interface StringListPaginationOptions<T> extends BasePaginationOptions {
    maxPages?: number;
    amountPerPage: number;
    listName?: string;
    list: T[];
    inline?: string;
    formatting?: `${string}\${entry_name}${string}\${entries}${string}` | `${string}\${entries}\${string}`;
}
