import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errEmbed, okEmbed } from '../../utils/linkerEmbeds.js';
import * as linkerDb from '../../database/linkerDb.js';
import { isDonator, topRanksPerRealm } from '../../utils/linkerRanks.js';

export default {
  data: new SlashCommandBuilder()
    .setName('linker-admin')
    .setDescription('FusionLink administration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('lookup')
        .setDescription("Review a player's link, ranks and history")
        .addUserOption(option => option.setName('member').setDescription('Discord member'))
        .addStringOption(option => option.setName('username').setDescription('Minecraft username'))
    )
    .addSubcommand(sub =>
      sub
        .setName('unlink')
        .setDescription('Force unlink an account')
        .addUserOption(option => option.setName('member').setDescription('Discord member'))
        .addStringOption(option => option.setName('username').setDescription('Minecraft username'))
    )
    .addSubcommand(sub =>
      sub
        .setName('forcelink')
        .setDescription('Manually link a Discord member to a Minecraft account')
        .addUserOption(option =>
          option
            .setName('member')
            .setDescription('Discord member')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('username')
            .setDescription('Minecraft username')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('resync')
        .setDescription('Re-run the sync for one player')
        .addUserOption(option => option.setName('member').setDescription('Discord member'))
        .addStringOption(option => option.setName('username').setDescription('Minecraft username'))
    )
    .addSubcommand(sub =>
      sub
        .setName('grant')
        .setDescription('Give Donator manually and exempt from auto-removal')
        .addUserOption(option =>
          option
            .setName('member')
            .setDescription('Discord member')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('ungrant')
        .setDescription('Remove a manual Donator grant')
        .addUserOption(option =>
          option
            .setName('member')
            .setDescription('Discord member')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option
            .setName('remove_role')
            .setDescription('Also remove the Donator role now')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('booster')
        .setDescription('Manually grant or revoke the in-game booster rank')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Grant or revoke')
            .setRequired(true)
            .addChoices({ name: 'grant', value: 'grant' }, { name: 'revoke', value: 'revoke' })
        )
        .addUserOption(option => option.setName('member').setDescription('Discord member'))
        .addStringOption(option => option.setName('username').setDescription('Minecraft username'))
    )
    .addSubcommand(sub =>
      sub
        .setName('sync')
        .setDescription('Run a full sync sweep now')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'lookup':
        return this.lookup(interaction);
      case 'unlink':
        return this.unlink(interaction);
      case 'forcelink':
        return this.forcelink(interaction);
      case 'resync':
        return this.resync(interaction);
      case 'grant':
        return this.grant(interaction);
      case 'ungrant':
        return this.ungrant(interaction);
      case 'booster':
        return this.booster(interaction);
      case 'sync':
        return this.sync(interaction);
    }
  },

  async resolveLink(interaction) {
    const username = interaction.options.getString('username');
    const user = interaction.options.getUser('member');

    if (username) return linkerDb.getLinkByUsername(username);
    if (user) return linkerDb.getLinkByDiscord(user.id);
    return 'missing';
  },

  async lookup(interaction) {
    const link = await this.resolveLink(interaction);

    if (link === 'missing') {
      await interaction.editReply({ embeds: [errEmbed('Give a member or a username.')] });
      return;
    }

    if (!link) {
      await interaction.editReply({ embeds: [errEmbed('No link found for that target.')] });
      return;
    }

    const config = global.config || interaction.client.config || {};
    const linkerConfig = config.linker || {};
    const groups = await linkerDb.getUserGroups(link.uuid);
    const history = await linkerDb.getRecentAudit(link.discord_id, link.uuid, 10);
    const ranks = topRanksPerRealm(groups, linkerConfig);

    const historyText = history.length > 0
      ? history
        .map(row => `<t:${Math.floor(Number(row.at) / 1000)}:R> \`${row.side}\` **${row.action}**${row.detail ? ` — ${row.detail}` : ''}`)
        .join('\n')
      : '*No history.*';

    const embed = okEmbed([
      `**Link review — \`${link.username}\`**`,
      `Discord: <@${link.discord_id}> (\`${link.discord_id}\`)`,
      `UUID: \`${link.uuid}\``,
      `Linked: <t:${Math.floor(Number(link.linked_at) / 1000)}:F>`,
      `Donator: ${isDonator(groups, linkerConfig) ? '✅' : '❌'}`,
      `Ranks: ${ranks.length > 0 ? ranks.map(hit => `${hit.realm.label} ${hit.rank.display}`).join(', ') : 'none'}`,
      `Groups: ${groups.length > 0 ? groups.map(group => `\`${group}\``).join(' ') : 'none'}`
    ].join('\n'))
      .setTitle('Player review')
      .addFields({ name: 'Recent history', value: historyText.slice(0, 1024) });

    await interaction.editReply({ embeds: [embed] });
  },

  async unlink(interaction) {
    const username = interaction.options.getString('username');
    const user = interaction.options.getUser('member');

    if (!username && !user) {
      await interaction.editReply({ embeds: [errEmbed('Give a member or a username.')] });
      return;
    }

    let row = null;
    if (username) {
      const existing = await linkerDb.getLinkByUsername(username);
      if (existing) row = await linkerDb.deleteLinkByUuid(existing.uuid);
    } else if (user) {
      row = await linkerDb.deleteLinkByDiscord(user.id);
    }

    if (!row) {
      await interaction.editReply({ embeds: [errEmbed('No link found for that target.')] });
      return;
    }

    await linkerDb.audit('admin_unlink', row.uuid, row.username, row.discord_id, `by ${interaction.user.id}`);
    await linkerDb.insertNotification(row.uuid, 'unlinked_remote');
    
    if (interaction.client.reconciler) {
      await interaction.client.reconciler.reconcilePair(row.uuid, row.discord_id);
      await interaction.client.reconciler.log(`🛠️ **${row.username}** force-unlinked from <@${row.discord_id}> by <@${interaction.user.id}>`);
    }
    await interaction.editReply({
      embeds: [okEmbed(`Unlinked **${row.username}** from <@${row.discord_id}>.`)]
    });
  },

  async grant(interaction) {
    const user = interaction.options.getUser('member', true);
    const guild = interaction.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.editReply({ embeds: [errEmbed("That member isn't in the server.")] });
      return;
    }

    await linkerDb.addDonatorGrant(user.id, interaction.user.id);

    const config = global.config || interaction.client.config || {};
    const linkerConfig = config.linker || {};
    const donatorRoleId = linkerConfig.donatorRoleId;
    
    let roleNote = '';
    if (donatorRoleId) {
      try {
        await member.roles.add(donatorRoleId, 'FusionLink manual donator grant');
      } catch {
        roleNote = ' (couldn\'t add the role — check the bot\'s role is above Donator; the exemption is still saved)';
      }
    }

    await linkerDb.audit('manual_grant', null, null, user.id, `by ${interaction.user.id}`);
    
    if (interaction.client.reconciler) {
      await interaction.client.reconciler.dmDonatorGranted(member);
      await interaction.client.reconciler.log(`🎀 Manual Donator granted to <@${user.id}> by <@${interaction.user.id}> — exempt from auto-removal`);
    }
    await interaction.editReply({
      embeds: [okEmbed(`Granted Donator to <@${user.id}> and exempted them from auto-removal. They've been DM'd to link.${roleNote}`)]
    });
  },

  async ungrant(interaction) {
    const user = interaction.options.getUser('member', true);
    const removeRole = interaction.options.getBoolean('remove_role') ?? false;

    const existed = await linkerDb.removeDonatorGrant(user.id);

    let roleNote = '';
    if (removeRole) {
      const guild = interaction.guild;
      const member = await guild.members.fetch(user.id).catch(() => null);

      if (member) {
        const config = global.config || interaction.client.config || {};
        const linkerConfig = config.linker || {};
        const donatorRoleId = linkerConfig.donatorRoleId;
        if (donatorRoleId) {
          try {
            await member.roles.remove(donatorRoleId, 'FusionLink manual ungrant');
            roleNote = ' and removed the role';
          } catch {
            roleNote = ' (couldn\'t remove the role — check role hierarchy)';
          }
        }
      }
    }

    await linkerDb.audit('manual_ungrant', null, null, user.id, `by ${interaction.user.id}`);
    
    if (interaction.client.reconciler) {
      await interaction.client.reconciler.log(`🧹 Manual Donator grant removed for <@${user.id}> by <@${interaction.user.id}>`);
    }

    const head = existed
      ? `Removed the manual grant/exemption for <@${user.id}>${roleNote}. Normal link-based sync now applies.`
      : `<@${user.id}> had no manual grant${roleNote}. Normal link-based sync applies.`;

    await interaction.editReply({ embeds: [okEmbed(head)] });
  },

  async forcelink(interaction) {
    const user = interaction.options.getUser('member', true);
    const username = interaction.options.getString('username', true);
    const uuid = await linkerDb.getUuidByUsername(username);
    
    if (!uuid) {
      await interaction.editReply({
        embeds: [errEmbed(`\`${username}\` has never joined the network, so it has no account to link.`)]
      });
      return;
    }

    const canonical = (await linkerDb.getUsernameByUuid(uuid)) ?? username;
    const result = await linkerDb.forceLink(uuid, canonical, user.id, Date.now());
    
    if (!result.ok) {
      const message = result.reason === 'uuid_taken'
        ? `\`${canonical}\` is already linked to another Discord account.`
        : `<@${user.id}> is already linked to a Minecraft account.`;
      await interaction.editReply({ embeds: [errEmbed(message)] });
      return;
    }

    await linkerDb.audit('admin_forcelink', uuid, canonical, user.id, `by ${interaction.user.id}`);
    await linkerDb.insertNotification(uuid, 'linked');
    
    if (interaction.client.reconciler) {
      await interaction.client.reconciler.reconcilePair(uuid, user.id);
      await interaction.client.reconciler.log(`🛠️ **${canonical}** force-linked to <@${user.id}> by <@${interaction.user.id}>`);
    }
    
    await interaction.editReply({ embeds: [okEmbed(`Linked **${canonical}** to <@${user.id}>.`)] });
  },

  async resync(interaction) {
    const link = await this.resolveLink(interaction);

    if (link === 'missing') {
      await interaction.editReply({ embeds: [errEmbed('Give a member or a username.')] });
      return;
    }

    if (!link) {
      await interaction.editReply({ embeds: [errEmbed('No link found for that target.')] });
      return;
    }

    if (interaction.client.reconciler) {
      await interaction.client.reconciler.reconcilePair(link.uuid, link.discord_id);
    }
    
    await linkerDb.audit('admin_resync', link.uuid, link.username, link.discord_id, `by ${interaction.user.id}`);
    await interaction.editReply({ embeds: [okEmbed(`Re-synced **${link.username}**.`)] });
  },

  async booster(interaction) {
    const action = interaction.options.getString('action', true);
    const username = interaction.options.getString('username');
    const user = interaction.options.getUser('member');
    
    let uuid = null;
    let label = username ?? '';
    
    if (username) {
      uuid = await linkerDb.getUuidByUsername(username);
      if (uuid) label = (await linkerDb.getUsernameByUuid(uuid)) ?? username;
    } else if (user) {
      const link = await linkerDb.getLinkByDiscord(user.id);
      if (link) {
        uuid = link.uuid;
        label = link.username;
      }
    } else {
      await interaction.editReply({ embeds: [errEmbed('Give a member or a username.')] });
      return;
    }

    if (!uuid) {
      await interaction.editReply({ embeds: [errEmbed('Could not resolve that player to a Minecraft account.')] });
      return;
    }

    await linkerDb.enqueueLpAction(uuid, action === 'grant' ? 'grant_booster' : 'revoke_booster');
    await linkerDb.audit(`admin_booster_${action}`, uuid, label, user?.id ?? null, `by ${interaction.user.id}`);
    
    if (interaction.client.reconciler) {
      await interaction.client.reconciler.log(`🛠️ Booster **${action}** queued for **${label}** by <@${interaction.user.id}>`);
    }
    
    await interaction.editReply({
      embeds: [okEmbed(`Queued booster **${action}** for **${label}** — it applies within a few seconds.`)]
    });
  },

  async sync(interaction) {
    if (!interaction.client.reconciler) {
      await interaction.editReply({ embeds: [errEmbed('Reconciler not available.')] });
      return;
    }

    const stats = await interaction.client.reconciler.fullSweep();
    await interaction.editReply({
      embeds: [
        okEmbed(`Sweep finished: **${stats.links}** links checked, **${stats.roleAdded}** roles added, **${stats.roleRemoved}** roles removed, **${stats.boosterQueued}** booster actions queued.`)
      ]
    });
  }
};
