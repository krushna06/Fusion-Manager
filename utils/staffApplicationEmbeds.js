import { EmbedBuilder } from 'discord.js';
import { staffApplicationQuestions } from './staffApplicationQuestions.js';

const MESSAGE_EMBED_CHAR_LIMIT = 6000;
const EMBED_FIELD_LIMIT = 25;
const FIELD_NAME_LIMIT = 256;
const FIELD_VALUE_LIMIT = 1024;
const TITLE_LIMIT = 256;
const FOOTER_LIMIT = 200;
const TITLE_NAME_LIMIT = 48;

const TARGET_EMBED_CHARS = 1900;

export const EMBEDS_PER_MESSAGE = 10;

const OVERHEAD_RESERVE = 200;

const SECTIONS = [
  { label: 'General Information', questions: staffApplicationQuestions.slice(0, 10) },
  { label: 'Time & Accounts', questions: staffApplicationQuestions.slice(10, 16) },
  { label: 'Experience & About You', questions: staffApplicationQuestions.slice(16, 22) },
  { label: 'Scenarios & Commitment', questions: staffApplicationQuestions.slice(22) }
];

function clamp(value, max) {
  const text = String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function answerFor(responses, question) {
  if (question.id === 'ign') {
    return responses.ign || responses.minecraft_username || '';
  }
  return responses[question.id] || '';
}

function buildField(responses, question) {
  const answer = String(answerFor(responses, question) || '').trim();
  return {
    name: clamp(question.label, FIELD_NAME_LIMIT),
    value: answer ? clamp(answer, FIELD_VALUE_LIMIT) : 'Not provided',
    inline: false
  };
}

function packPages(responses) {
  const budget = TARGET_EMBED_CHARS - OVERHEAD_RESERVE;
  const pages = [];
  let page = { section: SECTIONS[0].label, fields: [], cost: 0 };

  const flush = () => {
    if (page.fields.length > 0) {
      pages.push(page);
    }
  };

  const startPage = (section) => {
    flush();
    page = { section, fields: [], cost: 0 };
  };

  for (const section of SECTIONS) {
    if (page.section !== section.label) {
      startPage(section.label);
    }

    for (const question of section.questions) {
      const field = buildField(responses, question);
      const cost = field.name.length + field.value.length;

      if (page.fields.length >= EMBED_FIELD_LIMIT || page.cost + cost > budget) {
        startPage(section.label);
      }

      page.fields.push(field);
      page.cost += cost;
    }
  }
  flush();

  return pages;
}

function embedCost(embed) {
  const json = embed.toJSON();
  let total = (json.title || '').length + (json.description || '').length +
    (json.footer?.text || '').length + (json.author?.name || '').length;

  for (const field of json.fields || []) {
    total += (field.name || '').length + (field.value || '').length;
  }

  return total;
}

export function buildStaffApplicationEmbeds(responses, user, options = {}) {
  const answers = responses || {};
  const applicant = user || {};
  const rawName = answers.ign || answers.minecraft_username || applicant.username || 'Unknown';
  const displayName = clamp(rawName, TITLE_NAME_LIMIT);
  const baseTitle = options.titlePrefix
    ? `${options.titlePrefix} - ${displayName}`
    : `Staff Application - ${displayName}`;

  const pages = packPages(answers);
  const total = pages.length;

  return pages.map((page, index) => {
    const title = total > 1 ? `${baseTitle} (${index + 1}/${total})` : baseTitle;
    const embed = new EmbedBuilder()
      .setColor(options.color ?? 0x5865F2)
      .setTitle(clamp(title, TITLE_LIMIT))
      .setDescription(page.section);

    if (index === 0) {
      embed.addFields({ name: 'Discord User', value: `<@${applicant.id}>`, inline: false });
    }
    embed.addFields(page.fields);

    if (options.footerText) {
      embed.setFooter({ text: clamp(options.footerText, FOOTER_LIMIT) });
    }
    if (options.timestamp !== false) {
      embed.setTimestamp();
    }

    return embed;
  });
}

export function groupEmbedsIntoMessages(embeds, limit = MESSAGE_EMBED_CHAR_LIMIT) {
  const batches = [];
  let current = [];
  let currentCost = 0;

  for (const embed of embeds) {
    const cost = embedCost(embed);
    const full = current.length >= EMBEDS_PER_MESSAGE || currentCost + cost > limit;

    if (full && current.length > 0) {
      batches.push(current);
      current = [];
      currentCost = 0;
    }

    current.push(embed);
    currentCost += cost;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}

export const EMBED_LIMITS = {
  messageTotal: MESSAGE_EMBED_CHAR_LIMIT,
  targetPerEmbed: TARGET_EMBED_CHARS,
  maxPerMessage: EMBEDS_PER_MESSAGE
};

export function buildStaffApplicationText(responses, user) {
  const answers = responses || {};
  const applicant = user || {};
  const lines = [
    `Staff Application - ${answers.ign || answers.minecraft_username || applicant.username || 'Unknown'}`,
    `Discord User: ${applicant.id || 'unknown'} (${applicant.tag || applicant.username || 'unknown'})`,
    ''
  ];

  for (const section of SECTIONS) {
    lines.push(`--- ${section.label} ---`);
    for (const question of section.questions) {
      const value = String(answerFor(answers, question) || '').trim();
      lines.push(`${question.label}:`);
      lines.push(value || 'Not provided');
      lines.push('');
    }
  }

  return lines.join('\n');
}
