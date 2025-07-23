import { 
    APIActionRowComponent, 
    APIButtonComponent, 
    APIButtonComponentWithCustomId, 
    APIEmbed, 
    APIMessage,
    CommandInteraction,
    ComponentType,
    Message,
    PartialGroupDMChannel,
    TextBasedChannel
} from "discord.js";
import { 
    DynamicPaginationOptions, 
    ListPaginationOptions, 
    Supersonic, 
    StaticPaginationOptions, 
    StaticPaginator, 
    StringListPaginationOptions 
} from "../types";
import { Defaults, PresetPaginationRowList } from "../helpers";

export async function paginate(this: Supersonic, options: DynamicPaginationOptions) {
    let embed = options.embedOptions;
    const interaction = options.interaction;
    const onInitial = options.onInitial;
    const onPageChange = options.onPageChange;
    
    let row = 
        options.customRow as APIActionRowComponent<APIButtonComponentWithCustomId> || 
        options.rowType ? 
            PresetPaginationRowList[options.rowType as string] as APIActionRowComponent<APIButtonComponentWithCustomId> : 
            PresetPaginationRowList["basic"] as APIActionRowComponent<APIButtonComponentWithCustomId>;

    if (options.maxPages <= 1)
        options.maxPages = 1;

    if (options.rowType === "page-number")
        (row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID)
        ] as APIButtonComponentWithCustomId).label = `Page ${(options.pageStart || 0) + 1} of ${options.maxPages <= 1 ? 1 : options.maxPages}`;

    disableNavigationOnEnd(
        "preliminary",
        options.pageStart || 0,
        0,
        options.maxPages-1,
        row,
        options.rowType
    );

    const message = await onInitial(embed, row);

    // TODO: add warning indicating that pagination is unneeded here
    if (options.maxPages === 1)
        return;

    return collect(
        interaction, 
        message, 
        options.timeout || this.opts.timeout || 60000,
        options.pageStart || 0, 
        0, 
        options.maxPages-1, 
        (page: number) => {
            onPageChange(embed, row, page);
        },
        row,
        options.rowType
    );
}

export async function paginateStatic(this: Supersonic, options: StaticPaginationOptions) {
    let paginator = (async function(this: Supersonic) {
        let embeds = paginator.embeds;
        const interaction = options.interaction;

        let row = 
            options.customRow as APIActionRowComponent<APIButtonComponentWithCustomId> || 
            options.rowType ? 
                PresetPaginationRowList[options.rowType as string] as APIActionRowComponent<APIButtonComponentWithCustomId> : 
                PresetPaginationRowList["basic"] as APIActionRowComponent<APIButtonComponentWithCustomId>;

        if (options.rowType === "page-number")
            (row.components[
                row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID)
            ] as APIButtonComponentWithCustomId).label = `Page ${(options.pageStart || 0) + 1} of ${embeds.length}`;
        
        // TODO: add proper error message
        if (embeds.length === 0) 
            return;
        
        disableNavigationOnEnd(
            "preliminary",
            options.pageStart || 0,
            0,
            embeds.length-1,
            row,
            options.rowType
        );

        const message = await interaction.reply({
            embeds: [embeds[0] as APIEmbed], 
            components: embeds.length === 1 ? undefined : [row],
            fetchReply: true
        });

        if (embeds.length === 1)
            return;

        paginator.collector = collect(
            interaction, 
            message, 
            options.timeout || this.opts.timeout || 60000,
            options.pageStart || 0, 
            0, 
            embeds.length-1, 
            (page: number) => {
                interaction.editReply({
                    embeds: [embeds[page] as APIEmbed],
                    components: [row]
                });
            },
            row,
            options.rowType
        );
    }).bind(this) as StaticPaginator;

    paginator.embeds = options.embeds || [];
    paginator.addEmbed = ((embed: APIEmbed) => {
        paginator.embeds.push(embed);
        return paginator;
    });

    return paginator;
}

