import { 
    APIActionRowComponent, 
    APIButtonComponent, 
    ButtonStyle,
    ComponentType
} from "discord.js";
import { 
    DynamicPaginationOptions, 
    ListPaginationOptions, 
    StringListPaginationOptions 
} from "../types";

export async function paginate(options: DynamicPaginationOptions) {
    let page = 0;
    let embed = options.embed_options;
    const interaction = options.interaction;
    const on_initial = options.on_initial;
    const on_page_change = options.on_page_change;

    // TODO: add other component choices
    const row: APIActionRowComponent<APIButtonComponent> = {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: "previous_page",
                style: ButtonStyle.Primary,
                label: "Previous"
            },
            {
                type: ComponentType.Button,
                custom_id: "next_page",
                style: ButtonStyle.Primary,
                label: "Next"
            }
        ]
    };

    if (options.max_pages <= 1) {
        options.max_pages = 1;
    }

    const message = await on_initial(embed, row);
    // TODO: handle interaction.channel === undefined error (likely solution: intents)
    const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        dispose: true,
        message: message,
        time: options.timeout || this.timeout || 60000
    });

    collector?.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) return;
        
        await btn.deferUpdate();

        if (btn.customId === "previous_page") {
            if (page <= 0) {
               page = 0;
               return; 
            } 

            page--;
        } else if (btn.customId === "next_page") {
            if (page >= options.max_pages-1) {
                page = options.max_pages-1;
                return;
            }

            page++;
        }

        on_page_change(embed, row, page);

        interaction.editReply({
            embeds: [embed],
            components: options.max_pages === 1 ? undefined : [row]
        });
    })
}

export async function paginate_list<T>(options: ListPaginationOptions<T>) {
    let page = 0;
    let embed = options.embed_options;
    let list = options.list;
    let amount_per_page = options.amount_per_page;
    let max_pages = 1;
    const interaction = options.interaction;

    if (options.max_pages) {
        max_pages = Math.min(options.max_pages, Math.ceil(list.length / amount_per_page));
    } else {
        max_pages = Math.ceil(list.length / amount_per_page);
    }

    let row: APIActionRowComponent<APIButtonComponent> = {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: "previous_page",
                style: ButtonStyle.Primary,
                label: "Previous"
            },
            {
                type: ComponentType.Button,
                custom_id: "next_page",
                style: ButtonStyle.Primary,
                label: "Next"
            }
        ]
    };

    if (list.length <= amount_per_page) {
        max_pages = 1;
    }


    if (embed.fields === undefined)
        embed.fields = [];
    
    embed.fields.push({
        name: options.list_name,
        value: list
            .slice(page * amount_per_page, page * amount_per_page + amount_per_page)
            .join(options.inline ? options.inline : "\n")
    });

    const message = await interaction.reply({
        embeds: [embed], 
        components: max_pages === 1 ? undefined : [row],
        fetchReply: true
    });
    const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        dispose: true,
        message: message,
        time: options.timeout || this.timeout || 60000
    });

    collector?.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) return;
        
        await btn.deferUpdate();

        if (btn.customId === "previous_page") {
            if (page <= 0) {
               page = 0;
               return; 
            } 

            page--;
        } else if (btn.customId === "next_page") {
            if (page >= max_pages-1) {
                page = max_pages-1;
                return;
            }

            page++;
        }

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
            components: max_pages === 1 ? undefined : [row]
        });
    })
}

export async function paginate_list_str<T>(options: StringListPaginationOptions<T>) {
    let page = 0;
    let list = options.list;
    let amount_per_page = options.amount_per_page;
    let max_pages = 1;
    let formatting = options.formatting;
    const interaction = options.interaction;

    if (options.max_pages) {
        max_pages = Math.min(options.max_pages, Math.ceil(list.length / amount_per_page));
    } else {
        max_pages = Math.ceil(list.length / amount_per_page);
    }

    const row: APIActionRowComponent<APIButtonComponent> = {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: "previous_page",
                style: ButtonStyle.Primary,
                label: "Previous"
            },
            {
                type: ComponentType.Button,
                custom_id: "next_page",
                style: ButtonStyle.Primary,
                label: "Next"
            }
        ]
    };

    if (list.length <= amount_per_page) {
        max_pages = 1;
    }

    let list_selection = list
            .slice(page * amount_per_page, page * amount_per_page + amount_per_page)
            .join(options.inline ? options.inline : "\n");
    let content = `\`${options.list_name || ""}:\`\n${list_selection}`;

    if (formatting) {
        content = formatting
            .replace("${list}", list_selection)
            .replace("${list_name}", options.list_name || "");
    }

    const message = await interaction.reply({
        content: content,
        components: max_pages === 1 ? undefined : [row],
        fetchReply: true
    });
    const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        dispose: true,
        message: message,
        time: options.timeout || this.timeout || 60000
    });

    collector?.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) return;
        
        await btn.deferUpdate();

        if (btn.customId === "previous_page") {
            if (page <= 0) {
               page = 0;
               return; 
            } 

            page--;
        } else if (btn.customId === "next_page") {
            if (page >= max_pages-1) {
                page = max_pages-1;
                return;
            }

            page++;
        }

        
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
            components: max_pages === 1 ? undefined : [row]
        });
    })
}