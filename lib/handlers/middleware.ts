import { CommandInteraction } from "discord.js";
import { Command, CommandMiddleware } from "../types";
import { run_command_executor } from "./builtin";
 
export function use<T extends CommandInteraction>(middleware_fn: CommandMiddleware<T>) {
    this.middleware.push(middleware_fn);
}

export function handle_middleware<T extends CommandInteraction>(interaction: T, command: Command<T>) {
    let middlewares: CommandMiddleware<T>[] = this.middleware || [];
    let step = 0;

    if (command.middleware)
        middlewares.push(...command.middleware);
    
    function next() {
        step++;
        
        if (step < middlewares.length)
            (middlewares[step] as CommandMiddleware<T>)(interaction, next);
        else
            run_command_executor(interaction, command);
    }

    if (middlewares.length !== 0)
        (middlewares[step] as CommandMiddleware<T>)(interaction, next);
}