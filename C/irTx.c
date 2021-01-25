#include <stdio.h>
#include <stdlib.h>
#include <signal.h>

#include <pigpio.h>

/*
# irTx.c
# 2017-20-09

gcc -Wall -pthread -o irTx irTx.c -lpigpio

sudo ./irTx value pin freq 
    value = 32bit integer to send,
    pin = hardware PWM pin to using BCM numbering schema (18 is physical pin 12 and PWMO)
    freq = carrier frequency to use.  38000 for NEC standard, 
*/

void sendStart(int pin, int freq){
    //printf("\nStart pulse ");
    gpioHardwarePWM(pin, freq, 500000);
    gpioSleep(0, 0, 10235);
    gpioHardwarePWM(pin, freq, 0);
    gpioSleep(0, 0, 5060);  
}

void sendEnd(int pin, int freq){
    gpioHardwarePWM(pin, freq, 500000);
    gpioSleep(0, 0, 541);
    gpioHardwarePWM(pin, freq, 0);
    //printf(" End pulse\n");
}

void sendBit(int bit, int pin, int freq){
    if (bit == 0){
        //printf("0");
        gpioHardwarePWM(pin, freq, 500000);
        gpioSleep(0, 0, 541);
        gpioHardwarePWM(pin, freq, 0);
        gpioSleep(0, 0, 516);          
    } else {
        //printf("1");
        gpioHardwarePWM(pin, freq, 500000);
        gpioSleep(0, 0, 541);
        gpioHardwarePWM(pin, freq, 0);
        gpioSleep(0, 0, 1778);             
    }
}

void sendLong(int lng, int pin, int freq){
    int t = 0;
    int bit[32];
    printf("\nSending long %i on hardware PWM BCM pin %i\n", lng, pin);    

    for (int x=0; x<32; x++){            // move the first 32 bits into an array
        t = lng & 1;
        bit[x] = t;
        lng = lng >> 1;
    }

    sendStart(pin, freq);
    for (int x=31; x>-1; x--){          // count down from 32 to send big endian foramat
        if(bit[x] == 1){
            sendBit(1, pin, freq);
        } else {
            sendBit(0, pin, freq);
        }
    }
    sendEnd(pin, freq);
}

int main(int argc, char *argv[]){
    if (argc != 4){
        printf("\nERROR...\n");
        printf("You must pass value, BCM pin for hardware PWM, and carrier frequency in Hz on command line!\n");
        printf("Try >sudo ./irTx 32895 18 38000\n");
        printf("\t451274 = 32bit integer to send.\n");
        printf("\t18 = the hardware PWM pin the irLED is connected to (18 is PWM0 on physical pin 12).\n");
        printf("\t38000 = the carrier frequency used to modulate the infrared LED\n\n");
        return -1;
    }
    int val = atoi(argv[1]);
    int pwmPin = atoi(argv[2]);
    int carFreq = atoi(argv[3]);
    
    if (gpioInitialise() < 0) {
        printf("Error with gpioInitialise\n");
        return -1;    
    } 
    
    gpioSetPad(0, 16);              // set pad 0 strength to 16 mA. Pad 0 = pins 0 to 27
    sendLong(val, pwmPin, carFreq);        
    gpioTerminate();
}

