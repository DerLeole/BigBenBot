require('dotenv').config();
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const { Client, GatewayIntentBits, Embed, ActivityType } = require('discord.js');
const cron = require('node-cron');

const { TOKEN, VOICE_CHANNEL_ID, GUILD_ID, TEXT_CHANNEL_ID, MATCH_DINGS_WITH_HOUR, FOLLOW_USER_ID } = process.env;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ]
});

let guild, voiceChannel, textChannel;

client.on('ready', async () => {
    try {
        guild = await client.guilds.fetch(GUILD_ID);
        voiceChannel = guild.channels.cache.get(VOICE_CHANNEL_ID);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
    textChannel = guild.channels.cache.get(TEXT_CHANNEL_ID);
    console.log('Big Ben Ready...');
    client.user.setPresence({ activities: [{ name: 'the hour', type: ActivityType.Watching }], status: 'idle' });
});

const task = cron.schedule('0 0 */1 * * *', async () => {
    let { hour, amPm, timezoneOffsetString } = getTimeInfo();

    if (textChannel) {
        const messageEmbed = new Embed()
            .setColor('#FFD700')
            .setTitle(`The time is now ${hour}:00 ${amPm} GMT${timezoneOffsetString}`);
        textChannel.send({ embeds: [messageEmbed] });
    }

    let targetChannel = voiceChannel;
    
    if (voiceChannel.members.size === 0) {
        console.log('Original voice channel is empty, searching for FOLLOW_USER_ID...');
        const followUser = await guild.members.fetch(FOLLOW_USER_ID).catch(() => null);
        if (followUser && followUser.voice.channel) {
            targetChannel = followUser.voice.channel;
            console.log(`Joining ${followUser.voice.channel.name} where FOLLOW_USER_ID is connected.`);
        } else {
            console.log('FOLLOW_USER_ID not found in any voice channel.');
            return;
        }
    }

    console.log(`Playing Bong at ${hour}:00 ${amPm} GMT${timezoneOffsetString} to ${targetChannel.members.size} members.`);
    try {
        client.user.setPresence({ activities: [{ name: 'the Bongs', type: ActivityType.Playing }], status: 'online' });
        const connection = joinVoiceChannel({
            channelId: targetChannel.id,
            guildId: targetChannel.guild.id,
            adapterCreator: targetChannel.guild.voiceAdapterCreator,
        });
        const player = createAudioPlayer();
        const subscription = connection.subscribe(player);
        let count = 0;

        player.addListener("stateChange", (oldState, newState) => {
            if (newState.status === 'idle') {
                count++;
                if (count < hour && MATCH_DINGS_WITH_HOUR === 'true') {
                    const bong = createAudioResource('bell.mp3');
                    player.play(bong);
                } else {
                    player.stop();
                    subscription.unsubscribe();
                    connection.destroy();
                    client.user.setPresence({ activities: [{ name: 'the hour', type: ActivityType.Watching }], status: 'idle' });
                }
            }
        });
        const bong = createAudioResource('bell.mp3');
        player.play(bong);
    } catch (error) {
        console.log(error);
    }
});

const getTimeInfo = () => {
    let time = new Date();
    let hour = time.getHours() % 12 || 12;
    let amPm = time.getHours() >= 12 ? 'PM' : 'AM';
    let gmtOffset = time.getTimezoneOffset() / 60;
    let timezoneOffsetString = `${gmtOffset > 0 ? '-' : '+'} ${Math.abs(gmtOffset)}`;

    return { hour, amPm, timezoneOffsetString };
};

task.start();
client.login(TOKEN);
