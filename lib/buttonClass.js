const EventEmitter =    require('events');
const rpio =            require('rpio');

/**
 * checks status of buttonPin every 50mS for active low value.
 * emits
 * * **iplPushed** fires when button is held down during initial program load
 * * **Pushed** fires when button is pushed down
 * * **Released** fires when finger is taken off of button
 */
class Button extends EventEmitter{
    constructor(ButtonPin = 40){
        super();
        this._buttonPin = ButtonPin;
        this.pushed = false;
        this.iplPushed = false;
        rpio.open(this._buttonPin, rpio.INPUT, rpio.PULL_UP);

        if(rpio.read(this._buttonPin) == 0){
            console.log('Button on pin ' + this._buttonPin + ' held down during IPL');
            this.iplPushed = true;
            this.emit('iplPushed');
        }

        setInterval(()=>{
            if(rpio.read(this._buttonPin) == 0 && this.pushed == false){
                //console.log('button push');
                this.pushed = true;
                if(this.iplPushed == false){
                    this.emit('Pushed');
                }
            } else if(rpio.read(this._buttonPin) == 1 && this.pushed == true){
                //console.log('button released');
                this.pushed = false;
                this.iplPushed = false;
                this.emit('Released');
            }
        },50)
    }
};





module.exports = Button;
