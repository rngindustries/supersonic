import { 
    APIActionRowComponent, 
    APIButtonComponent, 
    ApplicationCommandOptionType, 
    ButtonStyle, 
    ChatInputCommandInteraction, 
    ComponentType 
} from "discord.js";
import { glob as _glob, GlobOptions, Path } from "glob";
import { Command, CommandDataOption, CommandExecutor, Supersonic } from "./types";
import { pathToFileURL } from "url";

export enum OptionType {
    str = 3,
    int = 4,
    bool = 5,
    user = 6,
    chan = 7,
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
    DEFAULT_CATEGORY = "general",
    NO_DESCRIPTION_PROVIDED = "No description provided.",
    COMMAND_NOT_FOUND = "The requested command does not exist.",
    UNEXPECTED_ERROR = "An unexpected error has occurred! If you are the developer, please view your console.",
    PAGE_NUMBER_LABEL_ID = "supersonic/page_number_label",
    LEFT_END_PAGE_BUTTON_ID = "supersonic/left_end_page",
    RIGHT_END_PAGE_BUTTON_ID = "supersonic/right_end_page",
    PREVIOUS_PAGE_BUTTON_ID = "supersonic/previous_page",
    NEXT_PAGE_BUTTON_ID = "supersonic/next_page"
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

export async function glob(
    pattern: string | string[], 
    options?: GlobOptions
): Promise<string[] | Path[]> {
    // allows windows paths without removing the ability to escape glob patterns (see: windowsPathsNoEscape)
    if (typeof pattern === "string") 
        pattern = pattern.replaceAll(/\\/g, "/");
    else
        pattern = pattern.map(pat => pat.replaceAll(/\\/g, "/"))

    if (options)
        return await _glob(pattern, options);    
    return await _glob(pattern);
}

export function handleSubcommand(
    this: Supersonic, 
    commandModule: Command<ChatInputCommandInteraction>
): boolean {
    let commandData = commandModule.data;

    if (commandData.groupName && commandData.subName) {
        let existingCommand = this.commands.chat.get(commandData.name);
        let subOption = {
            type: ApplicationCommandOptionType.Subcommand,
            name: commandData.subName,
            description: commandData.subDescription || Defaults.NO_DESCRIPTION_PROVIDED,
            options: commandData.options
        } as CommandDataOption;
        let groupOption = {
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: commandData.groupName,
            description: commandData.groupDescription || Defaults.NO_DESCRIPTION_PROVIDED,
            options: [subOption]
        } as CommandDataOption;

        if (existingCommand) {
            let existingGroup = existingCommand.data.options.findIndex(
                (option: CommandDataOption) => 
                    option.type === ApplicationCommandOptionType.SubcommandGroup &&
                    option.name === commandData.groupName  
            );

            if (existingGroup) {
                existingCommand.data.options[existingGroup]?.options?.push(subOption);
            } else {
                existingCommand.data.options.push(groupOption);
            }
        
            const executor = commandModule.execute[`${commandData.groupName}:${commandData.subName}`] as CommandExecutor<ChatInputCommandInteraction>;
            existingCommand.execute[`${commandData.groupName}:${commandData.subName}`] = executor;

            return true;
        } else {
            commandModule.data.options = [groupOption];
            commandModule.data.subDescription = undefined;
            commandModule.data.groupDescription = undefined;
            commandModule.data.subName = undefined;
            commandModule.data.groupName = undefined;

            return false;
        }
    } else if (commandData.subName) {
        let existingCommand = this.commands.chat.get(commandData.name);
        let subOption = {
            type: ApplicationCommandOptionType.Subcommand,
            name: commandData.subName,
            description: commandData.subDescription || Defaults.NO_DESCRIPTION_PROVIDED,
            options: commandData.options
        } as CommandDataOption;

        if (existingCommand) {
            existingCommand.data.options.push(subOption);

            const executor = commandModule.execute[commandData.subName] as CommandExecutor<ChatInputCommandInteraction>;
            existingCommand.execute[commandData.subName] = executor;
            
            return true;
        } else {
            commandModule.data.options = [subOption];
            commandModule.data.subDescription = undefined;
            commandModule.data.subName = undefined;

            return false;
        }
    }

    return false;
}

export async function safeImportSupersonicModule<T extends object>(modulePath: string): Promise<T> {
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
    // Evan says not to use default exports which is sound advice (?), but with the way Supersonic is set up,
    // default exports are required.
    const urlPath = pathToFileURL(modulePath).href;
    let module: T = (await import(urlPath)).default || await import(urlPath);

    if ("default" in module)
        module = (module as { "default": T }).default;

    return module;
}