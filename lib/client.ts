import { resolve, dirname, basename } from "path";
import { 
    ApplicationCommand,   
    ApplicationCommandData,   
    ApplicationCommandOptionData,   
    ApplicationCommandType, 
    Client, 
    ClientEvents, 
    Collection, 
    CommandInteraction,
    Snowflake
} from "discord.js";
import { 
    ClientOptions, 
    Command, 
    CommandData,  
    CommandList,  
    CommandMiddleware, 
    Component, 
    Event, 
    Supersonic
} from "./types";
import { 
    CommandScope, 
    constructCommandKey, 
    Defaults, 
    Environment, 
    getNamedCommandType, 
    glob, 
    isCommandGuildBased, 
    safeImportSupersonicModule 
} from "./helpers";
import { handleInteraction } from "./handlers/builtin";
import { readFile } from "fs/promises";
import _ from "lodash";

type FetchedCommands = Collection<Snowflake, ApplicationCommand>;

interface FetchedCommandsList {
    global: FetchedCommands;
    [guild: `${string}.commands`]: FetchedCommands;
}

export async function initialize(this: Supersonic, options?: ClientOptions | string): Promise<Client<boolean>> {
    let optionsJsonFile: string = "";
    if (typeof options === "string")
        optionsJsonFile = options;
    else if (options === undefined)
        optionsJsonFile = "bot.json";

    if (optionsJsonFile)
        options = JSON.parse(await readFile(optionsJsonFile, "utf-8"));

    this.opts = options as ClientOptions;
    const environment = this.opts.environment.toLowerCase();

    // s.environment is what Supersonic actually uses; default environment is development
    if (environment === "production" || environment === "prod")
        this.environment = Environment.Production;

    const client = new Client(this.opts);
    this.client = client;

    this.client.on("interactionCreate", handleInteraction.bind(this));

    return client;
}   

export async function build(this: Supersonic, token: string) {
    if (!this.client || !this.opts) 
        // TODO: add error message explaining s.initialize() should be used first
        return;

    if (this.opts.module) {
        await populateMiddleware.call(this);
        await populateComponents.call(this);
    }
    await initializeEvents.call(this);
    
    await this.client.login(token);

    await initializeCommands.call(this);
}

