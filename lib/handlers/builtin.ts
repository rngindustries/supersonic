import { Command, SlashCommandInteraction, SlashCommandExecutor } from "../types";
import { handle_middleware } from "./middleware";

export function handle_interaction(interaction: SlashCommandInteraction) {
    if (interaction.isCommand()) {
        const command_name = interaction.commandName;
        const command = this.commands.get(command_name) as Command;

        if (command === undefined) {
            interaction.reply("Could not find this command.");
            return;
        }

        try {
            if (this.middleware.length !== 0) 
                handle_middleware(interaction);
            if (command.middleware.length !== 0)
                handle_middleware(interaction, command);

            (command.execute as SlashCommandExecutor)(interaction);
        } catch (err) {
            interaction.reply("Unexpected error occurred. If you are the developer, please view the terminal.");

            console.log(err);
        }
    }
}