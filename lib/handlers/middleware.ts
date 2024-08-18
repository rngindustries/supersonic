import { CommandInteraction } from "discord.js";
import { Command, CommandMiddleware, Reball } from "../types";
import { run_command_executor } from "./builtin";
 
export function use<T extends CommandInteraction>(this: Reball, middleware_fn: CommandMiddleware<T>) {
    this.middleware.push(middleware_fn as CommandMiddleware<CommandInteraction>);
}

export function handle_middleware<T extends CommandInteraction>(this: Reball, interaction: T, command: Command<T>) {
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