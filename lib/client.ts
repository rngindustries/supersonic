import { resolve, dirname, basename } from "path";
import { ApplicationCommand, Client } from "discord.js";
import { ClientOptions, Command, CommandData } from "./types";
import { cmd_type_mapping, glob } from "./utils";
import { handle_interaction } from "./handlers/defaults";
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

    await this._client.login(token);

    if (this.opts.module) {
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

            this.commands.set(command_data.name, command_module);
        }
    }

    const slash_commands = await this._client.application?.commands.fetch();

    for (const command of this.commands) {
        let command_module: Command = command[1];
        let command_data: CommandData = command_module.command as CommandData;
        
        this.categories.add(command_data.category ?? "general");

        let defined_command: ApplicationCommand = slash_commands.find((cmd: ApplicationCommand) => cmd.name === command_data.name);

        if (!defined_command) {
            await this._client.application?.commands.create({
                name: command_data.name,
                description: command_data.type === "CHAT_INPUT" ? command_data.description : "",
                type: cmd_type_mapping(command_data.type),
                options: command_data.options
            });
        } else {
            const command_fmt = {
                name: command_data.name,
                description: command_data.type === "CHAT_INPUT" ? command_data.description : "",
                type: cmd_type_mapping(command_data.type),
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