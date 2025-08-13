import { 
    APIActionRowComponent, 
    APIButtonComponent, 
    ApplicationCommandType, 
    ButtonStyle,  
    ComponentType 
} from "discord.js";
import { glob as _glob, GlobOptions, Path } from "glob";
import { pathToFileURL } from "url";
import { CommandData, Supersonic } from "./types";

export enum OptionType {
    string = 3,
    int = 4,
    bool = 5,
    user = 6,
    channel = 7,
    role = 8,
    mentionable = 9,
    number = 10,
    attachment = 11
}

export enum Environment {
    Development = 0,
    Production = 1
}

export enum CommandScope {
    Global = "global",
    Guild = "guild"
}

export enum CommandType {
    Chat = "chat",
    User = "user",
    Message = "message"
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
    NEXT_PAGE_BUTTON_ID = "supersonic/next_page",
    DEVELOPMENT_GUILD_NAME = "development"
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

export function getCommand(
    this: Supersonic,
    name: string,
    type: CommandType,
    scope: CommandScope,
    guildId?: string
) {
    const key = constructCommandKey(name, type, scope, guildId);
    const mapping = this.mappings.get(key);

    if (mapping)
        return this.commands[type].get(mapping);
    else
        return null;
}

export function constructCommandKey(
    name: string,
    type: CommandType,
    scope: CommandScope,
    guildId?: string
): string {
    return scope === CommandScope.Global
        ? `${scope}:${type}:${name}`
        : `${scope}:${guildId}:${type}:${name}`
}

export function getNamedCommandType(
    type: ApplicationCommandType
): CommandType {
    return type === ApplicationCommandType.ChatInput 
        ? CommandType.Chat 
        : type === ApplicationCommandType.User 
            ? CommandType.User
            : CommandType.Message;
}

export function isCommandGuildBased(
    this: Supersonic,
    data: CommandData
): boolean {
    const guilds = data.guilds;
    const guildMap = this.opts.guilds || {};

    if (
        (guilds && guilds.length === 0)
        || (this.environment === Environment.Production && !guilds)
        || (this.environment === Environment.Development 
            && !guilds 
            && !(Defaults.DEVELOPMENT_GUILD_NAME in guildMap)
        )
    )
        return false;

    return true;
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

export async function safeImportSupersonicModule<T extends object>(modulePath: string): Promise<T> {
    // ESBuild/tsup causes default exports to be double wrapped i.e., 
    // ```ts
    // export default s.module( ... );
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