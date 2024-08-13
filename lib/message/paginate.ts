import { 
    APIActionRowComponent, 
    APIButtonComponent, 
    APIButtonComponentWithCustomId, 
    APIEmbed, 
    APIMessage,
    CommandInteraction,
    ComponentType,
    Message
} from "discord.js";
import { 
    DynamicPaginationOptions, 
    ListPaginationOptions, 
    StaticPaginationOptions, 
    StaticPaginator, 
    StringListPaginationOptions 
} from "../types";
import { Defaults, PresetPaginationRowList } from "../helpers";

export async function paginate(options: DynamicPaginationOptions) {
    let embed = options.embed_options;
    const interaction = options.interaction;
    const on_initial = options.on_initial;
    const on_page_change = options.on_page_change;
    
    let row = 
        options.custom_row as APIActionRowComponent<APIButtonComponentWithCustomId> || 
        options.row_type ? 
            PresetPaginationRowList[options.row_type as string] as APIActionRowComponent<APIButtonComponentWithCustomId> : 
            PresetPaginationRowList["basic"] as APIActionRowComponent<APIButtonComponentWithCustomId>;

    if (options.max_pages <= 1)
        options.max_pages = 1;

    if (options.row_type === "page_number") {
        let page_number_label = row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID);

        if (page_number_label !== -1) {
            (row.components[page_number_label] as APIButtonComponent).label = `Page ${(options.page_start || 0) + 1} of ${options.max_pages <= 1 ? 1 : options.max_pages}`;
        }
    }

    disable_navigation_on_end(
        "preliminary",
        options.page_start || 0,
        0,
        options.max_pages-1,
        row,
        options.row_type
    );

    const message = await on_initial(embed, row);

    // TODO: add warning indicating that pagination is unneeded here
    if (options.max_pages === 1)
        return;

    collect(
        interaction, 
        message, 
        options.timeout || this.timeout || 60000,
        options.page_start || 0, 
        0, 
        options.max_pages-1, 
        (page: number) => {
            on_page_change(embed, row, page);
            
            interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        },
        row,
        options.row_type
    )
}

export async function paginate_static(options: StaticPaginationOptions) {
    let paginator = (async function() {
        let embeds = paginator.embeds;
        const interaction = options.interaction;

        let row = 
            options.custom_row as APIActionRowComponent<APIButtonComponentWithCustomId> || 
            options.row_type ? 
                PresetPaginationRowList[options.row_type as string] as APIActionRowComponent<APIButtonComponentWithCustomId> : 
                PresetPaginationRowList["basic"] as APIActionRowComponent<APIButtonComponentWithCustomId>;

        if (options.row_type === "page_number") {
            let page_number_label = row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID);

            if (page_number_label !== -1) {
                (row.components[page_number_label] as APIButtonComponent).label = `Page ${(options.page_start || 0) + 1} of ${embeds.length}`;
            }
        }
        
        // TODO: add proper error message
        if (embeds.length === 0) 
            return;
        
        disable_navigation_on_end(
            "preliminary",
            options.page_start || 0,
            0,
            embeds.length-1,
            row,
            options.row_type
        );

        const message = await interaction.reply({
            embeds: [embeds[0] as APIEmbed], 
            components: embeds.length === 1 ? undefined : [row],
            fetchReply: true
        });

        if (embeds.length === 1)
            return;

        collect(
            interaction, 
            message, 
            options.timeout || this.timeout || 60000,
            options.page_start || 0, 
            0, 
            embeds.length-1, 
            (page: number) => {
                interaction.editReply({
                    embeds: [embeds[page] as APIEmbed],
                    components: [row]
                });
            },
            row,
            options.row_type
        );
    }).bind(this) as StaticPaginator;

    paginator.embeds = options.embeds || [];
    paginator.add_embed = ((embed: APIEmbed) => {
        paginator.embeds.push(embed);
        return paginator;
    });

    return paginator;
}

