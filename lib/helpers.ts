import { 
    APIActionRowComponent, 
    APIButtonComponent, 
    ButtonStyle,  
    ComponentType 
} from "discord.js";
import { glob as _glob, GlobOptions, Path } from "glob";
import { pathToFileURL } from "url";

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