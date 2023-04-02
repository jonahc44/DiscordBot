import { SlashCommandBuilder, ChatInputCommandInteraction, codeBlock } from 'discord.js';
import { Queue } from '../exports.js';


export const data = new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Displays the queue')

export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const songs = serverQueue.songs;
    let list = '';

    if (songs.length > 1) {
        for (let i = 0; i <= songs.length; i++) {
            
            if (list.length >= 1850) {
                list = codeBlock(list);
                if (interaction.replied)
                    await interaction.followUp({content: list, ephemeral: true});
                else
                    await interaction.reply({content: list, ephemeral: true});

                list = '';
            }

            if (i === songs.length - 1) {
                list = codeBlock([list, `${i}. ${songs[i].title}`].join('\n'));

                if (interaction.replied)
                    return await interaction.followUp({content: list, ephemeral: true});
                else
                    return await interaction.reply({content: list, ephemeral: true});
            } else if (songs[i] && i !== 0) {
                list = [list, `${i}. ${songs[i].title}`].join('\n');
            }
        }
    } else {
        await interaction.reply({
            content: 'There are no songs queued',
            ephemeral: true
        });
    }
}