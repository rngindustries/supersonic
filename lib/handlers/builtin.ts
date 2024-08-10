import { ApplicationCommandType } from "discord.js";
import { Defaults } from "../helpers";
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
        let command: Command;
        switch (interaction.commandType) {
            case ApplicationCommandType.ChatInput:
                command = this.commands.chat.get(command_name) as Command;
                break;
            case ApplicationCommandType.User:
                command = this.commands.user.get(command_name) as Command;
                break;
            case ApplicationCommandType.Message:
                command = this.commands.message.get(command_name) as Command;
                break;
        }

        if (command === undefined) {
            interaction.reply(Defaults.COMMAND_NOT_FOUND);
            return;
        }

        try {
            if (this.middleware.length !== 0 || command.middleware.length !== 0)
                this.handle_middleware(interaction, command);
            else 
                run_command_executor(interaction, command);
        } catch (err) {
            interaction.reply(Defaults.UNEXPECTED_ERROR);

            console.log(err);
        }
    }
}

export function run_command_executor(interaction: SlashCommandInteraction, command: Command) {
    switch (interaction.commandType) {
        case ApplicationCommandType.ChatInput:
            let group = interaction.options.getSubcommandGroup(false);
            let subcommand = interaction.options.getSubcommand(false);

            if (group && subcommand) {
                (command.execute[`${group}:${subcommand}`] as ChatInputCommandExecutor)(interaction);
            } else if (!group && subcommand) {
                (command.execute[`${subcommand}`] as ChatInputCommandExecutor)(interaction);
            } else {
                (command.execute["(main)"] as ChatInputCommandExecutor)(interaction);
            }
            break;
        case ApplicationCommandType.User:
            (command.execute["(main)"] as UserContextMenuCommandExecutor)(interaction);
            break;
        case ApplicationCommandType.Message:
            (command.execute["(main)"] as MessageContextMenuCommandExecutor)(interaction);
            break;
        default:
            (command.execute["(main)"] as SlashCommandExecutor)(interaction);
            break;
    }
}