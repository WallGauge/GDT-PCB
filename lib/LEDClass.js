const rpio =        require('rpio');
/*
The irdTX board for PiZero
const ButtonPair = 40;      //physical pin 40 = BCM 21
const LedGreenPin = 10;     //physical pin 8 = BCM 14 | 10 = BCM 15 is also on the gen 2 RG IRTx SMT boat
const LedRedPin = 8;
*/
const state = {
    off:            0x00,
    on:             0x01,
    fastFlash:      0x02,
    slowFlash:      0x03,
    _nuberFlashing: 0xFF
};


class LED{
    constructor(LEDpin = 10){
        this.LED = LEDpin;
        this.targetState = state.off
        this.flashStatusTimmer;
        rpio.open(this.LED, rpio.OUTPUT, rpio.LOW);
        this.currentState = '';

        setInterval(()=>{
            if(this.currentState != this.targetState){

                switch(this.targetState){
                    case state.off:
                        clearInterval(this.flashStatusTimmer);
                        rpio.write(this.LED, rpio.LOW);
                        this.currentState=state.off;
                    break;

                    case state.on:
                        clearInterval(this.flashStatusTimmer);
                        rpio.write(this.LED, rpio.HIGH);
                        this.currentState=state.on;
                    break;

                    case state.fastFlash:   
                        clearInterval(this.flashStatusTimmer);                                   
                        var delayMS = 250
                        this.currentState=state.fastFlash;
                        this.flashStatusTimmer = setInterval(()=>{
                            rpio.write(this.LED, rpio.HIGH);
                            var offTime = delayMS - 125;
                            setTimeout(()=>{rpio.write(this.LED, rpio.LOW);}, offTime)
                        }, delayMS);
                   break; 

                   case state.slowFlash:   
                        clearInterval(this.flashStatusTimmer);                                   
                        var delayMS = 1000
                        this.currentState = state.slowFlash;
                        this.flashStatusTimmer = setInterval(()=>{
                            rpio.write(this.LED, rpio.HIGH);
                            var offTime = delayMS - 500;
                            setTimeout(()=>{rpio.write(this.LED, rpio.LOW);}, offTime)
                        }, delayMS);
                  break; 

                  case state._nuberFlashing:
                        this.currentState = this.targetState  //this state is used when flashing a number just ignore it. 
                  break;

                    default:
                        console.log('ERROR no case for this.targetSate = ' + this.targetState);
                        this.currentState = this.targetState;
                    break;
                }
                //console.log('LED = ' + this.currentState);
            }

            if(rpio.read(this.LED) == 0 && this.targetState == state.on){
                //console.log('LED is thought to be on but is actually off. Turing on.');
                this.currentState = state.off;
            }
            if(rpio.read(this.LED) == 1 && this.targetState == state.off){
                //console.log('LED is thought to be off but is actually on. Turing off.');
                this.currentState = state.on;
            }
            
        },50);
    };
    setTo(newState =  state.off){
        this.targetState = newState;
    }

    flashSixDigitPassCode(codeAsString = '123456'){
        this.targetState = state._nuberFlashing
        var padStr = codeAsString.padStart(6,'0');
        var nums = padStr.split('');
        const msBtweenDigits = 1000;

        var flashingDonePromise = new Promise(async (resolve, reject)=>{
            await this._flash(nums[0], this.LED);
            await new Promise((resolve, reject) => setTimeout(resolve, msBtweenDigits));
            await this._flash(nums[1], this.LED);
            await new Promise((resolve, reject) => setTimeout(resolve, msBtweenDigits));
            await this._flash(nums[2], this.LED);
            await new Promise((resolve, reject) => setTimeout(resolve, msBtweenDigits));
            await this._flash(nums[3], this.LED);
            await new Promise((resolve, reject) => setTimeout(resolve, msBtweenDigits));
            await this._flash(nums[4], this.LED);
            await new Promise((resolve, reject) => setTimeout(resolve, msBtweenDigits));
            await this._flash(nums[5], this.LED);
            await new Promise((resolve, reject) => setTimeout(resolve, msBtweenDigits));
            resolve('done flashing ' + padStr);
        })

        return flashingDonePromise;
    }

    _flash(number, ledPin){
        const msOn = 300;
        const msOff = 200;
        let promise = new Promise(async (resolve, reject)=>{
            //console.log('flashing -> ' + number);
            for(var i = 0; i < number; i++){
                if(this.currentState == state._nuberFlashing){rpio.write(ledPin, rpio.HIGH)};
                await new Promise((resolve, reject) => setTimeout(resolve, msOn));
                if(this.currentState == state._nuberFlashing){rpio.write(ledPin, rpio.LOW)};
                await new Promise((resolve, reject) => setTimeout(resolve, msOff));
            }
            resolve('flashed ' + number);
        });
    
        return promise;
    
    
    }


};

function flash(number, ledPin){
    let promise = new Promise(async (resolve, reject)=>{
        console.log('flashing -> ' + number);
        for(var i = 0; i < number; i++){
            rpio.write(ledPin, rpio.HIGH);
            await new Promise((resolve, reject) => setTimeout(resolve, 200));
            rpio.write(ledPin, rpio.LOW);
            await new Promise((resolve, reject) => setTimeout(resolve, 200));
        }
        resolve('flashed ' + number);
    });

    return promise;
}
/*
async function flashPasscode(passCode){ //This function was pulled from app.js and placed here to save it
    const msBetweenNumbers = 2000;
    var greenLedStateAtStart = greenLED.currentState;
    if(greenLED.currentState == led._nuberFlashing){
      console.log('Skipping flashPasscode already flashing...');
      return;
    }
    console.log('flashing pass code (' + passCode +')');  
    greenLED.setTo(led.off);
    redLED.setTo(led.on);
    await new Promise((resolve, reject) => setTimeout(resolve, msBetweenNumbers));      
    redLED.setTo(led.off)
    await greenLED.flashSixDigitPassCode(passCode);

    if(greenLED.currentState == led._nuberFlashing){
      redLED.setTo(led.on)
      await new Promise((resolve, reject) => setTimeout(resolve, msBetweenNumbers));      
      redLED.setTo(led.off)
      console.log('Repeating flash pass code ' + passCode);
      await greenLED.flashSixDigitPassCode(passCode);
    };

    if(greenLED.currentState == led._nuberFlashing){
      redLED.setTo(led.on)
      await new Promise((resolve, reject) => setTimeout(resolve, msBetweenNumbers));      
      redLED.setTo(led.off)
      console.log('Repeating flash pass code ' + passCode);
      await greenLED.flashSixDigitPassCode(passCode);
    };

    if(greenLED.currentState == led._nuberFlashing){
      greenLED.setTo(greenLedStateAtStart);
    }
  }
*/

module.exports = LED;
module.exports.state = state;
