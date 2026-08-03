import { getScheduledInterviews, setInterviewVoiceChannel, updateInterviewStatus } from '../database/mainDb.js';
import { PermissionsBitField, ChannelType } from 'discord.js';
import config from '../config.js';

const INTERVIEW_CHECK_INTERVAL = 60000;
const INTERVIEW_ADVANCE_TIME = 10 * 60 * 1000;

let schedulerInterval = null;

export function startInterviewScheduler(client) {
  if (schedulerInterval) {
    console.log('Interview scheduler already running');
    return;
  }

  console.log('Starting interview scheduler...');
  
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndCreateInterviewChannels(client);
    } catch (error) {
      console.error('Error in interview scheduler:', error);
    }
  }, INTERVIEW_CHECK_INTERVAL);
}

export function stopInterviewScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Interview scheduler stopped');
  }
}

async function checkAndCreateInterviewChannels(client) {
  const scheduledInterviews = await getScheduledInterviews();
  
  if (!scheduledInterviews || scheduledInterviews.length === 0) {
    return;
  }

  const now = new Date();
  
  for (const interview of scheduledInterviews) {
    try {
      if (interview.interview_status !== 'scheduled' && interview.interview_status !== 'accepted') {
        continue;
      }

      if (interview.interview_voice_channel_id) {
        continue;
      }

      const scheduledTime = new Date(interview.interview_scheduled_time);
      const timeUntilInterview = scheduledTime.getTime() - now.getTime();

      if (timeUntilInterview <= INTERVIEW_ADVANCE_TIME && timeUntilInterview > 0) {
        await createInterviewVoiceChannel(client, interview);
      }
    } catch (error) {
      console.error(`Error processing interview ${interview.id}:`, error);
    }
  }
}

async function createInterviewVoiceChannel(client, interview) {
  try {
    const guild = await client.guilds.fetch(config.channels.mainServer.guildId).catch(() => null);
    if (!guild) {
      console.error('Guild not found for interview voice channel creation');
      return;
    }

    const categoryId = config.channels.mainServer.staffApplicationCategoryId;
    const category = await guild.channels.fetch(categoryId).catch(() => null);
    if (!category) {
      console.error('Staff application category not found');
      return;
    }

    const applicant = await client.users.fetch(interview.staff_id).catch(() => null);
    if (!applicant) {
      console.error('Applicant not found');
      return;
    }

    const managerRoles = Array.isArray(config.roles.mainServer.staffManagerRole) 
      ? config.roles.mainServer.staffManagerRole 
      : [config.roles.mainServer.staffManagerRole];

    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
      },
      {
        id: applicant.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
      }
    ];

    for (const roleId of managerRoles) {
      if (roleId) {
        permissionOverwrites.push({
          id: roleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
        });
      }
    }

    if (config.roles.mainServer.adminRole) {
      const adminRoles = Array.isArray(config.roles.mainServer.adminRole) 
        ? config.roles.mainServer.adminRole 
        : [config.roles.mainServer.adminRole];
      
      for (const roleId of adminRoles) {
        if (roleId) {
          permissionOverwrites.push({
            id: roleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
          });
        }
      }
    }

    const voiceChannel = await guild.channels.create({
      name: `interview-${applicant.username}`,
      type: ChannelType.GuildVoice,
      parent: category,
      permissionOverwrites
    });

    console.log(`Created interview voice channel: ${voiceChannel.name} (${voiceChannel.id})`);

    await setInterviewVoiceChannel(interview.channel_id, voiceChannel.id);

    const appChannel = await guild.channels.fetch(interview.channel_id).catch(() => null);
    if (appChannel) {
      await appChannel.send({
        content: `🎙️ Interview voice channel created: <#${voiceChannel.id}>. Your interview will begin in 10 minutes.`
      });

      try {
        await applicant.send({
          content: `🎙️ Your interview voice channel has been created: <#${voiceChannel.id}>. Please join in 10 minutes for your staff application interview.`
        });
      } catch (dmError) {
        console.error('Error sending DM to applicant:', dmError);
      }
    }

  } catch (error) {
    console.error('Error creating interview voice channel:', error);
  }
}