export async function paginateList<T>(this: Supersonic, options: ListPaginationOptions<T>) {
    let embed = options.embedOptions;
    let list = options.list;
    let amountPerPage = options.amountPerPage;
    let maxPages = 1;
    const interaction = options.interaction;

    if (options.maxPages)
        maxPages = Math.min(options.maxPages, Math.ceil(list.length / amountPerPage));
    else 
        maxPages = Math.ceil(list.length / amountPerPage);

    if (list.length <= amountPerPage)
        maxPages = 1;

    let row = 
        options.customRow as APIActionRowComponent<APIButtonComponentWithCustomId> || 
        options.rowType ? 
            PresetPaginationRowList[options.rowType as string] as APIActionRowComponent<APIButtonComponentWithCustomId> : 
            PresetPaginationRowList["basic"] as APIActionRowComponent<APIButtonComponentWithCustomId>;

    if (options.rowType === "page-number")
        (row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID)
        ] as APIButtonComponentWithCustomId).label = `Page ${(options.pageStart || 0) + 1} of ${maxPages}`;

    if (embed.fields === undefined)
        embed.fields = [];
    
    embed.fields.push({
        name: options.listName,
        value: list
            .slice(0, amountPerPage)
            .join(options.inline ? options.inline : "\n")
    });

    disableNavigationOnEnd(
        "preliminary",
        options.pageStart || 0,
        0,
        maxPages-1,
        row,
        options.rowType
    );

    const message = await interaction.reply({
        embeds: [embed], 
        components: maxPages === 1 ? undefined : [row],
        fetchReply: true
    });

    if (maxPages === 1)
        return;
    
    return collect(
        interaction, 
        message, 
        options.timeout || this.opts.timeout || 60000,
        options.pageStart || 0,  
        0, 
        maxPages-1, 
        (page: number) => {
            if (embed.fields === undefined)
                embed.fields = [];
    
            embed.fields[embed.fields.findIndex((field) => field.name === options.listName)] = {
                name: options.listName,
                value: list
                    .slice(page * amountPerPage, page * amountPerPage + amountPerPage)
                    .join(options.inline ? options.inline : "\n")
            }
    
            interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        },
        row,
        options.rowType
    );
}

export async function paginateListStr<T>(this: Supersonic, options: StringListPaginationOptions<T>) {
    let list = options.list;
    let amountPerPage = options.amountPerPage;
    let maxPages = 1;
    let formatting = options.formatting;
    const interaction = options.interaction;

    if (options.maxPages)
        maxPages = Math.min(options.maxPages, Math.ceil(list.length / amountPerPage));
    else
        maxPages = Math.ceil(list.length / amountPerPage);

    if (list.length <= amountPerPage)
        maxPages = 1;

    let row = 
        options.customRow as APIActionRowComponent<APIButtonComponentWithCustomId> || 
        options.rowType ? 
            PresetPaginationRowList[options.rowType as string] as APIActionRowComponent<APIButtonComponentWithCustomId> : 
            PresetPaginationRowList["basic"] as APIActionRowComponent<APIButtonComponentWithCustomId>;

    if (options.rowType === "page-number")
        (row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID)
        ] as APIButtonComponentWithCustomId).label = `Page ${(options.pageStart || 0) + 1} of ${maxPages}`;

    let listSelection = list
            .slice(0, amountPerPage)
            .join(options.inline ? options.inline : "\n");
    let content = `\`${options.listName || ""}:\`\n${listSelection}`;

    if (formatting) {
        content = formatting
            .replace("${list}", listSelection)
            .replace("${list_name}", options.listName || "");
    }

    disableNavigationOnEnd(
        "preliminary",
        options.pageStart || 0,
        0,
        maxPages-1,
        row,
        options.rowType
    );

    const message = await interaction.reply({
        content: content,
        components: maxPages === 1 ? undefined : [row],
        fetchReply: true
    });

    if (maxPages === 1)
        return;

    return collect(
        interaction, 
        message, 
        options.timeout || this.opts.timeout || 60000,
        options.pageStart || 0, 
        0, 
        maxPages-1, 
        (page: number) => {
            let listSelection = list
                .slice(page * amountPerPage, page * amountPerPage + amountPerPage)
                .join(options.inline ? options.inline : "\n");
            let content = `\`${options.listName || ""}:\`\n${listSelection}`;

            if (formatting) {
                content = formatting
                    .replace("${list}", listSelection)
                    .replace("${list_name}", options.listName || "");
            }

            interaction.editReply({
                content: content,
                components: [row]
            });
        },
        row,
        options.rowType
    );
}