async function initializeCommands(this: Supersonic) {
    let client = this.client as Client;
    
    if (this.opts.module && this.opts.commandDirectory) {
        const commandFiles = await glob(resolve(this.opts.commandDirectory, "**", "*.{ts,js}")) as string[];
        const commandModules = await Promise.all(
            commandFiles.map(commandFile => safeImportSupersonicModule(commandFile)) 
        ) as Command<CommandInteraction>[];

        for (let i = 0; i < commandModules.length; i++) {
            const commandModule = commandModules[i] as Command<CommandInteraction>;
            const commandData = commandModule.data;

            if (this.opts.useDirectoryAsCategory && !commandData.category) {
                // use_directory_as_category does not override defined categories
                let commandDirectory = basename(dirname(commandFiles[i] as string));
               
                if (commandDirectory !== basename(this.opts.commandDirectory))
                    commandData.category = commandDirectory;
                else
                    commandData.category = this.opts.defaultCategory || Defaults.DEFAULT_CATEGORY;
            }  

            this.attach(commandModule);
        }
    }

    const guildMap = this.opts.guilds || {};
    // All registered commands in the guildMap guilds
    const fetchedCommands = await Promise.all(
        Object.entries(guildMap).map(async ([guild, guildId]) => { 
            const commands = await client.application!.commands.fetch({
                guildId: guildId,
                cache: true
            });

            return [guild, commands] as const;
        })
    );

    const globalCommands = await client.application!.commands.fetch({ cache: true });
    let fetchedCmdList: FetchedCommandsList = {
        global: globalCommands
    };

    fetchedCommands.forEach(([guild, commands]) => {
        // `.commands` is appended to the end of each guild alias to ensure a user cannot use 'global' as a guild alias and 
        // overwrite the global command list
        fetchedCmdList[`${guild}.commands`] = commands;
    });

    // Register or edit all application commands using this.commands
    for (const type of ["chat", "message", "user"] as Array<keyof CommandList>) {
        for (const command of this.commands[type]) {
            let commandModule: Command<CommandInteraction> = command[1] as Command<CommandInteraction>;
            let commandData: CommandData = commandModule.data as CommandData;
            let commandGuilds = commandData.guilds;

            if (commandData.category && !this.categories.has(commandData.category)) 
                this.categories.add(commandData.category);
            
            // Fetches the command in all specified guilds to ensure the latest version is applied or registered to every guild
            const definedCommands = await fetchDefinedCommands.call(this, commandData, fetchedCmdList, commandGuilds);
            // Discord expects a different format than what Supersonic holds in this.commands
            const commandFmt: ApplicationCommandData = {
                name: commandData.name,
                description: commandData.type === ApplicationCommandType.ChatInput ? commandData.description : "",
                type: commandData.type,
                options: commandData.options as ApplicationCommandOptionData[]
            }; 

            for (const commandGuild in definedCommands) {
                const definedCommand = definedCommands[commandGuild];
                const guildId = this.opts.guilds![commandGuild] as string;
                const isGuildBased = commandGuild !== CommandScope.Global;

                if (!definedCommand) {
                    await client.application?.commands.create(
                        commandFmt,
                        isGuildBased ? guildId : undefined
                    );
                } else {
                    // Guild already has the defined command, so compare the defined command and the Supersonic command 
                    // and makes any necessary edits 
                    const definedCommandFmt = {
                        name: definedCommand.name,
                        description: definedCommand.description,
                        type: definedCommand.type,
                        options: definedCommand.options.map(opt => {
                            // https://github.com/monkeytypegame/monkeytype-bot/blob/66a97ae4cb6c282c8dff1731af91c55d7cddb26c/src/structures/client.ts#L252
                            type Keys = keyof typeof opt;
                            type Values = typeof opt[Keys];
                            type Entries = [Keys, Values];

                            for (const [key, value] of Object.entries(opt) as Entries[]) {
                                if (value === undefined || (Array.isArray(value) && value.length === 0)) {
                                    delete opt[key];
                                }
                            }

                            return opt;
                        })
                    };
                    
                    if (!_.isEqual(commandFmt, definedCommandFmt)) {
                        if (isGuildBased)
                            await client.application?.commands.edit(
                                definedCommand,
                                commandFmt,
                                guildId
                            );
                        else
                            await client.application?.commands.edit(
                                definedCommand,
                                commandFmt
                            );
                    }
                }
            }
        }
    }

    for (const commandGuild of (Object.keys(fetchedCmdList) as (CommandScope.Global | `${string}.commands`)[])) {
        // Check every registered command in every guild and delete any that are not in this.commands 
        const scopedCommands = fetchedCmdList[commandGuild] as FetchedCommands;
        let isGuildBased = commandGuild !== CommandScope.Global;

        for (const command of scopedCommands) {
            const commandId = command[0];
            const commandData = command[1];
            const type = getNamedCommandType(commandData.type);
            const guildId = guildMap[commandGuild.slice(0, -(".commands").length)];

            const key = constructCommandKey(
                commandData.name, 
                type, 
                isGuildBased ? CommandScope.Guild : CommandScope.Global, 
                isGuildBased ? guildId : undefined
            );
            const mapping = this.mappings.get(key);

            if (
                (mapping && !this.commands[type].has(mapping))
                || !mapping
            )
                await client.application?.commands.delete(
                    commandId,
                    isGuildBased ? guildId : undefined
                );
        }
    }
}

