import { 
    APIActionRowComponent, 
    APIButtonComponent, 
    ApplicationCommandOptionType, 
    ApplicationCommandType, 
    ButtonStyle, 
    CommandInteraction, 
    ComponentType 
} from "discord.js";
import { glob as _glob, GlobOptions } from "glob";
import { Command, CommandDataOption, Reball } from "./types";

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
    UNEXPECTED_ERROR = "An unexpected error has occurred! If you are the developer, please view your console.",
    PAGE_NUMBER_LABEL_ID = "reball/page_number_label",
    LEFT_END_PAGE_BUTTON_ID = "reball/left_end_page",
    RIGHT_END_PAGE_BUTTON_ID = "reball/right_end_page",
    PREVIOUS_PAGE_BUTTON_ID = "reball/previous_page",
    NEXT_PAGE_BUTTON_ID = "reball/next_page"
}

export const PresetPaginationRowList: { [key: string]: APIActionRowComponent<APIButtonComponent>} = {
    "basic": {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: Defaults.PREVIOUS_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                emoji: {
                    name: "◀"
                }
            },
            {
                type: ComponentType.Button,
                custom_id: Defaults.NEXT_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                emoji: {
                    name: "▶"
                }
            }
        ]
    }, 
    "labels": {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: Defaults.PREVIOUS_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                label: "Previous"
            },
            {
                type: ComponentType.Button,
                custom_id: Defaults.NEXT_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                label: "Next"
            }
        ]
    },
    "page_number": {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: Defaults.PREVIOUS_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                emoji: {
                    name: "◀"
                }
            },
            {
                type: ComponentType.Button,
                custom_id: Defaults.PAGE_NUMBER_LABEL_ID,
                style: ButtonStyle.Secondary,
                label: "Page ? of ?",
                disabled: true
            },
            {
                type: ComponentType.Button,
                custom_id: Defaults.NEXT_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                emoji: {
                    name: "▶"
                }
            }
        ]
    },
    "ends": {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: Defaults.LEFT_END_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                emoji: {
                    name: "⏮️"
                }
            },
            {
                type: ComponentType.Button,
                custom_id: Defaults.PREVIOUS_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                emoji: {
                    name: "◀"
                }
            },
            {
                type: ComponentType.Button,
                custom_id: Defaults.NEXT_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                emoji: {
                    name: "▶"
                }
            },
            {
                type: ComponentType.Button,
                custom_id: Defaults.RIGHT_END_PAGE_BUTTON_ID,
                style: ButtonStyle.Primary,
                emoji: {
                    name: "⏭"
                }
            },
        ]
    }
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

export function handleSubcommand<T extends CommandInteraction>(this: Reball, command_module: Command<T>): string {
    let commandData = command_module.command;

    if (commandData.type !== ApplicationCommandType.ChatInput)
        return "";

    if (commandData.subcommand_group && commandData.subcommand) {
        let existingCommand = this.commands.chat.get(commandData.name);
        let subOption = {
            type: ApplicationCommandOptionType.Subcommand,
            name: commandData.subcommand,
            description: commandData.sub_description || Defaults.NO_DESCRIPTION_PROVIDED,
            options: commandData.options
        } as CommandDataOption;
        let groupOption = {
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: commandData.subcommand_group,
            description: commandData.group_description || Defaults.NO_DESCRIPTION_PROVIDED,
            options: [subOption]
        } as CommandDataOption;

        if (existingCommand) {
            let existingGroup = existingCommand.command.options.findIndex(
                (option: CommandDataOption) => 
                    option.type === ApplicationCommandOptionType.SubcommandGroup &&
                    option.name === commandData.subcommand_group  
            );

            if (existingGroup) {
                existingCommand.command.options[existingGroup]?.options?.push(subOption);
            } else {
                existingCommand.command.options.push(groupOption);
            }
        } else {
            command_module.command.options = [groupOption];
            command_module.command.sub_description = undefined;
            command_module.command.group_description = undefined;
            command_module.command.subcommand = undefined;
            command_module.command.subcommand_group = undefined;
        }

        return `${groupOption.name}:${subOption.name}`;
    } else if (commandData.subcommand) {
        let existingCommand = this.commands.chat.get(commandData.name);
        let subOption = {
            type: ApplicationCommandOptionType.Subcommand,
            name: commandData.subcommand,
            description: commandData.sub_description || Defaults.NO_DESCRIPTION_PROVIDED,
            options: commandData.options
        } as CommandDataOption;

        if (existingCommand) {
            existingCommand.command.options.push(subOption);
        } else {
            command_module.command.options = [subOption];
            command_module.command.sub_description = undefined;
            command_module.command.subcommand = undefined;
        }                

        return subOption.name;
    }

    return "";
}