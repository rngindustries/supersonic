export interface Command {
    name: string;
    global: boolean;
    type: "CHAT_INPUT" | "USER" | "MESSAGE";
    options: Option[];
}

export interface Option {
    name: string;
    type: string;
    required: boolean;
    min_value?: number;
    max_value?: number;
    externals: string[] | null;
}
