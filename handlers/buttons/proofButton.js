import { getModerationProofRequestByMessageId, updateModerationProofRequest } from '../../database/mainDb.js';
import { showProofModal } from '../modals/proofModal.js';
import { getDirectImageUrl } from '../litebansPoller.js';
import { proofRequestData } from '../modalHandler.js';
import { EmbedBuilder } from 'discord.js';

export async function handleProofButton(interaction) {
  const customId = interaction.customId;
  
  if (!customId.startsWith('attach_proof_')) {
    return;
  }
  
  const litebansId = customId.replace('attach_proof_', '');
  
  const message = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
  if (!message) {
    return interaction.reply({ 
      content: 'Error: Could not find the original message.', 
      flags: 64 
    });
  }
  
  const proofRequest = await getModerationProofRequestByMessageId(message.id);
  if (!proofRequest) {
    return interaction.reply({ 
      content: 'Error: Could not find proof request.', 
      flags: 64 
    });
  }
  
  if (proofRequest.staff_id && proofRequest.staff_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'Only the staff member who performed this action can attach proof.', 
      flags: 64 
    });
  }
  
  proofRequestData.set(interaction.user.id, proofRequest);
  await showProofModal(interaction);
}

export async function handleProofSubmission(interaction, proofRequest) {
  const proofLink = interaction.fields.getTextInputValue('proof_link');
  
  const allowedDomains = ['youtube.com', 'youtu.be', 'imgur.com', 'postimages.org', 'postimg.cc'];
  const isValidDomain = allowedDomains.some(domain => proofLink.toLowerCase().includes(domain));
  
  if (!isValidDomain) {
    return interaction.reply({ 
      content: 'Invalid proof link. Only YouTube, Imgur, postimages.org, and postimg.cc links are allowed.', 
      flags: 64 
    });
  }
  
  const directImageUrl = await getDirectImageUrl(proofLink);
  
  await updateModerationProofRequest(proofRequest.id, directImageUrl, 'completed');
  
  const message = await interaction.channel.messages.fetch(proofRequest.message_id).catch(() => null);
  if (!message) {
    return interaction.reply({ 
      content: 'Error: Could not find the original message.', 
      flags: 64 
    });
  }
  
  const typeEmoji = {
    ban: '🔨',
    mute: '🔇',
    kick: '👢',
    warning: '⚠️'
  };
  
  const originalEmbed = message.embeds[0];
  const updatedEmbed = new EmbedBuilder()
    .setTitle(`${typeEmoji[proofRequest.punishment_type]} Proof Attached: ${proofRequest.punishment_type.charAt(0).toUpperCase() + proofRequest.punishment_type.slice(1)}`)
    .setColor(0x00FF00)
    .addFields(originalEmbed.data.fields)
    .setImage(directImageUrl)
    .setFooter({ text: `Proof attached by ${interaction.user.tag}` })
    .setTimestamp();
  
  await message.edit({
    embeds: [updatedEmbed],
    components: []
  });
  
  await interaction.reply({ 
    content: '✅ Proof attached successfully!', 
    flags: 64 
  });
}
