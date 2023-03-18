import { AudioPlayerStatus } from '@discordjs/voice';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Queue, updateMessage } from '../exports.js';

export const data = new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pauses the audio')

export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {      
    const player = serverQueue.player;
    const status = player?.state.status;

    if (!serverQueue.player || status === AudioPlayerStatus.AutoPaused || status === AudioPlayerStatus.Idle || status === AudioPlayerStatus.Paused)
        return await interaction.reply({
            content: 'There are no songs currently playing',
            ephemeral: true
    });

    player?.pause();

    let button = serverQueue.buttons.playPauseButton;
    button = button.setEmoji('▶️');

    await interaction.reply(`**${serverQueue.songs[0].title}** has been paused`);
    await updateMessage(serverQueue);
}