import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import ytpl from 'ytpl';
import fs from 'node:fs';
import { execute as playItem } from './play.js';
import { updateMenuRow, prepAudio, Queue } from '../exports.js';


export const data = new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffles the current queue')
    .addStringOption(option =>
        option
            .setName('link')
            .setDescription('Pre-shuffles and adds to the queue a playlist/album')
            .setRequired(false)
    )

export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const arg = interaction.options?.getString('link');

    if (arg) {
        if (ytpl.validateID(arg) || arg.includes('https://open.spotify.com/playlist/') || arg.includes('https://open.spotify.com/album/')) {
            await playItem(interaction, serverQueue);
        } else {
            await interaction.reply({
                content: 'Invalid album/playlist link, please try again',
                ephemeral: true
            });
        }
    } else {
        const queue = serverQueue.songs;

        if (!queue || queue.length < 4) 
            return await interaction.reply({
                content: 'Not enough songs currently queued to shuffle',
                ephemeral: true
            });

        const playing = queue[0];
        queue.shift();

        for (let i = queue.length - 1; i > 1; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }

        queue.unshift(playing);

        await updateMenuRow(serverQueue);

        if(fs.existsSync(`./guilds/${interaction.guildId}/next_audio.mp4`))
            await fs.promises.unlink(`./guilds/${interaction.guildId}/next_audio.mp4`);

        await prepAudio(interaction, serverQueue);

        await interaction.reply('The queue has been shuffled');
    }
}