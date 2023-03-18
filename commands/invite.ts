import { PermissionsBitField, ChatInputCommandInteraction, OAuth2Scopes, SlashCommandBuilder } from 'discord.js';
import { Queue } from '../exports.js';


export const data = new SlashCommandBuilder()
    .setName('invite')
    .setDescription("Generates Music Man's invite link")

export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const link = serverQueue.client.generateInvite({
        permissions: [
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
            PermissionsBitField.Flags.UseVAD,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.ManageWebhooks
        ],
        scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands]
    })

    interaction.reply({
        content: `Invite Link: ${link}`,
        ephemeral: true
    })
}
