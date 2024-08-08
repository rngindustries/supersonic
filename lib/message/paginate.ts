import { 
    APIActionRowComponent, 
    APIButtonComponent, 
    ButtonStyle,
    ComponentType
} from "discord.js";
import { DynamicPaginationOptions } from "../types";

export async function paginate(options: DynamicPaginationOptions) {
    let page = 0;
    let embed = options.embed_options;
    const interaction = options.interaction;
    const on_initial = options.on_initial;
    const on_page_change = options.on_page_change;

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
            components: [row]
        });
    })
}