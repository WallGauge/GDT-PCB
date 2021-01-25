const GaugeCmdTxClass = require('./gaugeCmdTxClass');
const cfg = require('./testConfig.json');

const gcTx = new GaugeCmdTxClass(cfg.irdLedPin);

console.log('Sending goto raw position 100')
let cmdToSend = gcTx.encode(1, 8, 100);
gcTx.loopTx(cmdToSend);

setTimeout(()=>{
    console.log('Sending goto raw postion 200')
    let cmdToSend = gcTx.encode(1, 8, 200);
gcTx.loopTx(cmdToSend);
}, 60000);

function printCommands() {
    console.log('\nCommand Numbers:');
    console.log(' 0	(Not Used in current firmware)');
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