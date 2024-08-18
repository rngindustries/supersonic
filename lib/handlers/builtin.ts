import { 
    ApplicationCommandType,
    ChatInputCommandInteraction, 
    CommandInteraction, 
    Interaction, 
    MessageContextMenuCommandInteraction, 
    UserContextMenuCommandInteraction 
} from "discord.js";
import { Defaults } from "../helpers";
import { Command, CommandExecutor, Reball } from "../types";

export function handleInteraction(this: Reball, interaction: Interaction) {
    if (interaction.isCommand()) {
        const commandName = interaction.commandName;
        let command;
        switch (interaction.commandType) {
            case ApplicationCommandType.ChatInput:
                command = this.commands.chat.get(commandName) as Command<ChatInputCommandInteraction>;
                break;
            case ApplicationCommandType.User:
                command = this.commands.user.get(commandName) as Command<UserContextMenuCommandInteraction>;
                break;
            case ApplicationCommandType.Message:
                command = this.commands.message.get(commandName) as Command<MessageContextMenuCommandInteraction>;
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
                if (interaction.isChatInputCommand())
                    this.handleMiddleware<ChatInputCommandInteraction>(interaction, command as Command<ChatInputCommandInteraction>);
                else if (interaction.isUserContextMenuCommand())
                    this.handleMiddleware<UserContextMenuCommandInteraction>(interaction, command as Command<UserContextMenuCommandInteraction>);
                else if (interaction.isMessageContextMenuCommand())
                    this.handleMiddleware<MessageContextMenuCommandInteraction>(interaction, command as Command<MessageContextMenuCommandInteraction>);
            } else {
                if (interaction.isChatInputCommand())
                    (runCommandExecutor<ChatInputCommandInteraction>)(interaction, command as Command<ChatInputCommandInteraction>);
                else if (interaction.isUserContextMenuCommand())
                    (runCommandExecutor<UserContextMenuCommandInteraction>)(interaction, command as Command<UserContextMenuCommandInteraction>);
                else if (interaction.isMessageContextMenuCommand())
                    (runCommandExecutor<MessageContextMenuCommandInteraction>)(interaction, command as Command<MessageContextMenuCommandInteraction>);
            }
        } catch (err) {
            interaction.reply({
                content: Defaults.UNEXPECTED_ERROR,
                ephemeral: true
            });

            console.log(err);
        }
    } else if (interaction.isButton()) {
        const customId = interaction.customId;
        const [name] = customId.split("|");
        const button = this.components.button.get(name as string);

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

export function runCommandExecutor<T extends CommandInteraction>(interaction: T, command: Command<T>) {
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