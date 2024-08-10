import { DefaultResponses } from "../helpers";
import { 
    ChatInputCommandExecutor, 
    Command, 
    MessageContextMenuCommandExecutor, 
    SlashCommandExecutor, 
    SlashCommandInteraction, 
    UserContextMenuCommandExecutor 
} from "../types";

export function handle_interaction(interaction: SlashCommandInteraction) {
    if (interaction.isCommand()) {
        const command_name = interaction.commandName;
        const command = this.commands.get(command_name) as Command;

        if (command === undefined) {
            interaction.reply(DefaultResponses.COMMAND_NOT_FOUND);
            return;
        }

        try {
            if (this.middleware.length !== 0 || command.middleware.length !== 0)
                this.handle_middleware(interaction, command);
            else
                run_command_executor(interaction, command);
        } catch (err) {
            interaction.reply(DefaultResponses.UNEXPECTED_ERROR);

            console.log(err);
        }
    }
}

export function run_command_executor(interaction: SlashCommandInteraction, command: Command) {
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
}