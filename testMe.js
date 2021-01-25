const GaugeCmdTxClass = require('./gaugeCmdTxClass');
const cfg = require('./testConfig.json');

const gcTx = new GaugeCmdTxClass(cfg.irdLedPin);

var wallGaugeAdd = 1        // Valid range 1 to 255
var wallGuageCmd = 8        // Valid range 0 to 15
var wallGaugeData = 100     // Valid range is 0 to 4095
printCommands()

console.log('Sending test data to a WallGauge with the address of ' + wallGaugeAdd + ', command number = ' + wallGuageCmd + ', data value = ' + wallGaugeData);
let cmdToSend = gcTx.encode(wallGaugeAdd, wallGuageCmd, wallGaugeData);
gcTx.loopTx(cmdToSend);

setTimeout(() => {
    console.log('After 60 seconds sending new command...');
    wallGaugeData = 200;
    console.log('Sending test data to a WallGauge with the address of ' + wallGaugeAdd + ', command number = ' + wallGuageCmd + ', data value = ' + wallGaugeData);
    let cmdToSend = gcTx.encode(wallGaugeAdd, wallGuageCmd, wallGaugeData);
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
    console.log('----------------------------------------------------------------------------\n');
}