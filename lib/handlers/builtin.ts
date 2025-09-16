import { 
    ChatInputCommandInteraction, 
    CommandInteraction, 
    Interaction, 
    MessageContextMenuCommandInteraction, 
    UserContextMenuCommandInteraction 
} from "discord.js";
import { CommandScope, Defaults, getCommand, getNamedCommandType } from "../helpers";
import { Command, CommandExecutor, Supersonic } from "../types";

export function handleInteraction(this: Supersonic, interaction: Interaction) {
    if (interaction.isCommand()) {
        const commandName = interaction.commandName;
        const commandType = getNamedCommandType(interaction.commandType);
        const guildId = interaction.guildId ?? undefined;
        // Get command module
        const command = getCommand.call(
            this, 
            commandName, 
            commandType, 
            guildId ? CommandScope.Guild : CommandScope.Global, 
            guildId
        );

        if (!command) {
            // TODO: add warning explaining that there is an extant deleted command 
            interaction.reply({
                content: Defaults.COMMAND_NOT_FOUND,
                ephemeral: true
            });
            return;
        }

        try {
            if (this.middleware.length !== 0 || command.middleware.length !== 0) {
                // All middleware must be ran before executor 
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
            // TODO: add warning here
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
        // User or message commands cannot have subcommands
        (command.execute["(main)"] as CommandExecutor<T>)(interaction);
    }
}