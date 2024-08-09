import { 
    Command,
    CommandCallbacks, 
    CommandData, 
    CommandDataOption, 
    CommandExecutor, 
    CommandMiddleware
} from "../types";
import { OptionType } from "../helpers";
import { ApplicationCommandType } from "discord.js";

export function parse_command(command: string): CommandData {
    let output = {} as CommandData;

    output.type = ApplicationCommandType.ChatInput;
    output.options = [];

    let tokens = /^([gump]{0,3}\/(?:[\w-]+|\([\w\s-]+\)))((?:\s(?:\[|<)[\w-]+\:(?:str|int|num|bool|user|ch|role|ment|att)(?:\:(?:v|\^)\d+)*(?:\]|>))*)(\s\((?:[\w.]+=[^|]+\|?)+\))?$/.exec(command);
    
    if (!tokens) {
        return output;
    }

    let data = tokens[1] as string; 
    let options = tokens[2]?.trim()?.split(" ");
    let externals = tokens[3]?.trim().substring(1, tokens[3].length-1).split("|");
    
    let extracted = /^(g)?(u|m)?(p)?\/([\w-]+|\([\w\s-]+\))$/.exec(data);
    if (extracted) {
        let global = extracted[1];
        let type = extracted[2];
        let name = extracted[4] as string;

        if (global)
            output.global = false;
        if (type === "u")
            output.type = ApplicationCommandType.User;
        if (type === "m")
            output.type = ApplicationCommandType.Message;
        
        if (name.startsWith("("))
            output.name = name.substring(1, name.length-1);
        else
            output.name = name;
    }
    
    if (options) {
        for (const option of options) {
            let option_fragments = /^([\w-]+):(str|int|num|bool|user|ch|role|ment|att)(?:(?::(\^\d+))|(?::(v\d+))){0,2}$/.exec(option.substring(1, option.length-1));
            
            if (option_fragments) {
                let command_option = {} as CommandDataOption;

                command_option.description = "No description provided";
                command_option.required = option[0] === "<" ? true : false;
                command_option.name = option_fragments[1] as string;
                command_option.type = OptionType[option_fragments[2] as keyof typeof OptionType];

                if (command_option.type === OptionType.str || command_option.type === OptionType.int) {
                    if (option_fragments[3]) 
                        command_option.max_value = parseInt(option_fragments[3].substring(1));
                    if (option_fragments[4])
                        command_option.min_value = parseInt(option_fragments[4].substring(1));
                }

                output.options.push(command_option);
            }
        }
    }

    if (externals) {
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

    return output;
}

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