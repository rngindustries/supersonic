import { CommandInteraction } from "discord.js";
import { Command, CommandMiddleware, Supersonic } from "../types";
import { runCommandExecutor } from "./builtin";
 
export function use<T extends CommandInteraction>(this: Supersonic, middlewareFn: CommandMiddleware<T>) {
    // use() is only for bot middleware, i.e., it does not apply to specific commands
    this.middleware.push(middlewareFn as CommandMiddleware<CommandInteraction>);
}

export function handleMiddleware<T extends CommandInteraction>(this: Supersonic, interaction: T, command: Command<T>) {
    let middlewares: CommandMiddleware<T>[] = this.middleware || [];
    let step = 0;

    if (command.middleware)
        middlewares.push(...command.middleware);
    
    function next() {
        step++;
        
        if (step < middlewares.length)
            (middlewares[step] as CommandMiddleware<T>)(interaction, next);
        else
            runCommandExecutor(interaction, command);
    }

    if (middlewares.length !== 0)
        // Currently, middlewares are responsible for calling next() to continue onto the next middleware
        // or the executor - if next() is not called, the executor will never run, which could make debugging difficult
        (middlewares[step] as CommandMiddleware<T>)(interaction, next);
}