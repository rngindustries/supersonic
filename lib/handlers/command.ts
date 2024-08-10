import { 
    Command,
    CommandCallbacks, 
    CommandData, 
    CommandDataOption, 
    CommandExecutor, 
    CommandMiddleware
} from "../types";
import { DefaultResponses, OptionType } from "../helpers";
import { ApplicationCommandType } from "discord.js";

export function module(command: string, ...callbacks: CommandCallbacks): Command {
    let command_module = {} as Command;

    command_module.command = parse_command(command);
    command_module.middleware = callbacks.slice(0, callbacks.length-1) as CommandMiddleware[];
    command_module.execute = callbacks[callbacks.length-1] as CommandExecutor;
    
    return command_module;
}

export function attach(command: string, ...callbacks: CommandCallbacks): void {
    let command_module = {} as Command;

    command_module.command = parse_command(command);
    command_module.middleware = callbacks.slice(0, callbacks.length-1) as CommandMiddleware[];
    command_module.execute = callbacks[callbacks.length-1] as CommandExecutor;

    if (!command_module.command.category)
        command_module.command.category = this.opts.default_category || "general";

    this.commands.set(command_module.command.name, command_module);
}

export function parse_command(command: string): CommandData {
    let output = {} as CommandData;

    output.description = DefaultResponses.NO_DESCRIPTION_PROVIDED;
    output.type = ApplicationCommandType.ChatInput;
    output.options = [];

    if (command.startsWith("u")) {
        parse_ui_based(output, command, "u");
        return output;
    } else if (command.startsWith("m")) {
        parse_ui_based(output, command, "m");
        return output;
    }

    let tokens = /^(p?\/(?:[\w-]{1,32}))((?:\s(?:\[|<)[\w-]{1,32}\:(?:str|int|num|bool|user|ch|role|ment|att)(?::v(?:\d+|-)\^(?:\d+|-))?(?:\]|>))*)(?:\s\(((?:[\w.]+=[^|]+\|?)+)\))?$/.exec(command);
    
    if (!tokens) {
        return output;
    }

    let data = tokens[1] as string; 
    let options = tokens[2]?.trim()?.split(" ");
    let externals = tokens[3]?.split("|") as string[];
    
    if (data.startsWith("p")) {
        output.prefix = true;
        output.name = data.substring(2);
    } else {
        output.name = data.substring(1);
    }

    if (options) {
        for (const option of options) {
            let option_fragments = /^([\w-]{1,32}):(str|int|num|bool|user|ch|role|ment|att)(?::v(\d+|-)\^(\d+|-))?$/.exec(option.substring(1, option.length-1));
            
            if (option_fragments) {
                let command_option = {} as CommandDataOption;

                command_option.description = DefaultResponses.NO_DESCRIPTION_PROVIDED;
                command_option.required = option[0] === "<" ? true : false;
                command_option.name = option_fragments[1] as string;
                command_option.type = OptionType[option_fragments[2] as keyof typeof OptionType];

                if (command_option.type === OptionType.str || command_option.type === OptionType.int) {
                    if (option_fragments[3] && option_fragments[3] !== "-")
                        command_option.min_value = parseInt(option_fragments[3]);
                    if (option_fragments[4] && option_fragments[4] !== "-") 
                        command_option.max_value = parseInt(option_fragments[4]);
                }

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
            let text = external.substring(delim_pos+1);

            if (type === "cat") {
                output.category = text;
            } else if (type.endsWith("dsc")) {
                if (type === "cmd.dsc") {
                    output.description = text;
                } else {
                    (output.options[
                        output.options.findIndex(opt => opt.name === type.substring(0, type.length-4))
                    ] as CommandDataOption).description = text;
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