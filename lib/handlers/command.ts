import { 
    Command,
    CommandCallbacks, 
    CommandData, 
    CommandDataOption, 
    CommandExecutor, 
    CommandMiddleware,
    CommandPayload,
    Supersonic
} from "../types";
import { 
    ApplicationCommandOptionType,
    ApplicationCommandType, 
    ChatInputCommandInteraction,
    CommandInteraction, 
    MessageContextMenuCommandInteraction, 
    UserContextMenuCommandInteraction 
} from "discord.js";
import { 
    CommandScope, 
    CommandType, 
    constructCommandKey, 
    Defaults, 
    Environment, 
    getCommand, 
    getNamedCommandType, 
    isCommandGuildBased, 
    OptionType 
} from "../helpers";

export function module<T extends CommandInteraction>(
    this: Supersonic,
    payload: CommandPayload, 
    ...callbacks: CommandCallbacks<T>
): Command<T> {
    let commandModule = {} as Command<T>;
    let commandData = parseCommandPayload.call(this, payload);

    commandModule.data = commandData;
    commandModule.middleware = callbacks.slice(0, callbacks.length-1) as CommandMiddleware<T>[];
    commandModule.execute = {};

    const executor = callbacks[callbacks.length-1] as CommandExecutor<T>;
    if (commandData.groupName && commandData.subName)
        commandModule.execute[`${commandData.groupName}:${commandData.subName}`] = executor;
    else if (!commandData.groupName && commandData.subName)
        commandModule.execute[commandData.subName] = executor;
    else
        commandModule.execute["(main)"] = executor;

    return commandModule;
}

export function attach<T extends CommandInteraction>(
    this: Supersonic,
    commandModule: Command<T>,
    // CommandCallbacks requires CommandExecutor to be present so we have 
    // to force callbacks to be empty
    ...callbacks: [] 
): void;
export function attach<T extends CommandInteraction>(
    this: Supersonic,
    payload: CommandPayload,
    ...callbacks: CommandCallbacks<T>
): void;
export function attach<T extends CommandInteraction>(
    this: Supersonic, 
    command: Command<T> | CommandPayload, 
    ...callbacks: [] | CommandCallbacks<T>
): void {
    let commandModule = "data" in command 
        ? command as Command<T> 
        : module.call(this, command, ...callbacks as CommandCallbacks<CommandInteraction>); 
    let commandData = commandModule.data;
    
    let commandExists = false;

    if (commandData.subName || commandData.groupName)
        commandExists = createSubcommand.call(this, commandModule as unknown as Command<ChatInputCommandInteraction>); 

    if (!commandExists)
        registerCommand.call(this, commandModule as Command<CommandInteraction>);
}

export function registerCommand<T extends CommandInteraction>(
    this: Supersonic,
    commandModule: Command<T>
): void {
    const { 
        name, 
        type, 
        guilds 
    } = commandModule.data;
    
    const register = (name: string, type: ApplicationCommandType) => {
        switch (type) {
            case ApplicationCommandType.ChatInput:
                this.commands.chat.set(name, commandModule as unknown as Command<ChatInputCommandInteraction>);
                break;
            case ApplicationCommandType.Message:
                this.commands.message.set(name, commandModule as unknown as Command<MessageContextMenuCommandInteraction>);
                break;
            case ApplicationCommandType.User:
                this.commands.user.set(name, commandModule as unknown as Command<UserContextMenuCommandInteraction>);
                break;
        }
    };

    if (guilds?.length) {
        let primaryKey: string | null = null;
        const guildMap = this.opts.guilds || {};

        for (let i = 0; i < guilds.length; i++) {
            const guild = guilds[i] as string;
            const guildId = guildMap[guild];
            // ApplicationCommandType is 1-indexed, so we need to subtract by 1 to get the correct type
            const key = constructCommandKey(name, getNamedCommandType(type), CommandScope.Guild, guildId);

            if (primaryKey) {
                this.mappings.set(key, primaryKey);
                continue;
            }

            register(key, type);
            primaryKey = key;
            this.mappings.set(key, primaryKey);
        }
    } else {
        const key = constructCommandKey(name, getNamedCommandType(type), CommandScope.Global);

        register(key, type);
        this.mappings.set(key, key);
    }
}

