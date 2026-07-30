import { handleSuggestionButton } from './buttons/suggestionButton.js';
import { handleTradeButton } from './buttons/tradeButton.js';
import { handleStaffApplicationButton } from './buttons/staffApplicationButton.js';
import { handleStaffAppDecisionButton } from './buttons/staffAppDecisionButton.js';
import { handleStaffAppStepButton } from './buttons/staffAppStepButtons.js';
import { handleLOAButton } from './buttons/loaButton.js';
import { handleProofButton } from './buttons/proofButton.js';
import { PermissionsBitField } from 'discord.js';
import config from '../config.js';

export async function handleButtonInteraction(interaction) {
  if (!interaction.isButton()) {
    return;
  }
  
  try {
    if (interaction.customId.startsWith('suggestion_')) {
      return await handleSuggestionButton(interaction);
    }
    
    if (interaction.customId.startsWith('accept_trade_') || 
        interaction.customId.startsWith('confirm_trade_') || 
        interaction.customId.startsWith('reject_trade_') ||
        interaction.customId.startsWith('counter_offer_') ||
        interaction.customId.startsWith('confirm_counter_') ||
        interaction.customId.startsWith('reject_counter_')) {
      console.log('Routing to trade button handler');
      return await handleTradeButton(interaction);
    }
    
    if (interaction.customId === 'staff_apply_button') {
      return await handleStaffApplicationButton(interaction);
    }
    
    if (interaction.customId.startsWith('staff_accept_') || interaction.customId.startsWith('staff_reject_') || interaction.customId.startsWith('staff_bgcheck_')) {
      return await handleStaffAppDecisionButton(interaction);
    }
    
    if (interaction.customId.startsWith('staff_close_')) {
      return await handleStaffAppDecisionButton(interaction);
    }
    
    if (interaction.customId.startsWith('staff_app_step')) {
      return await handleStaffAppStepButton(interaction);
    }
    
    if (interaction.customId.startsWith('loa_explain_') || 
        interaction.customId.startsWith('loa_approve_') || 
        interaction.customId.startsWith('loa_deny_')) {
      return await handleLOAButton(interaction);
    }
    
    if (interaction.customId.startsWith('attach_proof_')) {
      return await handleProofButton(interaction);
    }
    
    if (interaction.customId.startsWith('staff_onboarding_')) {
      await interaction.deferUpdate();
      
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.editReply({ 
          content: 'Only administrators can use these buttons.' 
        });
      }
      
      const parts = interaction.customId.split('_');
      const action = parts[2];
      const targetUserId = parts[3];
      
      if (action === 'accept') {
        try {
          const guild = await interaction.client.guilds.fetch(config.channels.staffServer.guildId);
          const member = await guild.members.fetch(targetUserId).catch(() => null);
          
          if (!member) {
            return interaction.editReply({ 
              content: 'User not found in the staff server.' 
            });
          }
          
          const botMember = await guild.members.fetch(interaction.client.user.id);
          const staffRoleIds = config.roles.mainServer.staffRole;
          const staffMemberRoleIds = config.roles.staffServer.staffMemberRole;
          
          if (staffRoleIds && Array.isArray(staffRoleIds)) {
            for (const roleId of staffRoleIds) {
              if (roleId) {
                const role = await guild.roles.fetch(roleId).catch(() => null);
                if (role) {
                  if (role.position >= botMember.roles.highest.position) {
                    console.error(`Cannot add role ${role.name}: Bot's highest role is not above this role`);
                    continue;
                  }
                  await member.roles.add(role);
                }
              }
            }
          }
          
          const staffMemberRoles = Array.isArray(staffMemberRoleIds) ? staffMemberRoleIds : [staffMemberRoleIds];
          for (const roleId of staffMemberRoles) {
            if (roleId) {
              const role = await guild.roles.fetch(roleId).catch(() => null);
              if (role) {
                if (role.position >= botMember.roles.highest.position) {
                  console.error(`Cannot add staff member role ${role.name}: Bot's highest role is not above this role`);
                  continue;
                }
                await member.roles.add(role);
              }
            }
          }
          
          const onboardingRole = await guild.roles.fetch(config.roles.staffServer.onboardingRole).catch(() => null);
          if (onboardingRole && member.roles.cache.has(onboardingRole.id)) {
            await member.roles.remove(onboardingRole);
          }
          
          await interaction.editReply({
            content: '✅ Accepted',
            components: []
          });
          
          await interaction.followUp({
            content: `Staff role has been assigned to ${member.user.tag}.`,
            flags: 64
          });
          
          try {
            await member.send({
              content: '🎉 Your staff onboarding has been accepted! Welcome to the Fusion Network staff team. You now have access to the staff channels.'
            });
          } catch (dmError) {
            console.error('Failed to send DM to user:', dmError);
          }
        } catch (error) {
          console.error('Error accepting onboarding:', error);
          await interaction.editReply({ 
            content: 'An error occurred while accepting the onboarding.' 
          });
        }
      } else if (action === 'deny') {
        try {
          const guild = await interaction.client.guilds.fetch(config.channels.staffServer.guildId);
          const member = await guild.members.fetch(targetUserId).catch(() => null);
          
          if (member) {
            try {
              await member.send({
                content: '❌ Your staff onboarding has been denied. If you believe this is a mistake, please contact management.'
              });
            } catch (dmError) {
              console.error('Failed to send DM to user:', dmError);
            }
            
            await member.kick('Staff onboarding denied');
          }
          
          await interaction.editReply({
            content: '❌ Denied',
            components: []
          });
          
          await interaction.followUp({
            content: `Denied by ${interaction.user.tag}. User has been kicked from the server.`,
            flags: 64
          });
        } catch (error) {
          console.error('Error denying onboarding:', error);
          await interaction.editReply({ 
            content: 'An error occurred while denying the onboarding.' 
          });
        }
      }
      return;
    }
    
    console.log('No handler found for button:', interaction.customId);
  } catch (error) {
    console.error('Error in button handler:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      }).catch(console.error);
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ An error occurred while processing your request. Please try again later.'
      }).catch(console.error);
    }
  }
}
