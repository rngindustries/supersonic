import { resolve, dirname, basename } from "path";
import { 
    ApplicationCommand,   
    ApplicationCommandData,   
    ApplicationCommandOptionData,   
    ApplicationCommandType, 
    Client, 
    ClientEvents, 
    CommandInteraction
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
import { Defaults, glob, handleSubcommand, safeImportSupersonicModule } from "./helpers";
import { handleInteraction } from "./handlers/builtin";
import { readFile } from "fs/promises";
import _ from "lodash";

export async function initialize(this: Supersonic, options?: ClientOptions | string): Promise<Client<boolean>> {
    let optionsJsonFile: string = "";
    if (typeof options === "string")
        optionsJsonFile = options;
    else if (options === undefined)
        optionsJsonFile = "bot.json";

    if (optionsJsonFile)
        options = JSON.parse(await readFile(optionsJsonFile, "utf-8"));

    this.opts = options as ClientOptions;
    
    const client = new Client(this.opts);
    this.client = client;

    this.client.on("interactionCreate", handleInteraction.bind(this));

    return client;
}   

export async function build(this: Supersonic, token: string) {
    if (!this.client || !this.opts) 
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
        
        for (const commandFile of commandFiles) {
            let commandModule: Command<CommandInteraction> = await safeImportSupersonicModule(commandFile);
            let commandData: CommandData = commandModule.data;
            
            if (this.opts.useDirectoryAsCategory && !commandData.category) {
                // use_directory_as_category does not override defined categories
                let commandDirectory = basename(dirname(commandFile));
               
                if (commandDirectory !== basename(this.opts.commandDirectory))
                    commandData.category = commandDirectory;
                else
                    commandData.category = this.opts.defaultCategory || Defaults.DEFAULT_CATEGORY;
            }

            let commandExists = false;
            
            if (commandData.subName || commandData.groupName)
                commandExists = handleSubcommand.call(this, commandModule); 

            if (!commandExists) {
                switch (commandData.type) {
                    case ApplicationCommandType.ChatInput:
                        this.commands.chat.set(commandData.name, commandModule);
                        break;
                    case ApplicationCommandType.Message:
                        this.commands.message.set(commandData.name, commandModule);
                        break;
                    case ApplicationCommandType.User:
                        this.commands.user.set(commandData.name, commandModule);
                        break;
                }
            }
        }
    }

    const slashCommands = await client.application?.commands.fetch({ cache: true });

    for (const type of ["chat", "message", "user"] as Array<keyof CommandList>) {
        for (const command of this.commands[type]) {
            let commandModule: Command<CommandInteraction> = command[1] as Command<CommandInteraction>;
            let commandData: CommandData = commandModule.data as CommandData;
            
            if (commandData.category && !this.categories.has(commandData.category)) 
                this.categories.add(commandData.category);

            let definedCommand = slashCommands?.find(
                (cmd: ApplicationCommand) => 
                    cmd.name === commandData.name &&
                    cmd.type === commandData.type
            );

            if (!definedCommand) {
                await client.application?.commands.create(
                    {
                        name: commandData.name,
                        description: commandData.type === ApplicationCommandType.ChatInput ? commandData.description : "",
                        type: commandData.type,
                        options: commandData.options
                    } as ApplicationCommandData
                );
            } else {
                const commandFmt: ApplicationCommandData = {
                    name: commandData.name,
                    description: commandData.type === ApplicationCommandType.ChatInput ? commandData.description : "",
                    type: commandData.type,
                    options: commandData.options as ApplicationCommandOptionData[]
                };

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
                    await client.application?.commands.edit(
                        definedCommand,
                        commandFmt 
                    );
                }
            }
        }
    }

    for (const slashCommand of slashCommands || []) {
        let id = slashCommand[0];
        let command = slashCommand[1];
        let type: keyof CommandList = command.type === 1 ? "chat" : command.type === 2 ? "user" : "message";
        
        if (!this.commands[type].has(command.name)) {
            await client.application?.commands.delete(id);
        }
    }
}

async function initializeEvents(this: Supersonic) {
    if (this.opts.module && this.opts.eventDirectory) {
        const eventFiles = await glob(resolve(this.opts.eventDirectory, "**", "*.{ts,js}")) as string[];
        
        for (const eventFile of eventFiles) {
            let eventModule: Event<keyof ClientEvents> = await safeImportSupersonicModule(eventFile);

            this.events.set(eventModule.alias || eventModule.name, eventModule);
        }
    }

    for (const event of this.events) {
        let eventModule: Event<keyof ClientEvents> = event[1];
        (this.client as Client)[eventModule.once ? "once" : "on"](eventModule.name, eventModule.execute.bind(this));
    }
}

async function populateMiddleware(this: Supersonic) {
    if (!this.opts.middlewareDirectory) 
        return;

    const middlewareFiles = await glob(resolve(this.opts.middlewareDirectory, "**", "+*.{ts,js}")) as string[];

    for (const middlewareFile of middlewareFiles) {
        let middleware: CommandMiddleware<CommandInteraction> = await safeImportSupersonicModule(middlewareFile); 
        
        if (typeof middleware === "function")
            this.middleware.push(middleware);
    }
}

async function populateComponents(this: Supersonic) {
    if (!this.opts.componentDirectory)
        return;
    
    const componentFiles = await glob(resolve(this.opts.componentDirectory, "**", "*.{ts,js}")) as string[];

    for (const componentFile of componentFiles) {
        let component: Component = await safeImportSupersonicModule(componentFile);
        
        this.components.button.set(component.name, component);
    }
}