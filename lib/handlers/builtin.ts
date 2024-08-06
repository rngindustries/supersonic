import { ChatInputCommandExecutor, Command, MessageContextMenuCommandExecutor, SlashCommandExecutor, SlashCommandInteraction, UserContextMenuCommandExecutor } from "../types";
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
            
            switch (interaction.commandType) {
                case 1:
                    (command.execute as ChatInputCommandExecutor)(interaction);
                    break;
                case 2:
                    (command.execute as UserContextMenuCommandExecutor)(interaction);
                    break;
                case 3:
                    (command.execute as MessageContextMenuCommandExecutor)(interaction);
                    break;
                default:
                    (command.execute as SlashCommandExecutor)(interaction);
                    break;
            }
        } catch (err) {
            interaction.reply("Unexpected error occurred. If you are the developer, please view the terminal.");

            console.log(err);
        }
    }
}