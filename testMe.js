const GaugeCmdTxClass = require('./gaugeCmdTxClass');
const cfg = require('./testConfig.json');

const gcTx = new GaugeCmdTxClass(cfg.irdLedPin);

let cmdToSend = gcTx.encode(1, 8, 100);
gcTx.loopTx(cmdToSend);
