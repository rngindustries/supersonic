import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { glob as _glob, GlobOptions } from "glob";
import { Command, CommandDataOption } from "./types";

export enum OptionType {
    str = 3,
    int = 4,
    bool = 5,
    user = 6,
    ch = 7,
    role = 8,
    ment = 9,
    num = 10,
    att = 11
}

export enum ChannelType {
    gt = 0,
    dm = 1,
    gv = 2,
    gdm = 3,
    gc = 4,
    ga = 5,
    at = 10,
    put = 11,
    prt = 12,
    gsv = 13,
    gd = 14,
    gf = 15,
    gm = 16
}

export enum Defaults {
    NO_DESCRIPTION_PROVIDED = "No description provided.",
    COMMAND_NOT_FOUND = "The requested command does not exist.",
    UNEXPECTED_ERROR = "An unexpected error has occurred! If you are the developer, please view your console."
}

export async function glob(pattern: string | string[], options?: GlobOptions) {
    // allows windows paths without removing the ability to escape glob patterns (see: windowsPathsNoEscape)
    if (typeof pattern === "string") 
        pattern = pattern.replaceAll(/\\/g, "/");
    else
        pattern = pattern.map(pat => pat.replaceAll(/\\/g, "/"))

    if (options)
        return await _glob(pattern, options);    
    return await _glob(pattern);
}

export function handle_subcommand(command_module: Command): string {
    let command_data = command_module.command;

    if (command_data.type !== ApplicationCommandType.ChatInput)
        return "";

    if (command_data.subcommand_group && command_data.subcommand) {
        let existing_command = this.commands.chat.get(command_data.name);
        let sub_option = {
            type: ApplicationCommandOptionType.Subcommand,
            name: command_data.subcommand,
            description: command_data.sub_description || Defaults.NO_DESCRIPTION_PROVIDED,
            options: command_data.options
        } as CommandDataOption;
        let group_option = {
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: command_data.subcommand_group,
            description: command_data.group_description || Defaults.NO_DESCRIPTION_PROVIDED,
            options: [sub_option]
        } as CommandDataOption;

        if (existing_command) {
            let existing_group = existing_command.options.findIndex(
                (option: CommandDataOption) => 
                    option.type === ApplicationCommandOptionType.SubcommandGroup &&
                    option.name === command_data.subcommand_group  
            );

            if (existing_group) {
                existing_command.options[existing_group].options.push(sub_option);
            } else {
                existing_command.options.push(group_option);
            }
        } else {
            command_module.command.options = [group_option];
            command_module.command.sub_description = undefined;
            command_module.command.group_description = undefined;
            command_module.command.subcommand = undefined;
            command_module.command.subcommand_group = undefined;
        }

        return `${group_option.name}:${sub_option.name}`;
    } else if (command_data.subcommand) {
        let existing_command = this.commands.chat.get(command_data.name);
        let sub_option = {
            type: ApplicationCommandOptionType.Subcommand,
            name: command_data.subcommand,
            description: command_data.sub_description || Defaults.NO_DESCRIPTION_PROVIDED,
            options: command_data.options
        } as CommandDataOption;

        if (existing_command) {
            existing_command.options.push(sub_option);
        } else {
            command_module.command.options = [sub_option];
            command_module.command.sub_description = undefined;
            command_module.command.subcommand = undefined;
        }                

        return sub_option.name;
    }

    return "";
}