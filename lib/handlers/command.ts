import { Command, CommandData, CommandDataOption, SlashCommandInteraction } from "../types";
import { opt_type_mapping } from "../utils";

export function parse_command(command: string) {
    let output: CommandData = {
        name: "base-command",
        description: "No description provided",
        global: true,
        type: "CHAT_INPUT",
        options: []
    };

    let tokens = /^(?<command_data>[\w\-\/]+)\s?(?<command_options>(?:(\[|<)[\w:-]+(\]|>)\s?)*)(?:\((?<command_externals>(?:\$\d=.+,?)+)\))?$/.exec(command);
    
    if (!tokens || !tokens.groups) return output;
    
    const command_data: string = tokens.groups["command_data"] as string; 
    const command_options = tokens.groups["command_options"]?.trim()?.split(" ");
    const command_externals = tokens.groups["command_externals"]?.split(",");
    
    let data = /^(?<guild>g)?(?<type>u|m)?\/(?<name>[\w-]+)$/.exec(command_data);
    if (data && data.groups) {
        let guild = data.groups["guild"];
        let type = data.groups["type"];
        let name: string = data.groups["name"] ?? "";
        
        if (guild)
            output.global = false;
        if (type === "u")
            output.type = "USER";
        if (type === "m")
            output.type = "MESSAGE";
        output.name = name;
    }

    if (command_options) {
        for (const command_option of command_options) {
            let opt = /^(?<name>[\w-]+):(?<type>str|int|num|bool|user|ch|role|ment|att)(?::(?<max_value>\^\d+))?(?::(?<min_value>v\d+))?$/.exec(command_option.substring(1, command_option.length-1));
            
            if (opt && opt.groups) {
                let required: boolean = (command_option[0] === "<" ? true : false);
                let name: string = opt.groups["name"] ?? "";
                let type: number = opt_type_mapping(opt.groups["type"] ?? "");
                
                let option: CommandDataOption = {
                    name: name,
                    description: "No description provided",
                    type: type,
                    required: required
                };

                if (opt.groups["max_value"]) 
                    option.max_value = parseInt(opt.groups["max_value"].substring(1));
                if (opt.groups["min_value"])
                    option.min_value = parseInt(opt.groups["min_value"].substring(1));

                output.options.push(option);
            }
        }
    }

    if (command_externals) {
        for (const command_external of command_externals) {
            let delim_pos = command_external.indexOf("=");
            
            if (delim_pos !== -1) {
                let external_pos = parseInt(command_external.substring(0, delim_pos).substring(1));
                let external_text = command_external.substring(delim_pos+1);
                
                if (external_pos === 0) {
                    output.category = external_text;
                } else if (external_pos === 1) {
                    output.description = external_text;
                } else if (output.options[external_pos-2]) { 
                    (output.options[external_pos-2] as CommandDataOption).description = external_text;
                }
            } 
        }
    }

    return output;
}

export function module(command: string, ...callbacks: Function[]): Command {
    let command_module = {} as Command;
    
    command_module.command = parse_command(command);
    command_module.middleware = callbacks.slice(0, callbacks.length-1);
    command_module.execute = callbacks[callbacks.length-1] as (interaction: SlashCommandInteraction) => void;

    return command_module;
}

export function attach(command: string, ...callbacks: Function[]): void {
    let command_module = {} as Command;

    command_module.command = parse_command(command);
    command_module.middleware = callbacks.slice(0, callbacks.length-1);
    command_module.execute = callbacks[callbacks.length-1] as (interaction: SlashCommandInteraction) => void;

    if (!command_module.command.category)
        command_module.command.category = this.opts.default_category || "general";

    this.commands.set(command_module.command.name, command_module);
}