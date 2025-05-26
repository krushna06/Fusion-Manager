import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getTradeByMessageId, updateTradeStatus, addTradeOffer, getTradeOffers, updateTradeOffer } from '../../database/models/trade.js';
import { updateTradeMessage } from '../../utils/updateTradeMessage.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;

    const { customId } = interaction;

    if (customId.startsWith('accept_trade_')) {
      await handleTradeAccept(interaction);
    }
    else if (customId.startsWith('confirm_trade_')) {
      await handleTradeConfirmation(interaction);
    }
    else if (customId.startsWith('reject_trade_')) {
      await handleTradeRejection(interaction);
    }
  }
};

async function handleTradeAccept(interaction) {
  const messageId = interaction.customId.replace('accept_trade_', '');
  
  try {
    const trade = await getTradeByMessageId(messageId);
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        ephemeral: true
      });
    }

    if (interaction.user.id === trade.user_id) {
      return interaction.reply({
        content: 'You cannot accept your own trade.',
        ephemeral: true
      });
    }

    try {
      await addTradeOffer(trade.id, interaction.user.id, 'pending');
      
      try {
        const channel = await interaction.client.channels.fetch(trade.channel_id);
        if (!channel) {
          console.warn(`Channel ${trade.channel_id} not found`);
        } else {
          try {
            const message = await channel.messages.fetch(trade.message_id);
            if (message) {
              await updateTradeMessage(message, trade);
            }
          } catch (messageError) {
          }
        }
      } catch (channelError) {
      }
      
      try {
        const dmChannel = await interaction.client.users.createDM(trade.user_id);
        await dmChannel.send({
          content: `<@${interaction.user.id}> wants to accept your trade!`,
          embeds: [
            new EmbedBuilder()
              .setTitle('🔄 Trade Acceptance')
              .addFields(
                { name: 'Looking For', value: trade.looking_for || 'Not specified', inline: true },
                { name: 'Offering', value: trade.offering || 'Not specified', inline: true },
                { name: 'Accepted by', value: `<@${interaction.user.id}>`, inline: false },
                { 
                  name: 'Trade Link', 
                  value: `[Jump to Trade](https://discord.com/channels/${interaction.guild?.id || '@me'}/${trade.channel_id || 'DM'}/${trade.message_id || 'message'})`,
                  inline: false
                }
              )
              .setFooter({ text: `Trade ID: ${trade.id}` })
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`confirm_trade_${trade.message_id || '0'}_${interaction.user.id}`)
                .setLabel('Confirm Trade')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`reject_trade_${trade.message_id || '0'}_${interaction.user.id}`)
                .setLabel('Reject')
                .setStyle(ButtonStyle.Danger)
            )
          ]
        });

        await interaction.reply({
          content: 'Your trade offer has been sent to the trade creator!',
          ephemeral: true,
          flags: 1 << 6
        });
      } catch (dmError) {
        console.error('Error sending DM:', dmError);
        await interaction.reply({
          content: 'I was unable to send a DM to the trade creator. Please ask them to enable DMs from server members.',
          ephemeral: true,
          flags: 1 << 6
        });
      }
      
    } catch (error) {
      console.error('Error processing trade acceptance:', error);
      await interaction.reply({
        content: 'An error occurred while processing your trade acceptance. Please try again later.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error fetching trade:', error);
    await interaction.reply({
      content: 'An error occurred while fetching trade details. Please try again later.',
      ephemeral: true
    });
  }
}

