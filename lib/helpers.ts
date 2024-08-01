import { glob as _glob, GlobOptions } from "glob";

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

export function cmd_type_mapping(type: string): number {
    switch (type) {
        case "CHAT_INPUT":
            return 1;
        case "USER":
            return 2;
        case "MESSAGE":
            return 3;
        default:
            return -1;
    }
}

export function opt_type_mapping(type: string): number {
    switch (type) {
        case "str":
            return 3;
        case "int": 
            return 4;
        case "bool":
            return 5;
        case "user":
            return 6;
        case "ch":
            return 7;
        case "role":
            return 8;
        case "ment":
            return 9;
        case "num":
            return 10;
        case "att":
            return 11;
        default:
            return -1;
    }
}