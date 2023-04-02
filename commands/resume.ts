import { SlashCommandBuilder, ChatInputCommandInteraction, bold } from 'discord.js';
import { AudioPlayerStatus } from '@discordjs/voice';
import { Queue, updateMessage } from '../exports.js';


export const data = new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resumes the audio');
    
export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const player = serverQueue.player;
    const status = player?.state.status;

    if (!serverQueue.player || status !== AudioPlayerStatus.Paused) 
        return await interaction.reply({
            content: 'There are no songs currently paused',
            ephemeral: true
        });

    player?.unpause();

    let button = serverQueue.buttons.playPauseButton;
    button = button.setEmoji('⏸️');

    await interaction.reply(`Resumed playing ${bold(serverQueue.songs[0].title)}`);
    await updateMessage(serverQueue);
}