const Discord = require('discord.js'),
    config = require('./config.json');
const {join} = require('node:path');
const {
    joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnection,
    VoiceConnectionStatus
} = require('@discordjs/voice')
const {Collection} = require("discord.js");

config.cfg.intents = new Discord.Intents(config.cfg.intents);

const client = new Discord.Client(config.cfg);
client.login(config.token);

client.on('ready', (_) => {
    console.log('Ready');
})

const phrases = {
    ben: join(__dirname, '/audio/ben.mp3'),
    hanging: join(__dirname, '/audio/hanging.mp3'),
    hohoho: join(__dirname, '/audio/hohoho.mp3'),
    no: join(__dirname, '/audio/no.mp3'),
    phonering: join(__dirname, '/audio/phonering.mp3'),
    yes: join(__dirname, '/audio/yes.mp3'),
};

const getNewAudioResource = (filename) => createAudioResource(filename);

const getRandomAnswer = () => {
    const answers = [
        'hohoho',
        'no',
        'yes',
    ];

    if (Math.random() < 0.1) {
        return 'hanging';
    }

    return answers.sort(() => Math.random() - 0.5).shift();
}

client.voiceManager = new Collection();

client.on('messageCreate', async (message) => {
    if (!message.content.toLowerCase().includes('ben')) {
        return;
    }

    await message.react('☎');

    let memberVoiceState = message.member.voice;
    let voiceChannel = memberVoiceState.channel;

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.member.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
    const receiver = connection.receiver;

    let player = createAudioPlayer();

    player.play(getNewAudioResource(phrases.phonering));

    connection.subscribe(player);

    let isStarted = false;
    let activeUserId = null;
    let endDialog = false;

    player.on(AudioPlayerStatus.Idle, () => {
        if (isStarted === false) {
            player.play(getNewAudioResource(phrases.ben));
            isStarted = true;
        }
        if (endDialog === true) {
            connection.disconnect();
            isStarted = false
            activeUserId = null
            endDialog = false
        }
        activeUserId = null;
    });

    receiver.speaking.on('end', async (userId) => {
        console.log(activeUserId)
        if (activeUserId !== null) {
            return;
        }

        activeUserId = userId;

        if (isStarted === false) {
            return;
        }

        let answer = getRandomAnswer();

        await player.play(getNewAudioResource(phrases[answer]));

        endDialog = answer === 'hanging';
    })
});
