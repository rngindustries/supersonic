import { Interaction } from "discord.js";
import { Command } from "../types";

export function handle_interaction(interaction: Interaction) {
    if (interaction.isCommand()) {
        const command_name = interaction.commandName;
        const command = this.commands.get(command_name) as Command;

        if (command === undefined) {
            interaction.reply("Could not find this command.");
            return;
        }

        try {
            command.execute(interaction);
        } catch (err) {
            interaction.reply("Unexpected error occurred. If you are the developer, please view the terminal.");

            console.log(err);
        }
    }
}