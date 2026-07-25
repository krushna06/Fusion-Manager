import { EmbedBuilder } from 'discord.js';
import { getDonatorGroups } from './linkerRanks.js';
import { FUSION_RED } from './linkerEmbeds.js';
import * as linkerDb from '../database/linkerDb.js';

export class Reconciler {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.donators = getDonatorGroups(config).map(g => g.toLowerCase());
    this.logChannelId = config.linker?.logChannelId || '';
    this.donatorRoleId = config.linker?.donatorRoleId || '';
    this.boosterRoleId = config.linker?.boosterRoleId || '';
    this.boosterGroup = config.linker?.boosterGroup || 'global-booster';
    this.promptedDonators = new Set();
    this.promptedBoosters = new Set();
    this.stats = { links: 0, roleAdded: 0, roleRemoved: 0, boosterQueued: 0 };
  }

  async guild() {
    return this.client.guilds.fetch(this.config.linker.guildId);
  }

  async fetchMember(guild, discordId) {
    try {
      return await guild.members.fetch(discordId);
    } catch {
      return null;
    }
  }

  isBoosting(member) {
    if (member.premiumSince != null) return true;
    return this.boosterRoleId !== '' && member.roles.cache.has(this.boosterRoleId);
  }

  async reconcilePair(uuid, discordId) {
    let link = null;
    if (uuid) link = await linkerDb.getLinkByUuid(uuid);
    if (!link && discordId) link = await linkerDb.getLinkByDiscord(discordId);
    
    const guild = await this.guild();
    
    if (link) {
      const member = await this.fetchMember(guild, link.discord_id);
      const groups = await linkerDb.getUserGroups(link.uuid);
      const donator = groups.some(group => this.donators.includes(group));
      const hasBooster = groups.includes(this.boosterGroup.toLowerCase());
      await this.applyState(link, member, donator, hasBooster);
      return;
    }
    
    if (discordId) {
      const member = await this.fetchMember(guild, discordId);
      if (member) {
        const result = await this.setRole(member, false, null);
        if (result === 'removed') await this.promptDonator(member);
        if (this.isBoosting(member)) await this.promptBooster(member);
      }
    }
    
    if (uuid) {
      const groups = await linkerDb.getUserGroups(uuid);
      if (groups.includes(this.boosterGroup.toLowerCase())) {
        await this.queueBooster(uuid, null, discordId, 'revoke_booster', 'unlinked');
      }
    }
  }

  async promptBooster(member) {
    if (this.promptedBoosters.has(member.id)) return;
    this.promptedBoosters.add(member.id);
    
    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor(FUSION_RED)
            .setTitle('Thanks for boosting Fusion Network! 💎')
            .setDescription([
              'Link your Minecraft account to claim your in-game **Booster** rank:',
              '',
              '**1.** Join the server and run `/link`',
              '**2.** Copy the code, then run `/link <code>` here in Discord',
              '',
              'Your booster rank applies automatically once linked, and lasts as long as you keep boosting.'
            ].join('\n'))
        ]
      });
      await linkerDb.audit('booster_prompt', null, null, member.id, 'dm sent');
    } catch {
      await linkerDb.audit('booster_prompt', null, null, member.id, 'dm blocked');
    }
  }

  async promptDonator(member) {
    if (this.promptedDonators.has(member.id)) return;
    this.promptedDonators.add(member.id);

    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor(FUSION_RED)
            .setTitle('Link your account to keep Donator 🎀')
            .setDescription([
              'Your Discord **Donator** role now syncs from your in-game rank, so it needs your Minecraft account linked:',
              '',
              '**1.** Join the server and run `/link`',
              '**2.** Copy the code, then run `/link <code>` here in Discord',
              '',
              'Once linked, your Donator role is restored automatically and stays in sync with your in-game rank.'
            ].join('\n'))
        ]
      });
      await linkerDb.audit('donator_prompt', null, null, member.id, 'dm sent');
    } catch {
      await linkerDb.audit('donator_prompt', null, null, member.id, 'dm blocked');
    }
  }

  async dmDonatorGranted(member) {
    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor(FUSION_RED)
            .setTitle("You've been granted Donator 🎀")
            .setDescription([
              "You've been given the **Donator** role. Link your Minecraft account so your perks sync in-game:",
              '',
              '**1.** Join the server and run `/link`',
              '**2.** Copy the code, then run `/link <code>` here in Discord',
              '',
              'Your Donator role stays whether or not you link — linking just connects your in-game rank.'
            ].join('\n'))
        ]
      });
      await linkerDb.audit('manual_grant_dm', null, null, member.id, 'dm sent');
    } catch {
      await linkerDb.audit('manual_grant_dm', null, null, member.id, 'dm blocked');
    }
  }

  async applyState(link, member, donator, hasBooster) {
    if (member) {
      await this.setRole(member, donator, link);
      const boosting = this.isBoosting(member);
      if (boosting && !hasBooster) {
        await this.queueBooster(link.uuid, link.username, link.discord_id, 'grant_booster', null);
        await this.log(`💎 **${link.username}** is boosting, booster rank queued`);
      } else if (!boosting && hasBooster) {
        await this.queueBooster(link.uuid, link.username, link.discord_id, 'revoke_booster', 'not boosting');
      }
      return;
    }
    if (hasBooster) {
      await this.queueBooster(link.uuid, link.username, link.discord_id, 'revoke_booster', 'left guild');
    }
  }

  async queueBooster(uuid, username, discordId, action, detail) {
    await linkerDb.enqueueLpAction(uuid, action);
    await linkerDb.audit(`${action}_queued`, uuid, username, discordId, detail);
    this.stats.boosterQueued += 1;
  }

  async setRole(member, shouldHave, link) {
    const roleId = this.donatorRoleId;
    const has = member.roles.cache.has(roleId);

    if (shouldHave === has) return 'nochange';
    if (!shouldHave && (await linkerDb.isDonatorExempt(member.id))) return 'exempt';

    try {
      if (shouldHave) {
        await member.roles.add(roleId, 'FusionLink donator sync');
        this.stats.roleAdded += 1;
        await linkerDb.audit('role_added', link?.uuid ?? null, link?.username ?? null, member.id, null);
        await this.log(`🎀 Donator role added to <@${member.id}>${link ? ` (**${link.username}**)` : ''}`);
        return 'added';
      }

      await member.roles.remove(roleId, 'FusionLink donator sync');
      this.stats.roleRemoved += 1;
      await linkerDb.audit('role_removed', link?.uuid ?? null, link?.username ?? null, member.id, null);
      await this.log(`🧹 Donator role removed from <@${member.id}>${link ? ` (**${link.username}**)` : ''}`);
      return 'removed';
    } catch (error) {
      console.error(`role update failed for ${member.id}, check the bot role is above the donator role`, error);
      return 'error';
    }
  }

  async fullSweep() {
    this.stats = { links: 0, roleAdded: 0, roleRemoved: 0, boosterQueued: 0 };
    const links = await linkerDb.getAllLinks();
    this.stats.links = links.length;
    
    if (links.length === 0) return this.stats;
    
    const donators = await linkerDb.getGroupHolderUuids(this.donators);
    const boosterHolders = await linkerDb.getGroupHolderUuids([this.boosterGroup.toLowerCase()]);
    const guild = await this.guild();
    const members = new Map();
    const ids = links.map(link => link.discord_id);
    
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      try {
        const fetched = await guild.members.fetch({ user: chunk });
        for (const [id, member] of fetched) members.set(id, member);
      } catch (error) {
        console.error('member chunk fetch failed', error);
      }
    }
    
    for (const link of links) {
      const member = members.get(link.discord_id) ?? null;
      try {
        await this.applyState(link, member, donators.has(link.uuid), boosterHolders.has(link.uuid));
      } catch (error) {
        console.error(`sweep reconcile failed for ${link.uuid}`, error);
      }
    }
    
    return this.stats;
  }

  async log(text) {
    if (!this.logChannelId) return;

    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (channel?.isSendable()) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(FUSION_RED)
              .setDescription(text)
          ]
        });
      }
    } catch {
    }
  }
}
