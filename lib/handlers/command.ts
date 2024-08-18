import { 
    Choice,
    Command,
    CommandCallbacks, 
    CommandData, 
    CommandDataOption, 
    CommandExecutor, 
    CommandMiddleware,
    Reball
} from "../types";
import { 
    ApplicationCommandType, 
    ChatInputCommandInteraction,
    CommandInteraction, 
    MessageContextMenuCommandInteraction, 
    UserContextMenuCommandInteraction 
} from "discord.js";
import { ChannelType, Defaults, handleSubcommand, OptionType } from "../helpers";

export function module<T extends CommandInteraction>(this: Reball, command: string, ...callbacks: CommandCallbacks<T>): Command<T> {
    let commandModule = {} as Command<T>;

    commandModule.command = parseCommand(command);
    let subcommand = (handleSubcommand<T>).call(this, commandModule);
   
    commandModule.middleware = callbacks.slice(0, callbacks.length-1) as CommandMiddleware<T>[];
    commandModule.execute = {};
    if (subcommand)
        commandModule.execute[subcommand] = callbacks[callbacks.length-1] as CommandExecutor<T>;
    else
        commandModule.execute["(main)"] = callbacks[callbacks.length-1] as CommandExecutor<T>;

    return commandModule;
}

export function attach<T extends CommandInteraction>(this: Reball, command: string, ...callbacks: CommandCallbacks<T>): void {
    let commandModule = {} as Command<T>;

    commandModule.command = parseCommand(command);
    let subcommand = (handleSubcommand<T>).call(this, commandModule);
    
    commandModule.middleware = callbacks.slice(0, callbacks.length-1) as CommandMiddleware<T>[];
    commandModule.execute = {};
    if (subcommand)
        commandModule.execute[subcommand] = callbacks[callbacks.length-1] as CommandExecutor<T>;
    else
        commandModule.execute["(main)"] = callbacks[callbacks.length-1] as CommandExecutor<T>;

    switch (commandModule.command.type) {
        case ApplicationCommandType.ChatInput:
            this.commands.chat.set(commandModule.command.name, commandModule as unknown as Command<ChatInputCommandInteraction>);
            break;
        case ApplicationCommandType.Message:
            this.commands.message.set(commandModule.command.name, commandModule as unknown as Command<MessageContextMenuCommandInteraction>);
            break;
        case ApplicationCommandType.User:
            this.commands.user.set(commandModule.command.name, commandModule as unknown as Command<UserContextMenuCommandInteraction>);
            break;
    }
}

