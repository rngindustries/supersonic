import { Command, CommandMiddleware, SlashCommandMiddleware, SlashCommandInteraction } from "../types";
 
export function handle_middleware(interaction: SlashCommandInteraction, command?: Command) {
    let middlewares: CommandMiddleware[];
    if (command)
        middlewares = command.middleware;
    else 
        middlewares = this.middleware;
    let step = 0;

    function next() {
        step++;
        
        if (step < middlewares.length)
            (middlewares[step] as SlashCommandMiddleware)(interaction, next);
    }

    if (middlewares.length !== 0 && middlewares[0]) 
        (middlewares[0] as SlashCommandMiddleware)(interaction, next);
}