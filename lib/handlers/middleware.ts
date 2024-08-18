import { CommandInteraction } from "discord.js";
import { Command, CommandMiddleware, Reball } from "../types";
import { runCommandExecutor } from "./builtin";
 
export function use<T extends CommandInteraction>(this: Reball, middlewareFn: CommandMiddleware<T>) {
    this.middleware.push(middlewareFn as CommandMiddleware<CommandInteraction>);
}

export function handleMiddleware<T extends CommandInteraction>(this: Reball, interaction: T, command: Command<T>) {
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
        (middlewares[step] as CommandMiddleware<T>)(interaction, next);
}