export async function paginate_list<T>(options: ListPaginationOptions<T>) {
    let embed = options.embed_options;
    let list = options.list;
    let amount_per_page = options.amount_per_page;
    let max_pages = 1;
    const interaction = options.interaction;

    if (options.max_pages)
        max_pages = Math.min(options.max_pages, Math.ceil(list.length / amount_per_page));
    else 
        max_pages = Math.ceil(list.length / amount_per_page);

    if (list.length <= amount_per_page)
        max_pages = 1;

    let row = 
        options.custom_row as APIActionRowComponent<APIButtonComponentWithCustomId> || 
        options.row_type ? 
            PresetPaginationRowList[options.row_type as string] as APIActionRowComponent<APIButtonComponentWithCustomId> : 
            PresetPaginationRowList["basic"] as APIActionRowComponent<APIButtonComponentWithCustomId>;

    if (options.row_type === "page_number") {
        let page_number_label = row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID);

        if (page_number_label !== -1) {
            (row.components[page_number_label] as APIButtonComponent).label = `Page ${(options.page_start || 0) + 1} of ${max_pages}`;
        }
    }

    if (embed.fields === undefined)
        embed.fields = [];
    
    embed.fields.push({
        name: options.list_name,
        value: list
            .slice(0, amount_per_page)
            .join(options.inline ? options.inline : "\n")
    });

    disable_navigation_on_end(
        "preliminary",
        options.page_start || 0,
        0,
        max_pages-1,
        row,
        options.row_type
    );

    const message = await interaction.reply({
        embeds: [embed], 
        components: max_pages === 1 ? undefined : [row],
        fetchReply: true
    });

    if (max_pages === 1)
        return;
    
    collect(
        interaction, 
        message, 
        options.timeout || this.timeout || 60000,
        options.page_start || 0,  
        0, 
        max_pages-1, 
        (page: number) => {
            if (embed.fields === undefined)
                embed.fields = [];
    
            embed.fields[embed.fields.findIndex((field) => field.name === options.list_name)] = {
                name: options.list_name,
                value: list
                    .slice(page * amount_per_page, page * amount_per_page + amount_per_page)
                    .join(options.inline ? options.inline : "\n")
            }
    
            interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        },
        row,
        options.row_type
    );
}

export async function paginate_list_str<T>(options: StringListPaginationOptions<T>) {
    let list = options.list;
    let amount_per_page = options.amount_per_page;
    let max_pages = 1;
    let formatting = options.formatting;
    const interaction = options.interaction;

    if (options.max_pages)
        max_pages = Math.min(options.max_pages, Math.ceil(list.length / amount_per_page));
    else
        max_pages = Math.ceil(list.length / amount_per_page);

    if (list.length <= amount_per_page)
        max_pages = 1;

    let row = 
        options.custom_row as APIActionRowComponent<APIButtonComponentWithCustomId> || 
        options.row_type ? 
            PresetPaginationRowList[options.row_type as string] as APIActionRowComponent<APIButtonComponentWithCustomId> : 
            PresetPaginationRowList["basic"] as APIActionRowComponent<APIButtonComponentWithCustomId>;

    if (options.row_type === "page_number") {
        let page_number_label = row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID);

        if (page_number_label !== -1) {
            (row.components[page_number_label] as APIButtonComponent).label = `Page ${(options.page_start || 0) + 1} of ${max_pages}`;
        }
    }

    let list_selection = list
            .slice(0, amount_per_page)
            .join(options.inline ? options.inline : "\n");
    let content = `\`${options.list_name || ""}:\`\n${list_selection}`;

    if (formatting) {
        content = formatting
            .replace("${list}", list_selection)
            .replace("${list_name}", options.list_name || "");
    }

    disable_navigation_on_end(
        "preliminary",
        options.page_start || 0,
        0,
        max_pages-1,
        row,
        options.row_type
    );

    const message = await interaction.reply({
        content: content,
        components: max_pages === 1 ? undefined : [row],
        fetchReply: true
    });

    if (max_pages === 1)
        return;

    collect(
        interaction, 
        message, 
        options.timeout || this.timeout || 60000,
        options.page_start || 0, 
        0, 
        max_pages-1, 
        (page: number) => {
            let list_selection = list
                .slice(page * amount_per_page, page * amount_per_page + amount_per_page)
                .join(options.inline ? options.inline : "\n");
            let content = `\`${options.list_name || ""}:\`\n${list_selection}`;

            if (formatting) {
                content = formatting
                    .replace("${list}", list_selection)
                    .replace("${list_name}", options.list_name || "");
            }

            interaction.editReply({
                content: content,
                components: [row]
            });
        },
        row,
        options.row_type
    );
}

