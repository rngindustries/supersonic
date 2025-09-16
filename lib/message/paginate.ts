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
    // onInitial is the function to execute on initial pagination and onPageChange is the function to execute when
    // the user navigates forward or backward - paginate() does not update the interaction message after pagination 
    // changes; it is the developer's responsibility to do so within the onInitial and onPageChange functions
    const onInitial = options.onInitial;
    const onPageChange = options.onPageChange;
    
    // Pagination buttons - preset rows are preferred, but developers can provide a custom row using options.customRow
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

    // Disable right or left buttons depending on what page the user is on 
    disableNavigationOnEnd(
        "preliminary",
        options.pageStart || 0,
        0,
        options.maxPages-1,
        row,
        options.rowType
    );

    // Currently, pagination requires the developer to return the reply Message, but we should probably change this and 
    // make pagination fetch the reply instead 
    const message = await onInitial(embed, row);

    if (options.maxPages === 1)
        // TODO: add warning indicating that pagination is unneeded here
        return;

    // Create a message interaction collector and listen for button clicks - returns the interaction collector
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
    // Static pagination provides a way to pass defined embeds instead of a function that modifies the embed
    // based on page change and returns a "paginator" that allows the developer to add more embeds to the list 

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
        
        if (embeds.length === 0) 
            // TODO: add error message explaining that the paginator has no embeds to send 
            return;
        
        // Disable right or left buttons depending on what page the user is on 
        disableNavigationOnEnd(
            "preliminary",
            options.pageStart || 0,
            0,
            embeds.length-1,
            row,
            options.rowType
        );

        // Send the first embed and get the Message  
        let message = (await interaction.reply({
            embeds: [embeds[0] as APIEmbed], 
            components: embeds.length === 1 ? undefined : [row],
            withResponse: true
        })).resource?.message as Message;

        if (embeds.length === 1)
            // TODO: add warning explaining that pagination is unneeded here
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
    // Paginate an array of strings based on a specified amount per page using embeds
    let embed = options.embedOptions;
    let list = options.list;
    let amountPerPage = options.amountPerPage;
    let maxPages = 1;
    const interaction = options.interaction;

    // maxPages is optional, but a developer may provide a max number of pages that cuts off the data
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

    // Disable right or left buttons depending on what page the user is on 
    disableNavigationOnEnd(
        "preliminary",
        options.pageStart || 0,
        0,
        maxPages-1,
        row,
        options.rowType
    );

    const message = (await interaction.reply({
        embeds: [embed], 
        components: maxPages === 1 ? undefined : [row],
        withResponse: true
    })).resource?.message as Message;

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
    
            // Modify only the field that corresponds to the pagination list
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
    // Paginate an array of strings based on a specified amount per page within a message
    let list = options.list;
    let amountPerPage = options.amountPerPage;
    let maxPages = 1;
    let formatting = options.formatting;
    const interaction = options.interaction;

    // maxPages is optional, but a developer may provide a max number of pages that cuts off the data
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

    // A developer may have a custom format for the pagination message - the format must include `${list}`, which will be replaced 
    // by the list, and `${list_name}`, which will be replaced by the list name
    if (formatting)
        content = formatting
            .replace("${list}", listSelection)
            .replace("${list_name}", options.listName || "");

    // Disable right or left buttons depending on what page the user is on 
    disableNavigationOnEnd(
        "preliminary",
        options.pageStart || 0,
        0,
        maxPages-1,
        row,
        options.rowType
    );

    const message = (await interaction.reply({
        content: content,
        components: maxPages === 1 ? undefined : [row],
        withResponse: true
    })).resource?.message as Message;

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

    // Create message component collector and listen to button component clicks 
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

            // Disable left buttons if the user is on the first page  
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

            // Disable right buttons if the user is on the last page 
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

        // Run onPageChange callback after page change - all pagination methods, even those without an 
        // onPageChange parameter, rely on onPageChange under the hood
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