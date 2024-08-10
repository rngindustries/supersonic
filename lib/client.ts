import { resolve, dirname, basename } from "path";
import { 
    ApplicationCommand,  
    ApplicationCommandType, 
    Client, 
    ClientEvents 
} from "discord.js";
import { 
    ClientOptions, 
    Command, 
    CommandData,  
    CommandMiddleware, 
    Event 
} from "./types";
import { glob } from "./helpers";
import { handle_interaction } from "./handlers/builtin";
import { readFile } from "fs/promises";
import _ from "lodash";

export async function initialize(options?: ClientOptions | string): Promise<Client<boolean>> {
    let options_json_file: string = "";
    if (typeof options === "string")
        options_json_file = options;
    else if (options === undefined)
        options_json_file = "bot.json";

    if (options_json_file)
        options = JSON.parse(await readFile(options_json_file, "utf-8"));

    this.opts = options as ClientOptions;
    
    if (this.opts.guilds)
        this.guilds = this.opts.guilds;
    if (this.opts.channels)
        this.channels = this.opts.channels;
    if (this.opts.emojis)
        this.emojis = this.opts.emojis;

    const client = new Client(this.opts);
    this._client = client;

    this._client.on("interactionCreate", handle_interaction.bind(this));

    return client;
}   

export async function build(token: string) {
    if (!this._client || !this.opts) 
        return;

    await populate_middleware.call(this);
    // init events before logging in for events like ready to properly register
    await initialize_events.call(this);

    await this._client.login(token);
    
    await initialize_commands.call(this);
}

async function initialize_commands() {
    if (this.opts.module && this.opts.command_directory) {
        const command_files = await glob(resolve(this.opts.command_directory, "**", "*.{ts,js}")) as string[];
        
        for (const command_file of command_files) {
            // need to require() rather than import() since tsup doesn't import() -> require()
            // and import() causes a bunch of issues (e.g., needing file:// prepend for absolute paths)
            let command_module: Command = (require(command_file)).default || require(command_file);
            let command_data: CommandData = command_module.command;
            
            if (this.opts.use_directory_as_category && !command_data.category) {
                // use_directory_as_category does not override defined categories
                let command_directory = basename(dirname(command_file));
               
                if (command_directory !== basename(this.opts.command_directory))
                    command_data.category = command_directory;
                else
                    command_data.category = this.opts.default_category || "general";
            }

            switch (command_data.type) {
                case ApplicationCommandType.ChatInput:
                    this.commands.chat.set(command_data.name, command_module);
                    break;
                case ApplicationCommandType.Message:
                    this.commands.message.set(command_data.name, command_module);
                    break;
                case ApplicationCommandType.User:
                    this.commands.user.set(command_data.name, command_module);
                    break;
            }
        }
    }

    const slash_commands = await this._client.application?.commands.fetch();

    for (const type of ["chat", "message", "user"]) {
        for (const command of this.commands[type]) {
            let command_module: Command = command[1];
            let command_data: CommandData = command_module.command as CommandData;
            
            if (command_data.category && !this.categories.has(command_data.category)) 
                this.categories.add(command_data.category);

            let defined_command: ApplicationCommand = slash_commands.find(
                (cmd: ApplicationCommand) => 
                    cmd.name === command_data.name &&
                    cmd.type === command_data.type
            );

            if (!defined_command) {
                await this._client.application?.commands.create({
                    name: command_data.name,
                    description: command_data.type === ApplicationCommandType.ChatInput ? command_data.description : "",
                    type: command_data.type,
                    options: command_data.options
                });
            } else {
                const command_fmt = {
                    name: command_data.name,
                    description: command_data.type === ApplicationCommandType.ChatInput ? command_data.description : "",
                    type: command_data.type,
                    options: command_data.options
                };

                const defined_command_fmt = {
                    name: defined_command.name,
                    description: defined_command.description,
                    type: defined_command.type,
                    options: defined_command.options.map(opt => {
                        // https://github.com/monkeytypegame/monkeytype-bot/blob/66a97ae4cb6c282c8dff1731af91c55d7cddb26c/src/structures/client.ts#L252
                        type Keys = keyof typeof opt;
                        type Values = typeof opt[Keys];
                        type Entries = [Keys, Values];

                        for (const [key, value] of Object.entries(opt) as Entries[]) {
                            if (value === undefined || (Array.isArray(value) && value.length === 0)) {
                                delete opt[key];
                            }
                        }

                        return opt;
                    })
                };
                
                if (!_.isEqual(command_fmt, defined_command_fmt)) {
                    await this._client.application?.commands.edit(
                        defined_command,
                        command_fmt 
                    );
                }
            }
        }
    }
}

async function initialize_events() {
    if (this.opts.module && this.opts.event_directory) {
        const event_files = await glob(resolve(this.opts.event_directory, "**", "*.{ts,js}")) as string[];
        
        for (const event_file of event_files) {
            // require: same reasoning as initialize_commands 
            let event_module: Event<keyof ClientEvents> = (require(event_file)).default || require(event_file);

            this.events.set(event_module.alias || event_module.name, event_module);
        }
    }

    for (const event of this.events) {
        let event_module: Event<keyof ClientEvents> = event[1];
        this._client[event_module.once ? "once" : "on"](event_module.name, event_module.execute.bind(this));
    }
}

async function populate_middleware() {
    if (this.opts.middleware_directory) {
        const middleware_files = await glob(resolve(this.opts.middleware_directory, "**", "+*.{ts,js}")) as string[];

        for (const middleware_file of middleware_files) {
            // require: same reasoning as initialize_commands
            let middleware: CommandMiddleware = (require(middleware_file)).default || require(middleware_file); 
            
            if (typeof middleware === "function")
                this.middleware.push(middleware);
        }
    }
}