function collect(
    interaction: CommandInteraction, 
    message: Message<boolean> | APIMessage, 
    timeout: number, 
    pageStart: number,
    minPages: number, 
    maxPages: number, 
    callback: (page: number) => void,
    row: APIActionRowComponent<APIButtonComponentWithCustomId>,
    rowType?: string
) {
    let page = pageStart;

    let forwardButton = row.components[
        row.components.findIndex((component) => component.custom_id === Defaults.NEXT_PAGE_BUTTON_ID)
    ] as APIButtonComponentWithCustomId;
    let backButton = row.components[
        row.components.findIndex((component) => component.custom_id === Defaults.PREVIOUS_PAGE_BUTTON_ID) 
    ] as APIButtonComponentWithCustomId;

    let leftEnd: APIButtonComponentWithCustomId | undefined;
    let rightEnd: APIButtonComponentWithCustomId | undefined;

    if (rowType === "ends") {
        leftEnd = row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.LEFT_END_PAGE_BUTTON_ID)
        ] as APIButtonComponentWithCustomId;
        rightEnd = row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.RIGHT_END_PAGE_BUTTON_ID)
        ] as APIButtonComponentWithCustomId;
    }

    // Exclude<TextBasedChannel, PartialGroupDMChannel> feels a little bit like a hack; if there's 
    // a better way, please fix
    const collector = (interaction.channel as Exclude<TextBasedChannel, PartialGroupDMChannel>)?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        dispose: true,
        message: message,
        time: timeout
    });

    collector?.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) return;
        
        await btn.deferUpdate();

        if (btn.customId === Defaults.PREVIOUS_PAGE_BUTTON_ID) {
            if (page <= minPages) return;

            page--;

            disableNavigationOnEnd(
                "left",
                page,
                minPages,
                maxPages,
                row,
                rowType,
                [forwardButton, backButton, leftEnd, rightEnd]
            )

            if (rowType === "page_number")
                (row.components[
                    row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID)
                ] as APIButtonComponentWithCustomId).label = `Page ${page+1} of ${maxPages+1}`;
        } else if (btn.customId === Defaults.NEXT_PAGE_BUTTON_ID) {
            if (page >= maxPages) return;
            
            page++;

            disableNavigationOnEnd(
                "right",
                page,
                minPages,
                maxPages,
                row,
                rowType,
                [forwardButton, backButton, leftEnd, rightEnd]
            )

            if (rowType === "page_number") {
                let pageNumberLabel = row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID);

                if (pageNumberLabel !== -1) {
                    (row.components[pageNumberLabel] as APIButtonComponentWithCustomId).label = `Page ${page+1} of ${maxPages+1}`;
                }
            }
        } else if (btn.customId === Defaults.LEFT_END_PAGE_BUTTON_ID) {
            page = minPages;
            
            disableNavigationOnEnd(
                "left",
                page,
                minPages,
                maxPages,
                row,
                rowType,
                [forwardButton, backButton, leftEnd, rightEnd]
            )
        } else if (btn.customId === Defaults.RIGHT_END_PAGE_BUTTON_ID) {
            page = maxPages;
            
            disableNavigationOnEnd(
                "right",
                page,
                minPages,
                maxPages,
                row,
                rowType,
                [forwardButton, backButton, leftEnd, rightEnd]
            )
        }

        callback(page);
    })

    return collector;
}

function disableNavigationOnEnd(
    action: "left" | "right" | "preliminary",
    page: number, 
    minPages: number, 
    maxPages: number,
    row?: APIActionRowComponent<APIButtonComponentWithCustomId>, 
    rowType?: string,
    buttons?: [
        APIButtonComponentWithCustomId, 
        APIButtonComponentWithCustomId, 
        APIButtonComponentWithCustomId | undefined, 
        APIButtonComponentWithCustomId | undefined
    ]
) {
    let forwardButton: APIButtonComponent;
    let backButton: APIButtonComponent;
    let leftEnd: APIButtonComponent | undefined;
    let rightEnd: APIButtonComponent | undefined;
    
    if (buttons) {
        [forwardButton, backButton, leftEnd, rightEnd] = buttons;   
    } else {
        row = row as APIActionRowComponent<APIButtonComponentWithCustomId>;

        forwardButton = row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.NEXT_PAGE_BUTTON_ID)
        ] as APIButtonComponent;
        backButton = row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.PREVIOUS_PAGE_BUTTON_ID) 
        ] as APIButtonComponent;

        if (rowType === "ends") {
            leftEnd = row.components[
                row.components.findIndex((component) => component.custom_id === Defaults.LEFT_END_PAGE_BUTTON_ID)
            ] as APIButtonComponent;
            rightEnd = row.components[
                row.components.findIndex((component) => component.custom_id === Defaults.RIGHT_END_PAGE_BUTTON_ID)
            ] as APIButtonComponent;
        }
    }

    if (action === "left") {
        if (page <= minPages && !backButton.disabled) {
            backButton.disabled = true;
        
            if (leftEnd) 
                leftEnd.disabled = true;
        }
        
        if (forwardButton.disabled) {
            forwardButton.disabled = false;
        
            if (rightEnd) 
                rightEnd.disabled = false;
        }
    } else if (action === "right") {
        if (page >= maxPages && !forwardButton.disabled) {
            forwardButton.disabled = true;
            
            if (rightEnd) 
                rightEnd.disabled = true;
        } 
        
        if (backButton.disabled) {
            backButton.disabled = false;
        
            if (leftEnd) 
                leftEnd.disabled = false;
        }
    } else if (action === "preliminary") {
        if (page >= maxPages) {
            forwardButton.disabled = true;

            if (rightEnd)
                rightEnd.disabled = true;
        }

        if (page <= maxPages) {
            backButton.disabled = true;

            if (leftEnd)
                leftEnd.disabled = true;
        }
    }
}