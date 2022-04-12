const config = require("./config.json");
const {createAudioResource} = require("@discordjs/voice");
const {join} = require("node:path");

exports.debug = (debugData) => config.debug !== true || console.log('🛠 DEBUG: ', debugData);

exports.getRandomVoices = () => {
    let voices = config.voice.random;

    if (!voices.length) {
        throw new Error('Не заполнен конфиг фраз');
    }

    let percentRest = 100;
    const chances = voices.map(el => el.chance);
    const chancesSum = chances.reduce((a, b) => a + b, 0);

    voices.map(el => {
        el.chancePersent = el.chance / (chancesSum / 100);
        el.percent = parseInt(percentRest - el.chancePersent);
        el.getResource = () => exports.getNewAudioResource(join(__dirname, '/audio/' + el.filename + '.mp3'))
        percentRest -= el.chancePersent;
    })

    return voices;
}

exports.getNewAudioResource = (filename) => createAudioResource(filename);

exports.getStartVoices = () => config.voice.start.map(element => exports.getNewAudioResource(join(__dirname, '/audio/' + element.filename + '.mp3')));

exports.getRandomVoice = (voices) => {
    let randomPercent = parseInt(Math.random() * 100);

    let result = voices.reduce(function (r, a, i, aa) {
        return i && Math.abs(aa[r].percent - randomPercent) < Math.abs(a.percent - randomPercent) ? r : i;
    }, -1);

    return voices[result];
}

exports.dialogState = {
    event: null,
    connection: null,
    player: null,
    startVoices: null,
    randomVoices: null,
    userId: null,
    createInstance: function () {
        return Object.assign({}, this);
    },
    setConnection: function (connection) {
        this.connection = connection
    },
    setPlayer: function (player) {
        this.player = player
    },
    setStartVoices: function (startVoices) {
        this.startVoices = startVoices
    },
    setRandomVoices: function (randomVoices) {
        this.randomVoices = randomVoices
    },
    init: function (connection, player) {
        exports.debug('init');

        this.setStartVoices(exports.getStartVoices());
        this.setRandomVoices(exports.getRandomVoices());
        this.setConnection(connection);
        this.setPlayer(player);

        connection.subscribe(player);

        this.start();
    },
    start: function () {
        exports.debug('start');

        if (this.startVoices) {
            this.player.play(this.startVoices.shift());
        }

        this.event = this.startVoices.length
            ? this.start
            : this.initWait
    },
    initWait: function () {
        exports.debug('initWait');

        const self = this;
        this.connection.receiver.speaking.on('end', async (userId) => await self.doEvent(userId))
        this.event = this.answer;
    },
    answer: async function () {
        exports.debug('answer');

        if (!!this.userId) {
            return;
        }

        let answer = exports.getRandomVoice(this.randomVoices);

        await this.player.play(answer.getResource());

        this.setEvent(this[answer?.event])
        this.userId = null;
    },
    doEvent: async function (userId) {
        exports.debug({'doEvent': userId});

        if (typeof this.event === 'function') {
            await this.event();
            this.userId = userId || null;
        }
    },
    cancelCall: function () {
        exports.debug('cancelCall');

        this.connection.disconnect();

        this.event = null;
    },
    setEvent: function (event) {
        exports.debug('setEvent', event);

        this.event = event ? event : this.answer
    },
};
