import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Queue, updateMenuRow } from '../exports.js';

export const data = new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the entire queue')
        
export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    if (!serverQueue) 
        return await interaction.reply({
            content: 'There are no songs queued',
            ephemeral: true
        });

    const song = serverQueue.songs[0];
    serverQueue.songs = [song];


    // Disable shuffle button if needed
    if (!serverQueue.buttons.shuffleButton.data.disabled) {
        let button = serverQueue.buttons.shuffleButton;
        button = button.setDisabled();

    }

    await updateMenuRow(serverQueue);

    return await interaction.reply('The queue has been cleared');
}