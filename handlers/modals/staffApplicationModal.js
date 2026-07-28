import { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createStaffApplication, updateStaffApplicationStatus } from '../../database/mainDb.js';
import roles from '../../config/roles.json' with { type: 'json' };
import config from '../../config/config.json' with { type: 'json' };

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
  const scenario1 = data?.scenario1 ?? interaction.fields.getTextInputValue('scenario1');
  const scenario2 = data?.scenario2 ?? interaction.fields.getTextInputValue('scenario2');
  const scenario3 = data?.scenario3 ?? interaction.fields.getTextInputValue('scenario3');
  const scenario4 = data?.scenario4 ?? interaction.fields.getTextInputValue('scenario4');
  const scenario5 = data?.scenario5 ?? interaction.fields.getTextInputValue('scenario5');
  const scenario6 = data?.scenario6 ?? interaction.fields.getTextInputValue('scenario6');

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
    whyAccept,
    scenario1,
    scenario2,
    scenario3,
    scenario4,
    scenario5,
    scenario6
  };

  const guild = interaction.guild;
  const categoryId = config.STAFF_APPLICATION_CATEGORY_ID;

  if (!categoryId) {
    return interaction.editReply({ content: 'Staff application category ID not configured. Please contact an admin.' });
  }

  const category = await guild.channels.fetch(categoryId).catch(() => null);
  if (!category) {
    return interaction.editReply({ content: 'Staff application category not found. Please contact an admin.' });
  }

  const managerRoles = Array.isArray(roles.MANAGER_ROLE) ? roles.MANAGER_ROLE : [roles.MANAGER_ROLE];
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
    {
      id: interaction.user.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
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

  const embed4 = new EmbedBuilder()
    .setTitle('Staff Application - Phase 2 Scenarios')
    .setColor(0x5865F2)
    .addFields(
      { name: 'Scenario 1: Kill-aura in PvP arena', value: scenario1, inline: false },
      { name: 'Scenario 2: Toxic argument in chat', value: scenario2, inline: false },
      { name: 'Scenario 3: Bug refund request', value: scenario3, inline: false },
      { name: 'Scenario 4: Friend asks to overlook violation', value: scenario4, inline: false },
      { name: 'Scenario 5: Your unique motivation & skills', value: scenario5, inline: false },
      { name: 'Scenario 6: Weekly availability & balance', value: scenario6, inline: false }
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
        .setStyle(ButtonStyle.Danger)
    );

  await channel.send({
    content: 'New staff application submitted!',
    embeds: [embed1, embed2, embed3, embed4],
    components: [row]
  });

  await channel.send({
    content: `<@${interaction.user.id}> Thank you for your application! The staff team will review it and get back to you soon.`
  });

  await interaction.editReply({ 
    content: `Your staff application has been submitted successfully! You can view it in <#${channel.id}>.`
  });
}
