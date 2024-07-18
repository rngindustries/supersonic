import { Command, Option } from "./types";

export function _short(command: string) {
    let output: Command = {
        name: "",
        global: true,
        type: "CHAT_INPUT",
        options: []
    };
    let tokens: string[] = command.split(" ");

    const command_data = /(g)?(u)?\/([\w-]+)/.exec(tokens[0]);
    if (command_data !== null) {
        let guild: string = command_data[1];
        let type: string = command_data[2];
        let name: string = command_data[3];
        
        if (guild)
            output.global = false;
        if (type === "u")
            output.type = "USER";
        if (type === "m")
            output.type = "MESSAGE";
        output.name = name;
    }

    for (const token of tokens.slice(1)) {
        const opt = /([\w-]+):(str|int|num|bool|user|ch|role|ment|att)(?::(\^\d+))?(?::(v\d+))?(?::(\$(d|v)\d+,?)+)?/.exec(token.substring(1, token.length-1));
        
        if (opt !== null) {
            let required: boolean = (token[0] === "<" ? true : false);
            let name: string = opt[1];
            let type: string = opt[2];
            
            let option: Option = {
                name: name,
                type: type,
                required: required,
                externals: (opt[5] ? opt[5].split(",") : null)
            };

            if (opt[3]) 
                option.max_value = parseInt(opt[3].substring(1));
            if (opt[4])
                option.min_value = parseInt(opt[4].substring(1));

            output.options.push(option);
        }
    }

    return output;
}