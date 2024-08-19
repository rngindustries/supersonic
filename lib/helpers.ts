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
import { pathToFileURL } from "url";

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

export function handleSubcommand<T extends CommandInteraction>(this: Reball, commandModule: Command<T>): string {
    let commandData = commandModule.command;

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
            commandModule.command.options = [groupOption];
            commandModule.command.sub_description = undefined;
            commandModule.command.group_description = undefined;
            commandModule.command.subcommand = undefined;
            commandModule.command.subcommand_group = undefined;
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
            commandModule.command.options = [subOption];
            commandModule.command.sub_description = undefined;
            commandModule.command.subcommand = undefined;
        }                

        return subOption.name;
    }

    return "";
}

export async function safeImportReballModule<T extends object>(modulePath: string): Promise<T> {
    // ESBuild/tsup causes default exports to be double wrapped i.e., 
    // ```ts
    // export default r.module( ... );
    // ```
    // results in:
    //  {
    //      default: {
    //          default: [Getter] 
    //      } 
    //  }
    // 
    // Issue: https://github.com/evanw/esbuild/issues/2623
    // evanw's comment: https://github.com/evanw/esbuild/issues/2623#issuecomment-1287253436
    // 
    // Evan says not to use default exports which is sound advice (?), but with the way Reball is set up,
    // default exports are required.
    const urlPath = pathToFileURL(modulePath).href;
    let module: T = (await import(urlPath)).default || await import(urlPath);

    if ("default" in module)
        module = (module as { "default": T }).default;

    return module;
}