import { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createStaffApplication, updateStaffApplicationStatus } from '../../database/mainDb.js';
import config from '../../config.js';

export async function handleStaffApplicationModal(interaction, data = null) {
  await interaction.deferReply({ flags: 64 });

  // Use provided data or extract from interaction fields
  const ign = data?.ign ?? interaction.fields.getTextInputValue('ign');
  const accountType = data?.accountType ?? interaction.fields.getTextInputValue('account_type');
  const age = data?.age ?? interaction.fields.getTextInputValue('age');
  const discordId = data?.discordId ?? interaction.fields.getTextInputValue('discord_id');
  const email = data?.email ?? interaction.fields.getTextInputValue('email');
  const region = data?.region ?? interaction.fields.getTextInputValue('region');
  const country = data?.country ?? interaction.fields.getTextInputValue('country');
  const timezone = data?.timezone ?? interaction.fields.getTextInputValue('timezone');
  const mic = data?.mic ?? interaction.fields.getTextInputValue('mic');
  const recording = data?.recording ?? interaction.fields.getTextInputValue('recording');
  const languages = data?.languages ?? interaction.fields.getTextInputValue('languages');
  const timeInGame = data?.timeInGame ?? interaction.fields.getTextInputValue('time_ingame');
  const timeDiscord = data?.timeDiscord ?? interaction.fields.getTextInputValue('time_discord');
  const altAccounts = data?.altAccounts ?? interaction.fields.getTextInputValue('alt_accounts');
  const sharedAccount = data?.sharedAccount ?? interaction.fields.getTextInputValue('shared_account');
  const currentStaff = data?.currentStaff ?? interaction.fields.getTextInputValue('current_staff');
  const staffExperience = data?.staffExperience ?? interaction.fields.getTextInputValue('staff_experience');
  const bestMemory = data?.bestMemory ?? interaction.fields.getTextInputValue('best_memory');
  const improvements = data?.improvements ?? interaction.fields.getTextInputValue('improvements');
  const motivation = data?.motivation ?? interaction.fields.getTextInputValue('motivation');
  const skills = data?.skills ?? interaction.fields.getTextInputValue('skills');
  const strengthsWeaknesses = data?.strengthsWeaknesses ?? interaction.fields.getTextInputValue('strengths_weaknesses');
  const whyAccept = data?.whyAccept ?? interaction.fields.getTextInputValue('why_accept');

  const responses = {
    ign,
    accountType,
    age,
    discordId,
    email,
    region,
    country,
    timezone,
    mic,
    recording,
    languages,
    timeInGame,
    timeDiscord,
    altAccounts,
    sharedAccount,
    currentStaff,
    staffExperience,
    bestMemory,
    improvements,
    motivation,
    skills,
    strengthsWeaknesses,
    whyAccept
  };

  const guild = interaction.guild;
  const categoryId = config.channels.mainServer.staffApplicationCategoryId;

  if (!categoryId) {
    return interaction.editReply({ content: 'Staff application category ID not configured. Please contact an admin.' });
  }

  const category = await guild.channels.fetch(categoryId).catch(() => null);
  if (!category) {
    return interaction.editReply({ content: 'Staff application category not found. Please contact an admin.' });
  }

  const managerRoles = Array.isArray(config.roles.mainServer.staffManagerRole) ? config.roles.mainServer.staffManagerRole : [config.roles.mainServer.staffManagerRole];
  const validManagerRoles = [];

  for (const roleId of managerRoles) {
    const role = await guild.roles.fetch(roleId).catch(() => null);
    if (role) {
      validManagerRoles.push(role);
    }
  }

  if (validManagerRoles.length === 0) {
    return interaction.editReply({ content: 'Manager role not found. Please contact an admin.' });
  }

  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    ...validManagerRoles.map(role => ({
      id: role.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    }))
  ];

  const channel = await guild.channels.create({
    name: `staff-app-${interaction.user.username}`,
    type: 0,
    parent: categoryId,
    permissionOverwrites
  });

  await createStaffApplication(channel.id, interaction.user.id, ign, responses);

  const embed1 = new EmbedBuilder()
    .setTitle(`Staff Application - ${ign}`)
    .setColor(0x5865F2)
    .addFields(
      { name: 'Discord User', value: `<@${interaction.user.id}>` },
      { name: 'Minecraft IGN', value: ign },
      { name: 'Account Type', value: accountType },
      { name: 'Age', value: age },
      { name: 'Email', value: email },
      { name: 'Region', value: region },
      { name: 'Country', value: country },
      { name: 'Timezone', value: timezone },
      { name: 'Mic', value: mic },
      { name: 'Recording', value: recording },
      { name: 'Languages', value: languages }
    )
    .setTimestamp();

  const embed2 = new EmbedBuilder()
    .setTitle('Staff Application - Time & Accounts')
    .setColor(0x5865F2)
    .addFields(
      { name: 'Time In-Game', value: timeInGame, inline: false },
      { name: 'Time on Discord', value: timeDiscord, inline: false },
      { name: 'Alt Accounts', value: altAccounts, inline: false },
      { name: 'Shared Account', value: sharedAccount, inline: false },
      { name: 'Current Staff', value: currentStaff, inline: false },
      { name: 'Staff Experience', value: staffExperience, inline: false }
    );

  const embed3 = new EmbedBuilder()
    .setTitle('Staff Application - About You')
    .setColor(0x5865F2)
    .addFields(
      { name: 'Best Memory', value: bestMemory, inline: false },
      { name: 'Improvements', value: improvements, inline: false },
      { name: 'Motivation', value: motivation, inline: false },
      { name: 'Skills', value: skills, inline: false },
      { name: 'Strengths & Weaknesses', value: strengthsWeaknesses, inline: false },
      { name: 'Why Accept', value: whyAccept, inline: false }
    );


  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_accept_${channel.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`staff_reject_${channel.id}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`staff_bgcheck_${channel.id}`)
        .setLabel('Background Check')
        .setStyle(ButtonStyle.Primary)
    );

  await channel.send({
    content: 'New staff application submitted!',
    embeds: [embed1, embed2, embed3],
    components: [row]
  });

  await channel.send({
    content: `<@${interaction.user.id}> Thank you for your application! The staff team will review it and get back to you soon.`
  });

  await interaction.editReply({ 
    content: `Your staff application has been submitted successfully! You can view it in <#${channel.id}>.`
  });
}