export function parseCommand(command: string): CommandData {
    let output = {} as CommandData;

    output.description = Defaults.NO_DESCRIPTION_PROVIDED;
    output.type = ApplicationCommandType.ChatInput;
    output.options = [];

    if (command.startsWith("u")) {
        parseUiBased(output, command, "u");
        return output;
    } else if (command.startsWith("m")) {
        parseUiBased(output, command, "m");
        return output;
    }

    let tokens = /^(p?\/(?:[\w-]{1,32})(?:\/[\w-]{1,32}(?:\/[\w-]{1,32})?)?)((?:\s(?:\[|<)[\w-]{1,32}\:(?:str|int|num|bool|user|ch|role|ment|att)(?::(?:v(?:\d+|-)\^(?:\d+|-)|(?:(?:gt|dm|gv|gdm|gc|ga|at|put|prt|gsv|gd|gf|gm),?){0,13}))?(?:\]|>))*)(?:\s\(((?:[\w.]+=[^|]+\|?)+)\))?$/.exec(command);
    
    if (!tokens) {
        return output;
    }

    let data = tokens[1] as string; 
    let options = tokens[2]?.trim()?.split(" ");
    let externals = tokens[3]?.split("|") as string[];

    let metadata = /^(p)?\/([\w-]{1,32})(?:\/([\w-]{1,32})(?:\/([\w-]{1,32}))?)?$/.exec(data);
    if (metadata) {
        output.prefixed = !!metadata[1];
        output.name = metadata[2] as string;

        if (metadata[3] && !metadata[4]) {
            output.subcommand = metadata[3];
        } else if (metadata[3] && metadata[4]) {
            output.subcommand_group = metadata[3];
            output.subcommand = metadata[4];
        }
    }

    if (options) {
        for (const option of options) {
            let optionFragments = /^([\w-]{1,32}):(str|int|num|bool|user|ch|role|ment|att)(?::(?:v(\d+|-)\^(\d+|-)|((?:(?:gt|dm|gv|gdm|gc|ga|at|put|prt|gsv|gd|gf|gm),?){0,13})))?(:ac)?$/.exec(option.substring(1, option.length-1));
            
            if (optionFragments) {
                let commandOption = {} as CommandDataOption;

                commandOption.description = Defaults.NO_DESCRIPTION_PROVIDED;
                commandOption.autocomplete = false;
                commandOption.required = option[0] === "<" ? true : false;
                commandOption.name = optionFragments[1] as string;
                commandOption.type = OptionType[optionFragments[2] as keyof typeof OptionType];

                if (optionFragments[3] && optionFragments[3] !== "-") {
                    if (commandOption.type === OptionType.str)
                        commandOption.min_length = parseInt(optionFragments[3]);
                    else if (commandOption.type === OptionType.num || commandOption.type === OptionType.int)
                        commandOption.min_value = parseInt(optionFragments[3]);
                } 
                if (optionFragments[4] && optionFragments[4] !== "-") {
                    if (commandOption.type === OptionType.str)
                        commandOption.max_length = parseInt(optionFragments[4]);
                    else if (commandOption.type === OptionType.num || commandOption.type === OptionType.int)
                        commandOption.max_value = parseInt(optionFragments[4]);
                }

                if (optionFragments[5] && commandOption.type === OptionType.ch) {
                    let channelTypes = optionFragments[5].split(",").map(
                        type => ChannelType[type as keyof typeof ChannelType]
                    );

                    commandOption.channel_types = channelTypes;
                }

                if (
                    optionFragments[6] && 
                    (commandOption.type === OptionType.str || 
                     commandOption.type === OptionType.num ||
                     commandOption.type === OptionType.int)
                ) 
                    commandOption.autocomplete = true;
                
                output.options.push(commandOption);
            }
        }
    }

    if (externals)
        parseExternals(output, externals);

    return output;
}

function parseExternals(output: CommandData, externals: string[]) {
    for (const external of externals) {
        let delimPos = external.indexOf("=");

        if (delimPos !== -1) {
            let type = external.substring(0, delimPos).trim();
            let value = external.substring(delimPos+1);

            if (type === "cat") {
                output.category = value;
            } else if (type.endsWith("dsc")) {
                if (type === "cmd.dsc") {
                    output.description = value;
                } else if (type === "sub.dsc") {
                    output.sub_description = value;
                } else if (type === "grp.dsc") {
                    output.group_description = value;
                } else {
                    (output.options[
                        output.options.findIndex(opt => opt.name === type.substring(0, type.length-4))
                    ] as CommandDataOption).description = value;
                }
            } else if (type.endsWith("choi")) {
                let choices = value.split(",").map(
                    choice => {
                        let [name, val] = choice.split(":");
                       
                        return {
                            name: name,
                            value: val
                        } as Choice;
                    }
                );
                let option = output.options[
                    output.options.findIndex(opt => opt.name === type.substring(0, type.length-5))
                ] as CommandDataOption;

                if (
                    [OptionType.str, OptionType.int, OptionType.num].includes(option.type) &&
                    !option.autocomplete &&
                    choices.length <= 25
                ) {
                    option.choices = choices;
                }
            }
        } 
    }
}

function parseUiBased(output: CommandData, command: string, type: "u" | "m") {
    output.type = type === "m" ? ApplicationCommandType.Message : ApplicationCommandType.User;
    let tokens = new RegExp(`^${type}\\/\\(([\\w\\s-]{1,32})\\)(?:\\s\\(((?:[\\w.]+=[^|]+\\|?)+)\\))?$`).exec(command);

    if (!tokens)
        return false;

    let name = tokens[1] as string; 
    output.name = name;

    let externals = tokens[2]?.split("|") as string[];
    parseExternals(output, externals);

    return true;
}