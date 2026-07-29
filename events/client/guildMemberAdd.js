import config from '../../config.js';
import { EmbedBuilder } from 'discord.js';

let reconciler;

export function setLinkerReconciler(linkerReconciler) {
  reconciler = linkerReconciler;
}

export default {
  once: false,
  async execute(client, member) {
    if (member.guild.id === config.channels.staffServer.guildId) {
      const onboardingRole = await member.guild.roles.fetch(config.roles.staffServer.onboardingRole).catch(() => null);
      
      if (onboardingRole) {
        try {
          await member.roles.add(onboardingRole);
        } catch (error) {
          console.error(`Failed to add onboarding role to ${member.user.tag}:`, error);
        }
      }
      
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('Welcome to Fusion Network')
        .setDescription('You have been invited to the Fusion Network staff server. Before you get access, there is one quick step to complete.')
        .addFields(
          { name: '📝 Getting set up', value: 'Run /onboard right here in this channel. I will DM you a short form (preferred name, Minecraft IGN, and timezone). It takes under a minute.', inline: false },
          { name: '🔒 Confidentiality', value: 'Everything shared inside this server is confidential, so please do not repeat it anywhere outside, including with former staff. Never share personal details and do not click suspicious links.', inline: false },
          { name: '✅ What happens next', value: 'Once you submit, management reviews your details and sets you up with the right role. Until then, this is the only channel you can see. Sit tight, it will not take long.', inline: false }
        )
        .setColor(0x3498DB)
        .setTimestamp();
      
      try {
        await member.send({ embeds: [welcomeEmbed] });
      } catch (error) {
        console.error(`Failed to send welcome DM to ${member.user.tag}:`, error);
        try {
          const systemChannel = member.guild.systemChannel;
          if (systemChannel) {
            await systemChannel.send({ content: `${member.user}, please check your DMs for the onboarding information!`, embeds: [welcomeEmbed] });
          }
        } catch (channelError) {
          console.error('Failed to send welcome message in system channel:', channelError);
        }
      }
      return;
    }
    
    if (!reconciler) return;
    
    const linkerConfig = reconciler.config;
    if (member.guild.id !== linkerConfig.guildId) return;
    
    try {
      await reconciler.reconcilePair(null, member.id);
    } catch (error) {
      console.error(`member add reconcile failed for ${member.id}`, error);
    }
  }
};
