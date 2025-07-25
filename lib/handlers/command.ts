import { 
    Command,
    CommandCallbacks, 
    CommandData, 
    CommandDataOption, 
    CommandExecutor, 
    CommandMiddleware,
    CommandPayload,
    Supersonic
} from "../types";
import { 
    ApplicationCommandOptionType,
    ApplicationCommandType, 
    ChatInputCommandInteraction,
    CommandInteraction, 
    MessageContextMenuCommandInteraction, 
    UserContextMenuCommandInteraction 
} from "discord.js";
import { Defaults } from "../helpers";

export function module<T extends CommandInteraction>(
    payload: CommandPayload, 
    ...callbacks: CommandCallbacks<T>
): Command<T> {
    let commandModule = {} as Command<T>;
    let commandData = parseCommand(payload);

    commandModule.data = commandData;
    commandModule.middleware = callbacks.slice(0, callbacks.length-1) as CommandMiddleware<T>[];
    commandModule.execute = {};

    const executor = callbacks[callbacks.length-1] as CommandExecutor<T>;
    if (commandData.groupName && commandData.subName)
        commandModule.execute[`${commandData.groupName}:${commandData.subName}`] = executor;
    else if (!commandData.groupName && commandData.subName)
        commandModule.execute[commandData.subName] = executor;
    else
        commandModule.execute["(main)"] = executor;

    return commandModule;
}

export function attach<T extends CommandInteraction>(
    this: Supersonic,
    commandModule: Command<T>,
    // CommandCallbacks requires CommandExecutor to be present so we have 
    // to force callbacks to be empty
    ...callbacks: [] 
): void;
export function attach<T extends CommandInteraction>(
    this: Supersonic,
    payload: CommandPayload,
    ...callbacks: CommandCallbacks<T>
): void;
export function attach<T extends CommandInteraction>(
    this: Supersonic, 
    command: Command<T> | CommandPayload, 
    ...callbacks: [] | CommandCallbacks<T>
): void {
    let commandModule = "data" in command 
        ? command as Command<T> 
        : module(command, ...callbacks as CommandCallbacks<T>); 
    let commandData = commandModule.data;
    
    let commandExists = false;

    if (commandData.subName || commandData.groupName)
        commandExists = createSubcommand.call(this, commandModule as unknown as Command<ChatInputCommandInteraction>); 

    if (!commandExists) {
        switch (commandModule.data.type) {
            case ApplicationCommandType.ChatInput:
                this.commands.chat.set(commandModule.data.name, commandModule as unknown as Command<ChatInputCommandInteraction>);
                break;
            case ApplicationCommandType.Message:
                this.commands.message.set(commandModule.data.name, commandModule as unknown as Command<MessageContextMenuCommandInteraction>);
                break;
            case ApplicationCommandType.User:
                this.commands.user.set(commandModule.data.name, commandModule as unknown as Command<UserContextMenuCommandInteraction>);
                break;
        }
    }
}

export function createSubcommand(
    this: Supersonic, 
    commandModule: Command<ChatInputCommandInteraction>
): boolean {
    // returns whether command already exists in Supersonic object
    const commandData = commandModule.data;

    if (commandData.groupName && commandData.subName) {
        let existingCommand = this.commands.chat.get(commandData.name);
        let subOption = {
            type: ApplicationCommandOptionType.Subcommand,
            name: commandData.subName,
            description: commandData.subDescription || Defaults.NO_DESCRIPTION_PROVIDED,
            options: commandData.options
        } as CommandDataOption;
        let groupOption = {
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: commandData.groupName,
            description: commandData.groupDescription || Defaults.NO_DESCRIPTION_PROVIDED,
            options: [subOption]
        } as CommandDataOption;

        if (existingCommand) {
            let existingGroup = existingCommand.data.options.findIndex(
                (option: CommandDataOption) => 
                    option.type === ApplicationCommandOptionType.SubcommandGroup &&
                    option.name === commandData.groupName  
            );

            if (existingGroup) {
                existingCommand.data.options[existingGroup]?.options?.push(subOption);
            } else {
                existingCommand.data.options.push(groupOption);
            }
        
            const executor = commandModule.execute[`${commandData.groupName}:${commandData.subName}`] as CommandExecutor<ChatInputCommandInteraction>;
            existingCommand.execute[`${commandData.groupName}:${commandData.subName}`] = executor;

            return true;
        } else {
            commandModule.data.options = [groupOption];
            commandModule.data.subDescription = undefined;
            commandModule.data.groupDescription = undefined;
            commandModule.data.subName = undefined;
            commandModule.data.groupName = undefined;

            return false;
        }
    } else if (commandData.subName) {
        let existingCommand = this.commands.chat.get(commandData.name);
        let subOption = {
            type: ApplicationCommandOptionType.Subcommand,
            name: commandData.subName,
            description: commandData.subDescription || Defaults.NO_DESCRIPTION_PROVIDED,
            options: commandData.options
        } as CommandDataOption;

        if (existingCommand) {
            existingCommand.data.options.push(subOption);

            const executor = commandModule.execute[commandData.subName] as CommandExecutor<ChatInputCommandInteraction>;
            existingCommand.execute[commandData.subName] = executor;
            
            return true;
        } else {
            commandModule.data.options = [subOption];
            commandModule.data.subDescription = undefined;
            commandModule.data.subName = undefined;

            return false;
        }
    }

    return false;
}

export function parseCommand(payload: CommandPayload): CommandData {
    let commandData = {} as CommandData;

    commandData.type = payload.type || ApplicationCommandType.ChatInput;
    commandData.description = payload.description || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.subDescription = payload.subDescription || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.groupDescription = payload.groupDescription || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.options = [];
    
    if (commandData.type === ApplicationCommandType.ChatInput) {
        let nameFragments = payload.command.split(":");
        commandData.name = nameFragments[0] as string;
    
        if (nameFragments[1] && !nameFragments[2]) {
            commandData.subName = nameFragments[1];
        } else if (nameFragments[1] && nameFragments[2]) {
            commandData.groupName = nameFragments[1];
            commandData.subName = nameFragments[2];
        }    
    } else {
        commandData.name = payload.command;
    }

    for (const option of payload.options || []) {
        let commandOption = {} as CommandDataOption;
        
        if (option.type)
            commandOption.type = option.type;
        commandOption.name = option.name;
        commandOption.description = option.description || Defaults.NO_DESCRIPTION_PROVIDED;
        commandOption.required = option.required;
        commandOption.channelTypes = option.channelTypes;
        commandOption.choices = option.choices;
        commandOption.autocomplete = option.autocomplete;

        if (commandOption.type === ApplicationCommandOptionType.String) {
            if (option.min)
                commandOption.minLength = option.min;
            if (option.max)
                commandOption.maxLength = option.max;
        } else if (commandOption.type === ApplicationCommandOptionType.Integer) {
            if (option.min)
                commandOption.minValue = option.min;
            if (option.max)
                commandOption.maxValue = option.max;
        }

        commandData.options.push(commandOption);
    }

    return commandData;
}