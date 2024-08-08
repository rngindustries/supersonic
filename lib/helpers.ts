import { glob as _glob, GlobOptions } from "glob";

export enum OptionType {
    "str" = 3,
    "int" = 4,
    "bool" = 5,
    "user" = 6,
    "ch" = 7,
    "role" = 8,
    "ment" = 9,
    "num" = 10,
    "att" = 11
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