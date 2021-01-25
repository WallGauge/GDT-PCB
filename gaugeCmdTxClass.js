const EventEmitter = require('events');
const cp = require('child_process');

const logLevel = 2
const Default_irdLedPin = 18;
const Default_modFreq = 33000;
const Default_irtxPath = './C/irTx';
const minTxTimeBetweenIrTx = 200    // absolute minimum time in milliseconds between calling /C/irTx to protect from overload
const targetTxDelay = 700;          // This is the target time in milliseconds between transmits of data

var txDelay = targetTxDelay;
var globalTxLocked = false;
var globalLastTxTime = new Date();
var txTimeoutLoop = {};

class gaugeCmdTxClass {
    constructor(irdLedPin = Default_irdLedPin, modFreq = Default_modFreq, irtxPath = Default_irtxPath) {
        this.irdLedPin = irdLedPin;
        this.modFreq = modFreq;
        this.irtxPath = irtxPath;
    };

    encode(address = 1, cmdNum = 0, value = 0) {
        if (value < 0 || value > 4095) {
            throw ('encode called with invalid value = ' + value);
        };
        if (cmdNum < 0 || cmdNum > 15) {
            throw ('encode called with invalid cmdNum = ' + cmdNum);
        };
        if (address < 0 || address > 255) {
            throw ('encode called with invalid address = ' + address);
        };

        var encodedValue = 0;
        // bits 1 - 4 hold the command, range = 0 to 16
        var y = cmdNum;
        for (var i = 0; i < 4; i++) {
            encodedValue = encodedValue << 1;
            encodedValue = encodedValue + (y & 1);
            y = y >> 1;
        }
        // bits 5 - 15 hold the data value, range = 0 to 4095
        var y = value;
        for (var i = 0; i < 12; i++) {
            encodedValue = encodedValue << 1;
            encodedValue = encodedValue + (y & 1);
            y = y >> 1;
        }
        // bits 17 - 24 = address of device, range = 0 to 255
        var y = address;
        for (var i = 0; i < 8; i++) {
            encodedValue = encodedValue << 1;
            encodedValue = encodedValue + (y & 1);
            y = y >> 1;
        }
        // bits 25 - 32 = not of device address
        var y = address;
        for (var i = 0; i < 8; i++) {
            encodedValue = encodedValue << 1;
            encodedValue = encodedValue + (~y & 1);
            y = y >> 1;
        }
        return encodedValue;
    };

    loopTx(encodedCmd) {
        clearTimeout(txTimeoutLoop);
        txTimeoutLoop = setTimeout(() => {
            this.tx(encodedCmd)
                .then((rslt) => {
                    this.loopTx(encodedCmd);
                })
                .catch((err) => {
                    console.error('Error with tx call:', err);
                });
        }, txDelay);
    };

    tx(encodedCommand) {
        return new Promise((resolve, reject) => {
            if (globalTxLocked == true) {
                console.error('irdServer irdTx command still in progress skipping!');
                reject('irdServer irdTx command still in progress skipping!');
            } else {
                globalTxLocked = true;
                var now = new Date();
                var txTimeSpan = now.getTime() - globalLastTxTime.getTime();
                if (logLevel >= 2) {
                    console.log('[' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '.' + now.getMilliseconds() + '] tx span ' + txTimeSpan + ' Transmitting CMD ' + encodedCommand + ', on hardware pin ' + this.irdLedPin + ', at ' + this.modFreq + 'Hz.');
                };
                if (txTimeSpan < minTxTimeBetweenIrTx) {
                    console.warn('Alert Throttling irdTx command. Threshold of ' + minTxTimeBetweenIrTx + ' exceded, timespan was ' + txTimeSpan + '. Setting txDelay from ' + txDelay + ' back to target of ' + targetTxDelay);
                    globalTxLocked = false;
                    txDelay = targetTxDelay;
                    reject('Throttling irdTx command. Threshold of ' + minTxTimeBetweenIrTx + ' exceded, timespan was ' + txTimeSpan);
                } else {
                    cp.exec(this.irtxPath + ' ' + encodedCommand + ' ' + this.irdLedPin + ' ' + this.modFreq, ((err, stdOut, stdErr) => {
                        if (err) {
                            console.error('error with ' + this.irtxPath + ' ' + encodedCommand + ' ' + this.irdLedPin + ' ' + this.modFreq + ' command: ', err);
                            reject('error with ' + this.irtxPath + ' ' + encodedCommand + ' ' + this.irdLedPin + ' ' + this.modFreq + ' command: ');
                        } else if (stdErr) {
                            console.error('error on stdErr ' + this.irtxPath + ' ' + encodedCommand + ' ' + this.irdLedPin + ' ' + this.modFreq + ' command: ', stdErr);
                            reject('error on stdErr ' + this.irtxPath + ' ' + encodedCommand + ' ' + this.irdLedPin + ' ' + this.modFreq + ' command: ');
                        } else {
                            resolve(stdOut);
                        };
                    }));
                    globalLastTxTime = new Date();
                    globalTxLocked = false;
                };
            };
        });
    };

};

module.exports = gaugeCmdTxClass;