import { ApplicationCommandType, ChatInputCommandInteraction, CommandInteraction, Interaction, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { Defaults } from "../helpers";
import { Command, CommandExecutor } from "../types";

export function handle_interaction(interaction: Interaction) {
    if (interaction.isCommand()) {
        const command_name = interaction.commandName;
        let command;
        switch (interaction.commandType) {
            case ApplicationCommandType.ChatInput:
                command = this.commands.chat.get(command_name) as Command<ChatInputCommandInteraction>;
                break;
            case ApplicationCommandType.User:
                command = this.commands.user.get(command_name) as Command<UserContextMenuCommandInteraction>;
                break;
            case ApplicationCommandType.Message:
                command = this.commands.message.get(command_name) as Command<MessageContextMenuCommandInteraction>;
                break;
        }

        if (command === undefined) {
            interaction.reply({
                content: Defaults.COMMAND_NOT_FOUND,
                ephemeral: true
            });
            return;
        }

        try {
            if (this.middleware.length !== 0 || command.middleware.length !== 0) {
                this.handle_middleware(interaction, command);
            } else {
                if (interaction.isChatInputCommand())
                    (run_command_executor<ChatInputCommandInteraction>)(interaction, command as Command<ChatInputCommandInteraction>);
                else if (interaction.isUserContextMenuCommand())
                    (run_command_executor<UserContextMenuCommandInteraction>)(interaction, command as Command<UserContextMenuCommandInteraction>);
                else if (interaction.isMessageContextMenuCommand())
                    (run_command_executor<MessageContextMenuCommandInteraction>)(interaction, command as Command<MessageContextMenuCommandInteraction>);
            }
        } catch (err) {
            interaction.reply({
                content: Defaults.UNEXPECTED_ERROR,
                ephemeral: true
            });

            console.log(err);
        }
    } else if (interaction.isButton()) {
        const custom_id = interaction.customId;
        const [name] = custom_id.split("|");
        const button = this.components.button.get(name);

        if (button === undefined)
            return;

        try {
            button.execute(interaction);
        } catch (err) {
            interaction.reply({
                content: Defaults.UNEXPECTED_ERROR,
                ephemeral: true
            });

            console.log(err);
        }
    }
}

export function run_command_executor<T extends CommandInteraction>(interaction: T, command: Command<T>) {
    if (interaction.isChatInputCommand()) {
        let group = interaction.options.getSubcommandGroup(false);
        let subcommand = interaction.options.getSubcommand(false);

        if (group && subcommand) {
            (command.execute[`${group}:${subcommand}`] as CommandExecutor<T>)(interaction);
        } else if (!group && subcommand) {
            (command.execute[`${subcommand}`] as CommandExecutor<T>)(interaction);
        } else {
            (command.execute["(main)"] as CommandExecutor<T>)(interaction);
        }
    } else if (interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
        (command.execute["(main)"] as CommandExecutor<T>)(interaction);
    }
}