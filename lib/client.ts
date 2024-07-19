import { Command, Option } from "./types";

export function _short(command: string) {
    let output: Command = {
        name: "base-command",
        description: "No description provided.",
        global: true,
        type: "CHAT_INPUT",
        options: []
    };
    
    let tokens = /^(?<command_data>[\w\-\/]+)\s(?<command_options>(?:(\[|<)[\w:-]+(\]|>)\s?)+)\((?<command_descriptions>(?:\$\d=.+,?)+)\)$/.exec(command);
    
    if (!tokens || !tokens.groups) return;
    
    const command_data: string = tokens.groups["command_data"] as string; 
    const command_options = tokens.groups["command_options"]?.trim()?.split(" ");
    const command_descriptions = tokens.groups["command_descriptions"]?.split(",");
    
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
                let type: string = opt.groups["type"] ?? "";
                
                let option: Option = {
                    name: name,
                    description: "No description provided.",
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

    if (command_descriptions) {
        for (const command_description of command_descriptions) {
            let delim_pos = command_description.indexOf("=");
            
            if (delim_pos !== -1) {
                let description_pos = parseInt(command_description.substring(0, delim_pos).substring(1));
                let description_text = command_description.substring(delim_pos+1);
                
                if (description_pos === 1) { // **not zero-indexed
                    output.description = description_text;
                } else if (output.options[description_pos-2]) { 
                    (output.options[description_pos-2] as Option).description = description_text;
                }
            } 
        }
    }

    return output;
}