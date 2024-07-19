export interface Command {
    name: string;
    description: string;
    global: boolean;
    type: "CHAT_INPUT" | "USER" | "MESSAGE";
    options: Option[];
}

export interface Option {
    name: string;
    description: string;
    type: string;
    required: boolean;
    min_value?: number;
    max_value?: number;
}
