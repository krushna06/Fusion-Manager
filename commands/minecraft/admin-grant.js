import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';
import { loadConfig } from '../../utils/linkerConfig.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'admin-grant',
  data: new SlashCommandBuilder()
    .setName('admin-grant')
    .setDescription('Give Donator manually and exempt from auto-removal (even unlinked)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option => option.setName('member').setDescription('Discord member').setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const config = loadConfig();
    const user = interaction.options.getUser("member", true);
    const guild = await reconciler.guild();
    const member = await reconciler.fetchMember(guild, user.id);
    
    if (!member) {
      await interaction.editReply({ embeds: [errEmbed("That member isn't in the server.")] });
      return;
    }
    
    await db.addDonatorGrant(user.id, interaction.user.id);
    let roleNote = "";
    
    try {
      await member.roles.add(config.donatorRoleId, "FusionLink manual donator grant");
    } catch {
      roleNote = " (couldn't add the role — check the bot's role is above Donator; the exemption is still saved)";
    }
    
    await db.audit("manual_grant", null, null, user.id, `by ${interaction.user.id}`);
    await reconciler.dmDonatorGranted(member);
    await reconciler.log(`🎀 Manual Donator granted to <@${user.id}> by <@${interaction.user.id}> — exempt from auto-removal`);
    
    await interaction.editReply({
      embeds: [
        okEmbed(`Granted Donator to <@${user.id}> and exempted them from auto-removal. They've been DM'd to link.${roleNote}`),
      ],
    });
  }
};
