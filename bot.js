require('dotenv').config();
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const { Client, GatewayIntentBits, Embed, ActivityType } = require('discord.js');
const cron = require('node-cron');

const { TOKEN, VOICE_CHANNEL_ID, GUILD_ID, TEXT_CHANNEL_ID, MATCH_DINGS_WITH_HOUR } = process.env;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
	]
});

let guild, voiceChannel, textChannel;

// When bot comes online check the guild and voice channel are valid
// if they are not found the program will exit
client.on('ready', async () =>
{
	try
	{
		guild = await client.guilds.fetch(GUILD_ID);
		voiceChannel = guild.channels.cache.get(VOICE_CHANNEL_ID);
	} catch (error)
	{
		console.log(error);
		process.exit(1);
	}
	textChannel = guild.channels.cache.get(TEXT_CHANNEL_ID);
	console.log('Big Ben Ready...');
	client.user.setPresence({ activities: [{ name: 'the hour', type: ActivityType.Watching }], status: 'idle' });
});

// use node-cron to create a job to run every hour
const task = cron.schedule('0 0 */1 * * *', async () =>
{
	let { hour, amPm, timezoneOffsetString } = getTimeInfo();

	// if text channel was defined send message in chat
	if (textChannel)
	{
		const messageEmbed = new Embed()
			.setColor('#FFD700')
			.setTitle(`The time is now ${hour}:00 ${amPm} GMT${timezoneOffsetString}`)

		textChannel.send(messageEmbed);
	}

	// check if VC defined in config is empty
	if (voiceChannel.members.size >= 1)
	{
		console.log(`Playing Bong at ${hour}:00 ${amPm} GMT${timezoneOffsetString} to ${voiceChannel.members.size} members.`);
		try
		{
			client.user.setPresence({ activities: [{ name: 'the Bongs', type: ActivityType.Playing }], status: 'online' });
			// Create a voice connection
			const connection = joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: voiceChannel.guild.id,
				adapterCreator: voiceChannel.guild.voiceAdapterCreator,
			});
			const player = createAudioPlayer();
			const subscription = connection.subscribe(player);
			// counter for looping
			let count = 0;

			// Listener for audio looping
			player.addListener("stateChange", (oldState, newState) =>
			{
				if (newState.status === 'idle')
				{
					count++;
					if (count < hour && MATCH_DINGS_WITH_HOUR == 'true')
					{
						const bong = createAudioResource('bell.mp3');
						player.play(bong);
					} else
					{
						// Safely stop playback and leave the voice channel
						player.stop();
						subscription.unsubscribe();
						connection.destroy();
						client.user.setPresence({ activities: [{ name: 'the hour', type: ActivityType.Watching }], status: 'idle' });
					}
				}
			});
			const bong = createAudioResource('bell.mp3');
			player.play(bong);
		} catch (error)
		{
			console.log(error);
		}
	}
});

// function to get current time and return object containing
// hour and if it is am or pm
const getTimeInfo = () =>
{
	let time = new Date();
	let hour = time.getHours() >= 12 ? time.getHours() - 12 : time.getHours();
	hour = hour === 0 ? 12 : hour;
	let amPm = time.getHours() >= 12 ? 'PM' : 'AM';
	// get gmt offset in minutes and convert to hours
	let gmtOffset = time.getTimezoneOffset() / 60
	// turn gmt offset into a string representing the timezone in its + or - gmt offset
	let timezoneOffsetString = `${gmtOffset > 0 ? '-' : '+'} ${Math.abs(gmtOffset)}`;

	return {
		hour,
		amPm,
		timezoneOffsetString
	}
}

// start the cron job
task.start();

client.login(TOKEN);