function collect(
    interaction: CommandInteraction, 
    message: Message<boolean> | APIMessage, 
    timeout: number, 
    page_start: number,
    min_pages: number, 
    max_pages: number, 
    callback: (page: number) => void,
    row: APIActionRowComponent<APIButtonComponentWithCustomId>,
    row_type?: string
) {
    let page = page_start;

    let forward_btn = row.components[
        row.components.findIndex((component) => component.custom_id === Defaults.NEXT_PAGE_BUTTON_ID)
    ] as APIButtonComponentWithCustomId;
    let back_btn = row.components[
        row.components.findIndex((component) => component.custom_id === Defaults.PREVIOUS_PAGE_BUTTON_ID) 
    ] as APIButtonComponentWithCustomId;

    let left_end: APIButtonComponentWithCustomId | undefined;
    let right_end: APIButtonComponentWithCustomId | undefined;

    if (row_type === "ends") {
        left_end = row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.LEFT_END_PAGE_BUTTON_ID)
        ] as APIButtonComponentWithCustomId;
        right_end = row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.RIGHT_END_PAGE_BUTTON_ID)
        ] as APIButtonComponentWithCustomId;
    }

    // TODO: handle interaction.channel === undefined error (likely solution: intents)
    const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        dispose: true,
        message: message,
        time: timeout
    });

    collector?.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) return;
        
        await btn.deferUpdate();

        if (btn.customId === Defaults.PREVIOUS_PAGE_BUTTON_ID) {
            if (page <= min_pages) return;

            page--;

            disable_navigation_on_end(
                "left",
                page,
                min_pages,
                max_pages,
                row,
                row_type,
                [forward_btn, back_btn, left_end, right_end]
            )

            if (row_type === "page_number")
                (row.components[
                    row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID)
                ] as APIButtonComponent).label = `Page ${page+1} of ${max_pages+1}`;
        } else if (btn.customId === Defaults.NEXT_PAGE_BUTTON_ID) {
            if (page >= max_pages) return;
            
            page++;

            disable_navigation_on_end(
                "right",
                page,
                min_pages,
                max_pages,
                row,
                row_type,
                [forward_btn, back_btn, left_end, right_end]
            )

            if (row_type === "page_number") {
                let page_number_label = row.components.findIndex((component) => component.custom_id === Defaults.PAGE_NUMBER_LABEL_ID);

                if (page_number_label !== -1) {
                    (row.components[page_number_label] as APIButtonComponent).label = `Page ${page+1} of ${max_pages+1}`;
                }
            }
        } else if (btn.customId === Defaults.LEFT_END_PAGE_BUTTON_ID) {
            page = min_pages;
            
            disable_navigation_on_end(
                "left",
                page,
                min_pages,
                max_pages,
                row,
                row_type,
                [forward_btn, back_btn, left_end, right_end]
            )
        } else if (btn.customId === Defaults.RIGHT_END_PAGE_BUTTON_ID) {
            page = max_pages;
            
            disable_navigation_on_end(
                "right",
                page,
                min_pages,
                max_pages,
                row,
                row_type,
                [forward_btn, back_btn, left_end, right_end]
            )
        }

        callback(page);
    })
}

function disable_navigation_on_end(
    action: "left" | "right" | "preliminary",
    page: number, 
    min_pages: number, 
    max_pages: number,
    row?: APIActionRowComponent<APIButtonComponentWithCustomId>, 
    row_type?: string,
    buttons?: [
        APIButtonComponentWithCustomId, 
        APIButtonComponentWithCustomId, 
        APIButtonComponentWithCustomId | undefined, 
        APIButtonComponentWithCustomId | undefined
    ]
) {
    let forward_btn: APIButtonComponent;
    let back_btn: APIButtonComponent;
    let left_end: APIButtonComponent | undefined;
    let right_end: APIButtonComponent | undefined;
    
    if (buttons) {
        [forward_btn, back_btn, left_end, right_end] = buttons;   
    } else {
        row = row as APIActionRowComponent<APIButtonComponentWithCustomId>;

        forward_btn = row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.NEXT_PAGE_BUTTON_ID)
        ] as APIButtonComponent;
        back_btn = row.components[
            row.components.findIndex((component) => component.custom_id === Defaults.PREVIOUS_PAGE_BUTTON_ID) 
        ] as APIButtonComponent;

        if (row_type === "ends") {
            left_end = row.components[
                row.components.findIndex((component) => component.custom_id === Defaults.LEFT_END_PAGE_BUTTON_ID)
            ] as APIButtonComponent;
            right_end = row.components[
                row.components.findIndex((component) => component.custom_id === Defaults.RIGHT_END_PAGE_BUTTON_ID)
            ] as APIButtonComponent;
        }
    }

    if (action === "left") {
        if (page <= min_pages && !back_btn.disabled) {
            back_btn.disabled = true;
        
            if (left_end) 
                left_end.disabled = true;
        }
        
        if (forward_btn.disabled) {
            forward_btn.disabled = false;
        
            if (right_end) 
                right_end.disabled = false;
        }
    } else if (action === "right") {
        if (page >= max_pages && !forward_btn.disabled) {
            forward_btn.disabled = true;
            
            if (right_end) 
                right_end.disabled = true;
        } 
        
        if (back_btn.disabled) {
            back_btn.disabled = false;
        
            if (left_end) 
                left_end.disabled = false;
        }
    } else if (action === "preliminary") {
        if (page >= max_pages) {
            forward_btn.disabled = true;

            if (right_end)
                right_end.disabled = true;
        }

        if (page <= min_pages) {
            back_btn.disabled = true;

            if (left_end)
                left_end.disabled = true;
        }
    }
}