import { EmbedBuilder, TimestampStyles, time } from "discord.js";
export const FUSION_RED = 0xfc5454;
export const FUSION_DARK = 0x8b2222;
export function okEmbed(text) {
    return new EmbedBuilder().setColor(FUSION_RED).setDescription(text);
}
export function errEmbed(text) {
    return new EmbedBuilder().setColor(FUSION_DARK).setDescription(`❌ ${text}`);
}
export function playerInfoEmbed(data) {
    const linkedSeconds = Math.floor(data.linkedAt / 1000);
    const general = [
        `Member: <@${data.discordId}>`,
        `Username: \`${data.username}\``,
        `Donator: ${data.donator ? "✅" : "❌"}`,
        `Boosting: ${data.boosting ? "✅" : "❌"}`,
        `Linked since: ${time(linkedSeconds, TimestampStyles.LongDateTime)} (${time(linkedSeconds, TimestampStyles.RelativeTime)})`,
    ].join("\n");
    const ranksValue = data.ranks.length > 0
        ? data.ranks.map((hit) => `${hit.realm.emoji} \`${hit.realm.label}\` ${hit.rank.display}`).join("\n")
        : "*No ranks :(*";
    const embed = new EmbedBuilder()
        .setColor(FUSION_RED)
        .setTitle("Player information")
        .setThumbnail(`https://mc-heads.net/avatar/${encodeURIComponent(data.username)}/100`)
        .addFields({ name: "🔴 General:", value: general }, { name: "🔴 Donator ranks:", value: ranksValue })
        .setFooter({ text: "Fusion Network", iconURL: data.guild.iconURL() ?? undefined })
        .setTimestamp();
    if (data.statsUrl) {
        embed.addFields({
            name: "​",
            value: `Click **[here](${data.statsUrl})** to get more statistics of this player.`,
        });
    }
    return embed;
}
