import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { okEmbed } from '../../utils/linkerEmbeds.js';
import { loadConfig } from '../../utils/linkerConfig.js';

let db, reconciler;

export function setLinkerDependencies(linkerDb, linkerReconciler) {
  db = linkerDb;
  reconciler = linkerReconciler;
}

export default {
  name: 'admin-ungrant',
  data: new SlashCommandBuilder()
    .setName('admin-ungrant')
    .setDescription('Remove a manual Donator grant so normal link-based sync applies again')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option => option.setName('member').setDescription('Discord member').setRequired(true))
    .addBooleanOption(option => option.setName('remove_role').setDescription('Also remove the Donator role now')),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const config = loadConfig();
    const user = interaction.options.getUser("member", true);
    const removeRole = interaction.options.getBoolean("remove_role") ?? false;
    const existed = await db.removeDonatorGrant(user.id);
    let roleNote = "";
    
    if (removeRole) {
      const guild = await reconciler.guild();
      const member = await reconciler.fetchMember(guild, user.id);
      if (member) {
        try {
          await member.roles.remove(config.donatorRoleId, "FusionLink manual ungrant");
          roleNote = " and removed the role";
        } catch {
          roleNote = " (couldn't remove the role — check role hierarchy)";
        }
      }
    }
    
    await db.audit("manual_ungrant", null, null, user.id, `by ${interaction.user.id}`);
    await reconciler.log(`🧹 Manual Donator grant removed for <@${user.id}> by <@${interaction.user.id}>`);
    
    const head = existed
      ? `Removed the manual grant/exemption for <@${user.id}>${roleNote}. Normal link-based sync now applies.`
      : `<@${user.id}> had no manual grant${roleNote}. Normal link-based sync applies.`;
    
    await interaction.editReply({ embeds: [okEmbed(head)] });
  }
};
