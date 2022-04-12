const config = require('./config.json');
const {
    debug,
    dialogState
} = require('./utils');

debug('init libraries');

const Discord = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const {Collection} = require("discord.js");

config.cfg.intents = new Discord.Intents(config.cfg.intents);

const client = new Discord.Client(config.cfg);

client.login(config.token).then(() => client.on('ready', (_) => {
    console.log('Ready')
}));

client.voiceManager = new Collection();
let state = null;

client.on('messageCreate', async (message) => {
    if (!message.content.toLowerCase().includes(config.startCommand)) {
        return;
    }

    let memberVoiceState = message.member.voice;
    let voiceChannel = memberVoiceState.channel;

    if (!memberVoiceState || !voiceChannel) {
        await message.reply(config.messages.replyUserNotInVoiceChannel);
        return;
    }

    if (state?.event) {
        await message.reply(config.messages.replyNowInChannel);
        return;
    }

    state = dialogState.createInstance();

    await message.react(config.messages.reactionStart);

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.member.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
    let player = createAudioPlayer();

    state.init(connection, player);

    player.on(AudioPlayerStatus.Idle, () => state.doEvent());
});