async function handleTradeConfirmation(interaction) {
  const [_, messageId, userId] = interaction.customId.match(/confirm_trade_(\d+)_(\d+)/) || [];
  
  if (!messageId || !userId) {
    return interaction.reply({
      content: 'Invalid trade confirmation request.',
      ephemeral: true,
      flags: 1 << 6
    });
  }
  
  try {
    const trade = await getTradeByMessageId(messageId);
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    if (interaction.user.id !== trade.user_id) {
      return interaction.reply({
        content: 'Only the trade creator can confirm this trade.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    try {
      const updatedTrade = await updateTradeStatus(messageId, 'completed', interaction.user.id, 'Trade completed');
      
      if (!updatedTrade) {
        return interaction.reply({
          content: 'Failed to update trade status. Please try again.',
          ephemeral: true,
          flags: 1 << 6
        });
      }
      
      await updateTradeOffer(trade.id, userId, 'accepted');
      
      try {
        const channel = await interaction.client.channels.fetch(updatedTrade.channel_id).catch(() => null);
        if (channel) {
          channel.messages.fetch(updatedTrade.message_id)
            .then(message => updateTradeMessage(message, updatedTrade))
            .catch(() => {});
        }
      } catch (error) {
      }
    } catch (updateError) {
      console.error('Error updating trade status:', updateError);
    }
    
    try {
      const tradeAccepter = await interaction.client.users.fetch(userId);
      
      await interaction.reply({
        content: `✅ You have confirmed the trade with ${tradeAccepter.tag}!`,
        ephemeral: true,
        flags: 1 << 6
      });
      
      try {
        await tradeAccepter.send({
          content: `✅ <@${trade.user_id}> has confirmed your trade!`,
          embeds: [
            new EmbedBuilder()
              .setTitle('✅ Trade Confirmed')
              .addFields(
                { name: 'Looking For', value: trade.looking_for || 'Not specified', inline: true },
                { name: 'Offering', value: trade.offering || 'Not specified', inline: true },
                { 
                  name: 'Trade Link', 
                  value: `[Jump to Trade](https://discord.com/channels/${interaction.guild?.id || '@me'}/${trade.channel_id || 'DM'}/${trade.message_id || 'message'})`,
                  inline: false
                }
              )
              .setFooter({ text: `Trade ID: ${trade.id}` })
              .setTimestamp()
          ]
        });
      } catch (dmError) {
        console.error('Error sending DM to trade accepter:', dmError);
      }
      
    } catch (userError) {
      console.error('Error fetching user or sending confirmation:', userError);
      await interaction.reply({
        content: '✅ Trade confirmed, but there was an error notifying the other user.',
        ephemeral: true,
        flags: 1 << 6
      });
    }
    
  } catch (error) {
    console.error('Error confirming trade:', error);
    try {
      await interaction.reply({
        content: 'An error occurred while confirming the trade. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      });
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
}

async function handleTradeRejection(interaction) {
  const [_, messageId, userId] = interaction.customId.match(/reject_trade_(\d+)_(\d+)/) || [];
  
  if (!messageId || !userId) {
    return interaction.reply({
      content: 'Invalid trade rejection request.',
      ephemeral: true,
      flags: 1 << 6
    });
  }
  
  try {
    const trade = await getTradeByMessageId(messageId);
    if (!trade) {
      return interaction.reply({
        content: 'Trade not found. It may have been deleted or already processed.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    if (interaction.user.id !== trade.user_id) {
      return interaction.reply({
        content: 'Only the trade creator can reject this trade.',
        ephemeral: true,
        flags: 1 << 6
      });
    }

    try {
      await updateTradeOffer(trade.id, userId, 'rejected');
      
      const updatedTrade = await getTradeByMessageId(messageId);
      
      if (updatedTrade) {
        try {
          const channel = await interaction.client.channels.fetch(updatedTrade.channel_id).catch(() => null);
          if (channel) {
            channel.messages.fetch(updatedTrade.message_id)
              .then(message => updateTradeMessage(message, updatedTrade).catch(console.error))
              .catch(() => {
                console.log(`[Rejection] Message ${updatedTrade.message_id} not found in channel ${updatedTrade.channel_id}, but trade is still processed`);
              });
          }
        } catch (error) {
          console.error('Error in rejection message update process:', error);
        }
      }
    } catch (updateError) {
      console.error('Error updating trade status for rejection:', updateError);
    }
    
    try {
      const tradeAccepter = await interaction.client.users.fetch(userId);
      
      try {
        await tradeAccepter.send({
          content: `❌ <@${trade.user_id}> has rejected your trade offer.`,
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Trade Rejected')
              .setDescription('The trade creator has rejected your offer.')
              .addFields(
                { name: 'Looking For', value: trade.looking_for || 'Not specified' },
                { name: 'Offering', value: trade.offering || 'Not specified' }
              )
          ]
        });
      } catch (dmError) {
        console.error('Error sending rejection DM:', dmError);
      }
      
      await interaction.reply({
        content: `You have rejected the trade offer from ${tradeAccepter.tag}.`,
        ephemeral: true,
        flags: 1 << 6
      });
      
    } catch (userError) {
      console.error('Error fetching user for rejection:', userError);
      await interaction.reply({
        content: 'You have rejected the trade offer.',
        ephemeral: true,
        flags: 1 << 6
      });
    }
    
  } catch (error) {
    console.error('Error rejecting trade:', error);
    try {
      await interaction.reply({
        content: 'An error occurred while rejecting the trade. Please try again later.',
        ephemeral: true,
        flags: 1 << 6
      });
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
}
