import { 
    Choice,
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
    ApplicationCommandType, 
    ChatInputCommandInteraction,
    CommandInteraction, 
    MessageContextMenuCommandInteraction, 
    UserContextMenuCommandInteraction 
} from "discord.js";
import { ChannelType, Defaults, handleSubcommand, OptionType } from "../helpers";

export function module<T extends CommandInteraction>(
    this: Supersonic, 
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
    payload: CommandPayload, 
    ...callbacks: CommandCallbacks<T>
): void {
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

    let commandExists = false;

    if (commandData.subName || commandData.groupName)
        commandExists = handleSubcommand.call(this, commandModule as unknown as Command<ChatInputCommandInteraction>); 

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

export function parseCommand(payload: CommandPayload): CommandData {
    const MODIFIER_REGEX = /(\w+)=(\[.*?\]|'.*?'|\S+)/g;
    
    let commandData = {} as CommandData;

    commandData.type = ApplicationCommandType.ChatInput;
    commandData.description = payload.description || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.subDescription = payload.subDescription || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.groupDescription = payload.groupDescription || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.options = [];
    
    if (payload.mod) {
        let commandModifiers = payload.mod.matchAll(MODIFIER_REGEX);
        
        for (const mod of commandModifiers) {
            let key = mod[1] as string;
            let value = mod[2] as string;

            if (value.startsWith("'") && value.endsWith("'"))
                value = value.substring(1, value.length-1);

            switch (key) {
                case "type":
                    if (value === "c")
                        commandData.type = ApplicationCommandType.ChatInput;
                    else if (value === "u")
                        commandData.type = ApplicationCommandType.User;
                    else if (value === "m")
                        commandData.type = ApplicationCommandType.Message;
                    break;
                case "cat":
                    commandData.category = value;
                    break;
                case "nsfw":
                    commandData.nsfw = value.startsWith("y");
                    break;
            } 
        }
    }

    // command type needs to be resolved before applying name
    if (commandData.type === ApplicationCommandType.ChatInput) {
        let nameFragments = payload.name.split(":");
        commandData.name = nameFragments[0] as string;
    
        if (nameFragments[1] && !nameFragments[2]) {
            commandData.subName = nameFragments[1];
        } else if (nameFragments[1] && nameFragments[2]) {
            commandData.groupName = nameFragments[1];
            commandData.subName = nameFragments[2];
        }    
    } else {
        commandData.name = payload.name;
    }

    for (const option of payload.options) {
        let commandOption = {} as CommandDataOption;

        commandOption.name = option.name;
        commandOption.description = option.description || Defaults.NO_DESCRIPTION_PROVIDED;
        
        let optionModifiers = option.mod.matchAll(MODIFIER_REGEX);

        for (const mod of optionModifiers) {
            let key = mod[1] as string;
            let value = mod[2] as string;

            if (value.startsWith("'") && value.endsWith("'"))
                value = value.substring(1, value.length-1);

            switch (key) {
                case "type":
                    let [optionality, optionType] = value.split(",") as [string, string];

                    commandOption.required = optionality === "r";
                    commandOption.type = OptionType[optionType as keyof typeof OptionType];

                    break;
                case "channels": 
                    let channelTypes = value.split(",").map(
                        type => ChannelType[type as keyof typeof ChannelType]
                    );

                    commandOption.channelTypes = channelTypes;

                    break;
                case "choices": 
                    if (value.startsWith("[") && value.endsWith("]")) 
                        value = value.substring(1, value.length-1);     

                    let choices = value.split(",").map(
                        choice => {
                            let [choiceName, choiceValue] = choice.split(":");

                            return {
                                name: choiceName,
                                value: choiceValue
                            } as Choice;
                        }
                    );

                    if (
                        [OptionType.str, OptionType.int, OptionType.num].includes(commandOption.type) &&
                        !commandOption.autocomplete &&
                        choices.length <= 25
                    ) 
                        commandOption.choices = choices;

                    break;
                case "min":
                    commandOption[
                        commandOption.type === OptionType.str 
                        ? "minLength" 
                        : "minValue"
                    ] = parseInt(value);
                    break;
                case "max":
                    commandOption[
                        commandOption.type === OptionType.str 
                        ? "maxLength" 
                        : "maxValue"
                    ] = parseInt(value);
                    break;
                case "ac":
                    commandOption.autocomplete = value.startsWith("y");
                    break;
            }
        }

        commandData.options.push(commandOption);
    }

    return commandData;
}