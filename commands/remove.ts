import { SlashCommandBuilder, BaseInteraction, StringSelectMenuInteraction, bold, ChatInputCommandInteraction, CacheType } from "discord.js";
import fs from 'node:fs';
import { updateMenuRow, Queue, prepAudio } from "../exports.js";

export const data = new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Removes up to 5 specified items from the queue')
    .addIntegerOption(option => 
        option
            .setName('item1')
            .setDescription('Number of item in the queue that you want removed')
            .setRequired(true),
            )
    .addIntegerOption(option => 
        option
            .setName('item2')
            .setDescription('Number of second item in the queue that you want removed')
            .setRequired(false)
            )
    .addIntegerOption(option => 
        option
            .setName('item3')
            .setDescription('Number of third item in the queue that you want removed')
            .setRequired(false)
            )
    .addIntegerOption(option => 
        option
            .setName('item4')
            .setDescription('Number of fourth item in the queue that you want removed')
            .setRequired(false)
            )
    .addIntegerOption(option => 
        option
            .setName('item5')
            .setDescription('Number of fifth item in the queue that you want removed')
            .setRequired(false)
    );

export async function execute(interaction: BaseInteraction, serverQueue: Queue) {
    let args: any[];

    if (interaction.isStringSelectMenu()) {
        const int = interaction as StringSelectMenuInteraction;
        args = [Number(int.values[0])];

        if (args[0] === 1 && fs.existsSync(`./guilds/${interaction.guildId}/next_audio.mp4`)) 
            await fs.promises.unlink(`./guilds/${interaction.guildId}/next_audio.mp4`);

        await int.reply(`${bold(serverQueue.songs[args[0]].title)} has been removed from the queue`);
        serverQueue.songs.splice(args[0], 1);
        serverQueue.songs.filter(x => x !== undefined);
    } else {
        const int = interaction as ChatInputCommandInteraction;

        if (serverQueue.songs.length < 2) 
            return await int.reply({
                content: 'There are no songs queued',
                ephemeral: true
            });

        const options = int.options;
        args = [
            options.getInteger('item1'),
            options.getInteger('item2'),
            options.getInteger('item3'),
            options.getInteger('item4'),
            options.getInteger('item5'),
        ]
    
    args = args.filter(x => x !== null);
    args = args.filter((item, index) => args.indexOf(item) === index);
    args = args.sort((a, b) => b - a);

    for (let i = 0; i < args.length; i++) {
        if (args[i] === 1 && fs.existsSync(`./guilds/${interaction.guildId}/next_audio.mp4`)) 
            await fs.promises.unlink(`./guilds/${interaction.guildId}/next_audio.mp4`);

        const song = serverQueue.songs[args[i]];

        if (!serverQueue.songs[args[i]]) 
            if (int.replied)
                await int.followUp({
                    content: `${args[i]} is an invalid number`,
                    ephemeral: true
                });
            else 
                await int.reply({
                    content: `${args[i]} is an invalid number`,
                    ephemeral: true
                });
        else {
            if (int.replied)
                await int.followUp({
                    content: `${bold(song.title)} has been removed from the queue`,
                    ephemeral: false
                })
            else
                await int.reply({
                    content: `${bold(song.title)} has been removed from the queue`,
                    ephemeral: false
                })

            serverQueue.songs.splice(args[i], 1);
            serverQueue.songs.filter(x => x !== undefined);
        }
    }
}

    await updateMenuRow(serverQueue);
    await prepAudio(interaction, serverQueue);
}