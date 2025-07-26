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
import { Defaults, OptionType } from "../helpers";

export function module<T extends CommandInteraction>(
    payload: CommandPayload, 
    ...callbacks: CommandCallbacks<T>
): Command<T> {
    let commandModule = {} as Command<T>;
    let commandData = parseCommandPayload(payload);

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

export function parseCommandPayload(payload: CommandPayload): CommandData {
    let commandData = {} as CommandData;

    commandData.type = payload.type || ApplicationCommandType.ChatInput;
    commandData.description = payload.description || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.subDescription = payload.subDescription || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.groupDescription = payload.groupDescription || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.options = [];
    
    if (
        payload.command.startsWith("m")
        || payload.command.startsWith("message")
        || payload.command.startsWith("u")
        || payload.command.startsWith("user")
    ) 
        parseUiCommandShorthand(payload.command, commandData);
    else
        parseCommandShorthand(payload.command, commandData);

    for (const option of payload.options || []) {
        let commandOption = {} as CommandDataOption;
        let existingOptIdx = commandData.options.findIndex(opt => opt.name === option.name);

        if (existingOptIdx !== -1)
            commandOption = commandData.options[existingOptIdx]!;
        
        if (option.type) commandOption.type = option.type;
        if (option.required) commandOption.required = option.required;
        if (option.autocomplete) commandOption.autocomplete = option.autocomplete;
        commandOption.name = option.name;
        commandOption.description = option.description || Defaults.NO_DESCRIPTION_PROVIDED;
        commandOption.channelTypes = option.channelTypes;
        commandOption.choices = option.choices;
        
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

        if (existingOptIdx === -1)
            commandData.options.push(commandOption);
    }

    return commandData;
}

export function parseCommandShorthand(
    command: string, 
    commandData: CommandData
): void {
    const SHORTHAND_REGEX = /^\/([\w-]{1,32})((?:\:[\w-]{1,32}){0,2})((?:\s(?:\[|<)[\w-]{1,32}\:(?:string|int|bool|user|channel|role|mentionable|number|attachment)(?:\:(?:min|max)=\d+){0,2}(?:\]|>))+)*((?:\s-\w+)+)*$/;

    const commandTokens = SHORTHAND_REGEX.exec(command) as string[] | null;

    if (!commandTokens)
        return;

    const name = commandTokens[1]!;
    const subNames = commandTokens[2];
    const options = commandTokens[3];
    const flags = commandTokens[4];

    commandData.name = name;

    if (subNames) {
        const subNameList = subNames.substring(1).split(":");

        if (subNameList.length > 1) {
            commandData.groupName = subNameList[0];
            commandData.subName = subNameList[1];
        } else if (subNameList.length === 1) {
            commandData.subName = subNameList[0];
        }
    }

    if (options) {
        const optionList = options.substring(1).split(" ");

        for (let option of optionList) {
            let commandOption = {} as CommandDataOption;
            
            const required = option.startsWith("<");

            option = option.substring(1, option.length - 1);
            
            const optionParts = option.split(":");
            const optionName = optionParts[0]!;
            const optionType = optionParts[1]!;

            commandOption.name = optionName;
            commandOption.type = OptionType[optionType as keyof typeof OptionType];
            commandOption.required = required;
            
            if (optionParts.length > 2) {
                for (const optionPart of optionParts) {
                    if (commandOption.type === ApplicationCommandOptionType.String) {
                        if (optionPart.startsWith("min"))
                            commandOption.minLength = parseInt(optionPart.substring(5));
                        else if (optionPart.startsWith("max"))
                            commandOption.maxLength = parseInt(optionPart.substring(5));
                    } else if (commandOption.type === ApplicationCommandOptionType.Integer) {
                        if (optionPart.startsWith("min"))
                            commandOption.minValue = parseInt(optionPart.substring(5));
                        else if (optionPart.startsWith("max"))
                            commandOption.maxValue = parseInt(optionPart.substring(5));
                    }
                }
            }

            commandData.options.push(commandOption);
        }
    }

    if (flags)
        parseFlags(flags, commandData);
}

export function parseUiCommandShorthand(
    command: string,
    commandData: CommandData
): void {
    const UI_SHORTHAND_REGEX = /^(m|message|u|user)\/(\[[\w\s-]{1,32}\])((?:\s-\w+)+)*$/;

    const commandTokens = UI_SHORTHAND_REGEX.exec(command) as string[] | null;

    if (!commandTokens)
        return

    const type = commandTokens[1]!; 
    const name = commandTokens[2]!.substring(0, commandTokens[2]!.length - 1);
    const flags = commandTokens[3];

    commandData.name = name;

    switch (type) {
        case "m":
        case "message":
            commandData.type = ApplicationCommandType.Message;
            break;
        case "u":
        case "user":
            commandData.type = ApplicationCommandType.User;
            break;
    }

    if (flags)
        parseFlags(flags, commandData);
}

function parseFlags(
    flags: string,
    commandData: CommandData
): void {
    const flagList = flags.substring(1).split(" ");

    for (const flag of flagList) {
        const flagName = flag.substring(1);

        switch (flagName) {
            case "nsfw":
                commandData.nsfw = true;
                break;
        }
    }
}