export function createSubcommand(
    this: Supersonic, 
    commandModule: Command<ChatInputCommandInteraction>
): boolean {
    // Returns whether command already exists in Supersonic object
    const commandData = commandModule.data;
    const isGuildBased = isCommandGuildBased.call(this, commandData);
    const guildMap = this.opts.guilds || {};
    // If guild based, the command needs a guild to find its command module - We know there is 
    // at least one guild in commandData.guilds because it is a guild-based command and the 
    // development guild gets added when the command is parsed if the environment is development
    let firstGuild = isGuildBased ? commandData.guilds![0] : undefined;
    if (firstGuild)
        firstGuild = guildMap[firstGuild];

    let existingCommand = getCommand.call(
        this,
        commandData.name, 
        CommandType.Chat, 
        isGuildBased ? CommandScope.Guild : CommandScope.Global,
        firstGuild
    ) as Command<ChatInputCommandInteraction>;

    if (commandData.groupName && commandData.subName) {
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

            if (existingGroup !== -1) {
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

export function parseCommandPayload(this: Supersonic, payload: CommandPayload): CommandData {
    let commandData = {} as CommandData;

    commandData.type = payload.type || ApplicationCommandType.ChatInput;
    commandData.description = payload.description || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.subDescription = payload.subDescription || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.groupDescription = payload.groupDescription || Defaults.NO_DESCRIPTION_PROVIDED;
    commandData.guilds = payload.guilds;
    commandData.options = [];

    // Add the development guild only if the environment is development, the guilds 
    // array is not an empty array, the development guild exists in guildMap, and 
    // the guilds array does not already include development guild
    const guildMap = this.opts.guilds || {};
    if (
        this.environment === Environment.Development
        && !(commandData.guilds && commandData.guilds.length === 0) 
        && guildMap[Defaults.DEVELOPMENT_GUILD_NAME]
        && !commandData.guilds?.includes(Defaults.DEVELOPMENT_GUILD_NAME) 
    ) {
        (commandData.guilds ??= []).push(Defaults.DEVELOPMENT_GUILD_NAME);
    }

    if (
        payload.command.startsWith("m")
        || payload.command.startsWith("message")
        || payload.command.startsWith("u")
        || payload.command.startsWith("user")
    ) 
        parseUiCommandShorthand(payload.command, commandData);
    else
        parseCommandShorthand(payload.command, commandData);

    const optionMap = new Map<string, CommandDataOption>();
    commandData.options.forEach(opt => optionMap.set(opt.name, opt));

    for (const option of payload.options || []) {
        let commandOption = optionMap.get(option.name);

        if (!commandOption) {
            commandOption = {
                name: option.name
            } as CommandDataOption;
            
            commandData.options.push(commandOption);
            optionMap.set(option.name, commandOption);
        }

        if (option.type) commandOption.type = option.type;
        if (option.required) commandOption.required = option.required;
        if (option.autocomplete) commandOption.autocomplete = option.autocomplete;
        commandOption.description = option.description || Defaults.NO_DESCRIPTION_PROVIDED;
        commandOption.channelTypes = option.channelTypes;
        commandOption.choices = option.choices;
        
        if (commandOption.type === ApplicationCommandOptionType.String) {
            if (option.min) commandOption.minLength = option.min;
            if (option.max) commandOption.maxLength = option.max;
        } else if (commandOption.type === ApplicationCommandOptionType.Integer) {
            if (option.min) commandOption.minValue = option.min;
            if (option.max) commandOption.maxValue = option.max;
        }
    }

    return commandData;
}

export function parseCommandShorthand(
    command: string, 
    commandData: CommandData
): void {
    const SHORTHAND_REGEX = /^\/([\w-]{1,32})(?::([\w-]{1,32})(?::([\w-]{1,32}))?)?((?:\s[<\[][\w-]{1,32}:(?:string|int|bool|user|channel|role|mentionable|number|attachment)(?::(?:min|max)=\d+){0,2}[\]>])*)((?:\s-\w+)*)$/;

    const commandTokens = SHORTHAND_REGEX.exec(command) as string[] | null;

    if (!commandTokens)
        return;

    const [
        ,
        name,
        groupSubName,
        subName,
        options,
        flags
    ] = commandTokens;
    
    commandData.name = name!;

    if (subName) {
        commandData.groupName = groupSubName as string;
        commandData.subName = subName;
    } else if (groupSubName) {
        commandData.subName = groupSubName;
    }

    if (options) {
        const OPTION_REGEX = /[<\[]([\w-]{1,32}):(\w+)((?::(?:min|max)=\d+){0,2})[\]>]/g;
        let matchedOption: RegExpExecArray | null;

        while (matchedOption = OPTION_REGEX.exec(options)) {
            const [
                option,
                optionName,
                optionType,
                optionBounds
            ] = matchedOption;

            let commandOption = {
                name: optionName,
                type: OptionType[optionType as keyof typeof OptionType],
                required: option.startsWith("<"),
                description: Defaults.NO_DESCRIPTION_PROVIDED
            } as CommandDataOption;

            if (optionBounds) {
                const bounds: Record<string, number> = {};
                
                // regex includes the `:` at the beginning
                optionBounds.substring(1).split(":").forEach(bound => {
                    const [key, value] = bound.split("=");
                    bounds[key as string] = parseInt(value as string);
                })

                if (commandOption.type === ApplicationCommandOptionType.String) {
                    commandOption.minLength = bounds["min"];
                    commandOption.maxLength = bounds["max"];
                } else if (commandOption.type === ApplicationCommandOptionType.Integer) {
                    commandOption.minValue = bounds["min"];
                    commandOption.maxValue = bounds["max"];
                }
            }

            commandData.options.push(commandOption);
        }
    }

    if (flags) 
        parseFlags(flags, commandData);
}

export function parseUiCommandShorthand(
    command: string,
    commandData: CommandData
): void {
    const UI_SHORTHAND_REGEX = /^(m|message|u|user)\/(\[[\w\s-]{1,32}\])((?:\s-\w+)+)*$/;

    const commandTokens = UI_SHORTHAND_REGEX.exec(command) as string[] | null;

    if (!commandTokens)
        return

    let [
        ,
        type,
        name,
        flags
    ] = commandTokens;

    commandData.name = name!.substring(0, name!.length - 1);
    commandData.type = type!.startsWith("m")
        ? ApplicationCommandType.Message
        : ApplicationCommandType.User;

    if (flags) 
        parseFlags(flags, commandData);
}

function parseFlags(
    flags: string,
    commandData: CommandData
): void {
    const flagList = flags.trim().split(" ");

    for (const flag of flagList) {
        const flagName = flag.substring(1);

        switch (flagName) {
            case "nsfw":
                commandData.nsfw = true;
                break;
        }
    }
}
