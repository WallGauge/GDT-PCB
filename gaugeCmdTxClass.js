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
    /**
     * This class is provided as a sample driver for the WallGauge GDT-PCB.  To send a gauge command first call the encode method to get an encoded command.
     * Then send the encoded command to the WallGauge by passing it to the loopTx method.
     * @param {number} irdLedPin Defaults to 18. This is the pin that drives the infred LEDs 
     * @param {number} modFreq Defaults to 33000. This is the modulation frequency used by the pins hardware PWM circuit
     * @param {string} irtxPath Defaults to './C/irTx'. This is the locaiton of the C utility that controls the hardware pin
     */
    constructor(irdLedPin = Default_irdLedPin, modFreq = Default_modFreq, irtxPath = Default_irtxPath) {
        this.irdLedPin = irdLedPin;
        this.modFreq = modFreq;
        this.irtxPath = irtxPath;
    };

    /**
     * Creates a command that can be transmitted to a WallGauge from an Address, Command, and Value passed to the method.
     * This method will throw if any of the paremters are out of range.
     * @param {number} address valid range 1 to 255
     * @param {number} cmdNum valid range 0 to 15
     * @param {number} value valid range is 0 to 4095
     * @returns {number} returns a 32 bit number representing the encoded command
     */
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

    /**
     * This method will continually send an encoded command to all WallGauges in the same room as the GDT-PCB.
     * Since WallGauges sleep for most of the time, commands must be sent over and over for them be received when they wake up and listen for data.
     * All gauges within range will receive this command but only the gauge with the matching gauge address will respond to it.  
     * 
     * To send a new command just call this method again with the new encoded command and it will replace the existing command that is being sent.
     * @param {number} encodedCmd 
     */
    loopTx(encodedCmd) {
        clearTimeout(txTimeoutLoop);
        txTimeoutLoop = setTimeout(() => {
            this._tx(encodedCmd)
                .then((rslt) => {
                    this.loopTx(encodedCmd);
                })
                .catch((err) => {
                    console.error('Error with tx call:', err);
                });
        }, txDelay);
    };

    /**
     * This method calls C utility that drives the GDT-PCB infrared LED pin.  You shouldn't need to call this method directly. Instead use the lootTx method to send your command.
     * Do not call this method more than every 200mS as that may damage the power transistors on the PCB or the infrared LEDs
     * This class will reject its promise if called too often. 
     * @param {number} encodedCommand 
     * @returns {Promise}
     */
    _tx(encodedCommand) {
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