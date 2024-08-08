import { randomBytes } from "crypto";

// globally unique custom id 
export function gucid(name: string, state: string[]) {
    let random = randomBytes(10).toString("hex");

    return `${name}_${state.join("_")}_${random}`;
}