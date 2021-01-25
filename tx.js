/*
    tx.js command line module for sening RGauge encoded IR commands. 
*/
var cp = require('child_process');

const logLevel = 2
const minTxTimeBetweenIrTx = 200    // absolute minimum time in milliseconds between calling /C/irTx to protect from overload
const targetTxDelay = 700;          // This is the target time in milliseconds between transmits of data
var txDelay = targetTxDelay;
var globalTxLocked = false;
var globalLastTxTime = new Date();

if (process.argv.length == 5) {
    var rG_Address = process.argv[2];
    var rG_Command = process.argv[3];
    var rG_Data = process.argv[4];
    console.log('Address: ' + rG_Address);
    console.log('Command: ' + rG_Command);
    console.log('   Data: ' + rG_Data);

    var encodedValue = gcEncode(rG_Address, rG_Command, rG_Data);

    console.log('Sending RG-Encoded IR command ' + encodedValue + ', over a 33000 carrier frequency.');

    cp.execSync('./C/irTx ' + encodedValue + ' 18 33000');

} else if (process.argv.length == 6) {
    var rG_Address = process.argv[2];
    var rG_Command = process.argv[3];
    var rG_Data = process.argv[4];
    var rG_Loop = process.argv[5];
    if (rG_Loop != 'L') {
        console.log('->' + rG_Loop + '<- Looking for letter L');
        printSyntax();
        return;
    }
    console.log('Address: ' + rG_Address);
    console.log('Command: ' + rG_Command);
    console.log('   Data: ' + rG_Data);

    var encodedValue = gcEncode(rG_Address, rG_Command, rG_Data);
    console.log('Command running in endless loop every '+ txDelay +' milliseconds, type ctl C to stop.');
    console.log('Sending RG-Encoded IR command ' + encodedValue + ', over a 33000 carrier frequency.');
    loopTx(encodedValue);
} else {
    printSyntax();
    return;
}

function loopTx(encodedCmd) {

    setTimeout(() => {
        tx(encodedCmd)
        .then((rslt)=>{
            loopTx(encodedCmd);
        })
        .catch((err)=>{
            console.error('Error with tx call:', err);
        });
    }, txDelay);
};

function tx(encodedCommand, pwmPin = 18, modFrequency = 33000) {
    return new Promise((resolve, reject) => {
        if (globalTxLocked == true) {
            console.error('irdServer irdTx command still in progress skipping!');
            reject('irdServer irdTx command still in progress skipping!');
        } else {
            globalTxLocked = true;
            var now = new Date();
            var txTimeSpan = now.getTime() - globalLastTxTime.getTime();
            if (logLevel >= 2) {
                console.log('[' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '.' + now.getMilliseconds() + '] tx span ' + txTimeSpan + ' Transmitting CMD ' + encodedCommand + ', on hardware pin ' + pwmPin + ', at ' + modFrequency + 'Hz.');
            };
            if (txTimeSpan < minTxTimeBetweenIrTx) {
                console.warn('Alert Throttling irdTx command. Threshold of ' + minTxTimeBetweenIrTx + ' exceded, timespan was ' + txTimeSpan + '. Setting txDelay from ' + txDelay + ' back to target of ' + targetTxDelay);
                globalTxLocked = false;
                txDelay = targetTxDelay;
                reject('Throttling irdTx command. Threshold of ' + minTxTimeBetweenIrTx + ' exceded, timespan was ' + txTimeSpan);
            } else {
                cp.exec('./C/irTx ' + encodedCommand + ' ' + pwmPin + ' ' + modFrequency, ((err, stdOut, stdErr) => {
                    if (err) {
                        console.error('error with ./C/irTx ' + encodedCommand + ' ' + pwmPin + ' ' + modFrequency + ' command: ', err);
                        reject('error with ./C/irTx ' + encodedCommand + ' ' + pwmPin + ' ' + modFrequency + ' command: ');
                    } else if (stdErr) {
                        console.error('error on stdErr ./C/irTx ' + encodedCommand + ' ' + pwmPin + ' ' + modFrequency + ' command: ', stdErr);
                        reject('error on stdErr ./C/irTx ' + encodedCommand + ' ' + pwmPin + ' ' + modFrequency + ' command: ');
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

function printSyntax() {
    console.log('tx.js requires command line parameters');
    console.log('try -->sudo node tx.js 170 9 500<--');
    console.log('     170 = address of device to send command (170 = broadcast address).');
    console.log('       9 = command number (8 is the set raw stepper value command and stay awake after).');
    console.log('     500 = data value (in this case it is the raw stepper value).');
    console.log('       L = is an optional that will send 2 packets 700mS apart every 1.4 seconds');
    console.log('\nCommand Numbers:');
    console.log(' 0	Check Battery Voltage (Not Used in current firmware)');
    console.log(' 1	Reset');
    console.log(' 2	Zero Needle');
    console.log(' 3	Set Gauge Address. Must do a Gauge Identify command first');
    console.log(' 4	Set Wake time (default = 60 seconds)');
    console.log(' 5	Set Sleep time (default = 300 seconds(5min))');
    console.log(' 6	Start cycle sleep in (seconds from now, 0 = cancel)');
    console.log(' 8	Set Raw Stepper Value and go to sleep');
    console.log(' 9	Set Raw Stepper Value and stay awake');
    console.log('10	LED CMD data value: 0=off, 1=on, 2=on when awake');
    console.log('15	Identify gauge and set start cycle sleep (seconds from now, 0 = cancel)');
}

function gcEncode(address = 1, cmdNum = 0, value = 0) {
    if (value < 0 || value > 4095) {
        console.log('rGaugeEncode called with invalid value = ' + value);
        return 0;
    }
    if (cmdNum < 0 || cmdNum > 15) {
        console.log('rGaugeEncode called with invalid cmdNum = ' + cmdNum);
        return 0;
    }
    if (address < 0 || address > 255) {
        console.log('rGaugeEncode called with invalid address = ' + address);
        return 0;
    }

    //console.log('cmdNum = '+ cmdNum + ', value = ' + value + ', address = ' + address);
    var x = 0;
    // bits 1 - 4 hold the command, range = 0 to 16
    var y = cmdNum;
    for (var i = 0; i < 4; i++) {
        x = x << 1;
        x = x + (y & 1);
        y = y >> 1;
    }
    // bits 5 - 15 hold the data value, range = 0 to 4095
    var y = value;
    for (var i = 0; i < 12; i++) {
        x = x << 1;
        x = x + (y & 1);
        y = y >> 1;
    }
    // bits 17 - 24 = address of device, range = 0 to 255
    var y = address;
    for (var i = 0; i < 8; i++) {
        x = x << 1;
        x = x + (y & 1);
        y = y >> 1;
    }
    // bits 25 - 32 = not of device address
    var y = address;
    for (var i = 0; i < 8; i++) {
        x = x << 1;
        x = x + (~y & 1);
        y = y >> 1;
    }
    var adnMask = x;
    //console.log('value in binary = '+ dec2bin(adnMask));
    //console.log('value to Send   = ' + x);
    return x;
}

function dec2bin(dec) {
    return (dec >>> 0).toString(2);
}

function bin2dec(bin) {
    return parseInt(bin, 2).toString(10);
}
