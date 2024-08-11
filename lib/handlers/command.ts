import { 
    Choice,
    Command,
    CommandCallbacks, 
    CommandData, 
    CommandDataOption, 
    CommandExecutor, 
    CommandMiddleware
} from "../types";
import { ChannelType, Defaults, handle_subcommand, OptionType } from "../helpers";
import { ApplicationCommandType } from "discord.js";

export function module(command: string, ...callbacks: CommandCallbacks): Command {
    let command_module = {} as Command;

    command_module.command = parse_command(command);
    let subcommand = handle_subcommand.call(this, command_module);

    command_module.middleware = callbacks.slice(0, callbacks.length-1) as CommandMiddleware[];
    command_module.execute = {};
    if (subcommand) {
        command_module.execute[subcommand] = callbacks[callbacks.length-1] as CommandExecutor;
    } else {
        command_module.execute["(main)"] = callbacks[callbacks.length-1] as CommandExecutor;
    }

    return command_module;
}

export function attach(command: string, ...callbacks: CommandCallbacks): void {
    let command_module = {} as Command;

    command_module.command = parse_command(command);
    let subcommand = handle_subcommand.call(this, command_module);
    
    command_module.middleware = callbacks.slice(0, callbacks.length-1) as CommandMiddleware[];
    command_module.execute = {};
    if (subcommand) {
        command_module.execute[subcommand] = callbacks[callbacks.length-1] as CommandExecutor;
    } else {
        command_module.execute["(main)"] = callbacks[callbacks.length-1] as CommandExecutor;
    }

    if (!command_module.command.category)
        command_module.command.category = this.opts.default_category || "general";

    this.commands.set(command_module.command.name, command_module);
}

export function parse_command(command: string): CommandData {
    let output = {} as CommandData;

    output.description = Defaults.NO_DESCRIPTION_PROVIDED;
    output.type = ApplicationCommandType.ChatInput;
    output.options = [];

    if (command.startsWith("u")) {
        parse_ui_based(output, command, "u");
        return output;
    } else if (command.startsWith("m")) {
        parse_ui_based(output, command, "m");
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
            let option_fragments = /^([\w-]{1,32}):(str|int|num|bool|user|ch|role|ment|att)(?::(?:v(\d+|-)\^(\d+|-)|((?:(?:gt|dm|gv|gdm|gc|ga|at|put|prt|gsv|gd|gf|gm),?){0,13})))?(:ac)?$/.exec(option.substring(1, option.length-1));
            
            if (option_fragments) {
                let command_option = {} as CommandDataOption;

                command_option.description = Defaults.NO_DESCRIPTION_PROVIDED;
                command_option.autocomplete = false;
                command_option.required = option[0] === "<" ? true : false;
                command_option.name = option_fragments[1] as string;
                command_option.type = OptionType[option_fragments[2] as keyof typeof OptionType];

                if (option_fragments[3] && option_fragments[3] !== "-") {
                    if (command_option.type === OptionType.str)
                        command_option.min_length = parseInt(option_fragments[3]);
                    else if (command_option.type === OptionType.num || command_option.type === OptionType.int)
                        command_option.min_value = parseInt(option_fragments[3]);
                } 
                if (option_fragments[4] && option_fragments[4] !== "-") {
                    if (command_option.type === OptionType.str)
                        command_option.max_length = parseInt(option_fragments[4]);
                    else if (command_option.type === OptionType.num || command_option.type === OptionType.int)
                        command_option.max_value = parseInt(option_fragments[4]);
                }

                if (option_fragments[5] && command_option.type === OptionType.ch) {
                    let channel_types = option_fragments[5].split(",").map(
                        type => ChannelType[type as keyof typeof ChannelType]
                    );

                    command_option.channel_types = channel_types;
                }

                if (
                    option_fragments[6] && 
                    (command_option.type === OptionType.str || 
                     command_option.type === OptionType.num ||
                     command_option.type === OptionType.int)
                ) 
                    command_option.autocomplete = true;
                
                output.options.push(command_option);
            }
        }
    }

    if (externals)
        parse_externals(output, externals);

    return output;
}

function parse_externals(output: CommandData, externals: string[]) {
    for (const external of externals) {
        let delim_pos = external.indexOf("=");

        if (delim_pos !== -1) {
            let type = external.substring(0, delim_pos).trim();
            let value = external.substring(delim_pos+1);

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

function parse_ui_based(output: CommandData, command: string, type: "u" | "m") {
    output.type = type === "m" ? ApplicationCommandType.Message : ApplicationCommandType.User;
    let tokens = new RegExp(`^${type}\\/\\(([\\w\\s-]{1,32})\\)(?:\\s\\(((?:[\\w.]+=[^|]+\\|?)+)\\))?$`).exec(command);

    if (!tokens)
        return false;

    let name = tokens[1] as string; 
    output.name = name;

    let externals = tokens[2]?.split("|") as string[];
    parse_externals(output, externals);

    return true;
}