async function initializeEvents(this: Supersonic) {
    if (this.opts.module && this.opts.eventDirectory) {
        const eventFiles = await glob(resolve(this.opts.eventDirectory, "**", "*.{ts,js}")) as string[];
        const eventModules = await Promise.all(
            eventFiles.map(eventFile => safeImportSupersonicModule(eventFile))
        ) as Event<keyof ClientEvents>[];

        for (const eventModule of eventModules) {
            const eventName = eventModule.name as keyof ClientEvents;

            // Events can have multiple handlers, so an event must be able to hold multiple event modules
            if (!this.events.has(eventName))
                this.events.set(eventName, []);

            this.events.get(eventName)!.push(eventModule);
        }
    }
    
    // Attach a listener to every defined event in this.events
    for (const [eventName, eventModules] of this.events.entries()) {
        const eventExecutor = async (...args: ClientEvents[typeof eventName]) => {
            for (const eventModule of eventModules) {
                (eventModule as Event<typeof eventName>).execute.call(this, ...args);
            }
        };

        // If even one module has 'once' set to true, then the event as a whole must use once
        const useOnce = eventModules.some(mod => mod.once);
        (this.client as Client)[useOnce ? "once" : "on"](eventName, eventExecutor);
    }
}

async function populateMiddleware(this: Supersonic) {
    if (!this.opts.middlewareDirectory) 
        return;

    const middlewareFiles = await glob(resolve(this.opts.middlewareDirectory, "**", "+*.{ts,js}")) as string[];
    const middlewares = await Promise.all(
        middlewareFiles.map(middlewareFile => safeImportSupersonicModule(middlewareFile))
    ) as CommandMiddleware<CommandInteraction>[];

    for (const middleware of middlewares) {
        // Supersonic assumes all middlewares are functions 
        if (typeof middleware === "function")
            this.middleware.push(middleware);
    }
}

async function populateComponents(this: Supersonic) {
    if (!this.opts.componentDirectory)
        return;
    
    const componentFiles = await glob(resolve(this.opts.componentDirectory, "**", "*.{ts,js}")) as string[];
    const components = await Promise.all(
        componentFiles.map(componentFile => safeImportSupersonicModule(componentFile))
    ) as Component[];

    for (const component of components) {
        // TODO: add other components (e.g., modals)
        this.components.button.set(component.name, component);
    }
}

async function fetchDefinedCommands(
    this: Supersonic,
    data: CommandData,
    fetchedCommandsList: FetchedCommandsList,
    commandGuilds?: string[]
): Promise<Record<string, ApplicationCommand | undefined>> {
    // Fetch from global scope if commandGuilds is an empty array; if the environment is production and 
    // commandGuilds does not exist; or if the environment is  development, commandGuilds does not exist, 
    // and the development guild does not exist. 
    //
    // Fetch from specific guild scope if commandGuilds has elements or if the environment is development 
    // and the development guild exists.
    //
    // If the development guild exists, it gets appended to the commandGuilds array (at command payload parsing) 
    // when the environment is development.
    const guildMap = this.opts.guilds || {};
    const isGuildBased = isCommandGuildBased.call(this, data);
    let definedCommands = {} as Record<string, ApplicationCommand | undefined>;

    if (!isGuildBased) {
        const globalCommands = fetchedCommandsList[CommandScope.Global];
        const definedCommand = globalCommands.find(
            (cmd: ApplicationCommand) => 
                cmd.name === data.name &&
                cmd.type === data.type
        );

        definedCommands[CommandScope.Global] = definedCommand;
        
        return definedCommands;
    }

    if (!commandGuilds)
        commandGuilds = []; 

    for (let i = 0; i < commandGuilds.length; i++) {
        let commandGuild = commandGuilds[i] as string;
        
        if (!(commandGuild in guildMap))
            // TODO: add warning explaining the specified guild is not defined in the 'guilds' option   
            continue;

        const guildCmdList = fetchedCommandsList[`${commandGuild}.commands`] as FetchedCommands;
        const definedCommand = guildCmdList.find(
            (cmd: ApplicationCommand) => 
                cmd.name === data.name &&
                cmd.type === data.type
        );
        
        definedCommands[commandGuild] = definedCommand;
    }

    return definedCommands;
}