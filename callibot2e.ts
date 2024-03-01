// V0.0.1
// Calli:bot 2E
// 12/2020 Knotech GmbH
// mit Optimierungen von M. Klein

enum C2eMotor {
    links,
    rechts,
    beide
}

enum C2eStop {
    //% block="auslaufend"
    Frei,
    //% block="bremsend"
    Bremsen
}

enum C2eServo {
    //% block="Nr.1"
    Servo1,
    //% block="Nr.2"
    Servo2
}

enum C2eSensor {
    links,
    rechts
}

enum C2eSensorStatus {
    hell,
    dunkel
}

enum C2eEinheit {
    cm,
    mm
}

enum C2eRgbLed {
    //% block="links vorne"
    LV,
    //% block="rechts vorne"
    RV,
    //% block="links hinten"
    LH,
    //% block="rechts hinten"
    RH,
    //% block="alle"
    All
}

enum C2eRgbColor {
    red = 0xff0000,
    green = 0x00ff00,
    blue = 0x0000ff,
    yellow = 0xffff00,
    violett = 0xa300ff,
    aqua = 0x00ffdc,
    white = 0xffffff,
    black = 0x000000
}

enum C2eDir {
    //% block="vorwärts"
    vorwaerts = 0,
    //% block="rückwärts"
    rückwaerts = 1
}

enum C2eState {
    aus,
    an
}

enum C2eSensorWait {
    //% block="Entfernung (cm)"
    distanceCm,
    //% block="Entfernung (mm)"
    distance,
    //% block="Helligkeit"
    brightness,
    //% block="Temperatur"
    temperature,
    //% block="Lautstärke"
    soundLevel,
    //% block="Beschleunigung X"
    accellX,
    //% block="Beschleunigung Y"
    accellY,
    //% block="Beschleunigung Z"
    accellZ
}

enum C2eCheck {
    //% block="="
    equal,
    //% block="<"
    lessThan,
    //% block=">"
    greaterThan
}


//% weight=50 color="#FF0000" icon="\uf013" block="Calli:bot 2E"
namespace calliBot2E {

    let c2Initialized = 0;
    let c2LedState = 0;
    let c2FunkAktiv = 0;
    let c2IsBot2 = 0;
    //let KFunkInitialized = 0

    /**
    * Custom color picker
    */
    //% blockId=CallibotNumberPicker block="%value"
    //% blockHidden=true
    //% shim=TD_ID
    //% value.fieldEditor="colornumber" value.fieldOptions.decompileLiterals=true
    //% weight=150
    //% value.fieldOptions.colours='["#ff0000","#00ff00","#0000ff","#ffff00","#a300ff","#00ffdc","#ffffff","#000000"]'
    //% value.fieldOptions.columns=4 value.fieldOptions.className='rgbColorPicker'  
    export function CallibotNumberPicker(value: number) {
        return value;
    }
    
    function init() {
        if (c2Initialized != 1) {
            c2Initialized = 1;
            let buffer = pins.i2cReadBuffer(0x21, 1);
            if ((buffer[0] & 0x80) != 0){        // Check if it's a CalliBot2
                c2IsBot2 = 1;
                stopAll();
            }
            else{
                led(C2eMotor.links, C2eState.aus);
                led(C2eMotor.rechts, C2eState.aus);
                motorStop(C2eMotor.beide, C2eStop.Bremsen);
                rgbLed(C2eRgbLed.All, 0, 0, 0);
                rgbLedEnh(C2eRgbLed.All, 0, 0);
            }

        }
    }

    function writeMotor(nr: C2eMotor, direction: C2eDir, speed: number) {
        let buffer = pins.createBuffer(3)
        init()
        buffer[1] = direction;
        buffer[2] = speed;
        switch (nr) {
            case C2eMotor.links:
                buffer[0] = 0x00;
                pins.i2cWriteBuffer(0x20, buffer);
                break;
            case C2eMotor.beide:
                buffer[0] = 0x00;
                pins.i2cWriteBuffer(0x20, buffer);
            case C2eMotor.rechts:
                buffer[0] = 0x02;
                pins.i2cWriteBuffer(0x20, buffer);
                break;
        }
    }

    //% speed.min=5 speed.max=100 speed.defl=50
    //% blockId=c2eMotor block="Schalte Motor |%KMotor| |%KDir| mit |%number| \\%"
    export function motor(nr: C2eMotor, direction: C2eDir, speed: number) {
        if (speed > 100) {
            speed = 100
        }
        if (speed < 0) {
            speed = 0
        }
        speed = speed * 255 / 100
        writeMotor(nr, direction, speed);
    }

    //="Stoppe Motor $nr"
    //% blockId=c2eMotorStop block="Stoppe Motor |%nr| |%mode"
    export function motorStop(nr: C2eMotor, mode: C2eStop) {
        if (mode == C2eStop.Frei) {
            writeMotor(nr, 0, 1);
        }
        else {
            writeMotor(nr, 0, 0);
        }
    }

    //% pos.min=0 pos.max=180
    //% pos.shadow="protractorPicker"
    //% blockId=c2eServo block="Bewege Servo |%nr| auf |%pos|°"
    export function servo(nr: C2eServo, pos: number) {
        let buffer = pins.createBuffer(2)
        if (pos < 0) {
            pos = 0
        }
        if (pos > 180) {
            pos = 180
        }
        switch (nr) {
            case C2eServo.Servo1:
                buffer[0] = 0x14;
                break;
            case C2eServo.Servo2:
                buffer[0] = 0x15;
                break;
        }
        buffer[1] = pos
        pins.i2cWriteBuffer(0x20, buffer)
    }

    //% blockId=c2eLed block="Schalte LED |%KSensor| |%KState"
    export function led(led: C2eMotor, state: C2eState) {
        let buffer = pins.createBuffer(2)
        init()
        buffer[0] = 0;      // SubAddress of LEDs
        //buffer[1]  Bit 0/1 = state of LEDs
        switch (led) {
            case C2eMotor.links:
                if (state == C2eState.an) {
                    c2LedState |= 0x01
                }
                else {
                    c2LedState &= 0xFE
                }
                break;
            case C2eMotor.rechts:
                if (state == C2eState.an) {
                    c2LedState |= 0x02
                }
                else {
                    c2LedState &= 0xFD
                }
                break;
            case C2eMotor.beide:
                if (state == C2eState.an) {
                    c2LedState |= 0x03
                }
                else {
                    c2LedState &= 0xFC
                }
                break;
        }
        buffer[1] = c2LedState;
        pins.i2cWriteBuffer(0x21, buffer);
    }

    //% blockId=c2eRgbEnh block="Schalte Beleuchtung Farbe |$led| Farbe|$color| Helligkeit|$intensity|(0..8)"
    //% intensity.min=0 intensity.max=8 intensity.defl=6
    //% color.shadow="CallibotNumberPicker"   
    export function rgbLedEnh(led: C2eRgbLed, color: number, intensity: number) {
        let len = 0;
        let tColor = 0;
        let index = 0;
        init()
        if (intensity < 0) {
            intensity = 0;
        }
        if (intensity > 8) {
            intensity = 8;
        }
        if (intensity > 0) {
            intensity = (intensity * 2 - 1) * 16;
            switch (color) {
                case C2eRgbColor.red:
                    tColor = 0x02
                    break;
                case C2eRgbColor.green:
                    tColor = 0x01
                    break;
                case C2eRgbColor.blue:
                    tColor = 0x04
                    break;
                case C2eRgbColor.yellow:
                    tColor = 0x03
                    break;
                case C2eRgbColor.aqua:
                    tColor = 0x05
                    break;
                case C2eRgbColor.violett:
                    tColor = 0x06
                    break;
                case C2eRgbColor.white:
                    tColor = 0x07
                    break;
                case C2eRgbColor.black:
                    tColor = 0x07
                    intensity = 0
                    break;
            }
        }
        switch (led) {
            case C2eRgbLed.LH:
                index = 2;
                len = 2;
                break;
            case C2eRgbLed.RH:
                index = 3;
                len = 2;
                break;
            case C2eRgbLed.LV:
                index = 1;
                len = 2;
                break;
            case C2eRgbLed.RV:
                index = 4;
                len = 2;
                break;
            case C2eRgbLed.All:
                index = 1;
                len = 5;
                break;
        }
        let buffer = pins.createBuffer(len)
        buffer[0] = index;
        buffer[1] = intensity | tColor
        if (len == 5) {
            buffer[2] = buffer[1];
            buffer[3] = buffer[1];
            buffer[4] = buffer[1];
        }
        pins.i2cWriteBuffer(0x21, buffer);
        basic.pause(10);
    }
    
    //% blockId=c2eRgb block="Schalte Beleuchtung $led rot $red grün $green blau $blue"
    //% red.min=0 red.max=16
    //% green.min=0 green.max=16
    //% blue.min=0 blue.max=16
    //% inlineInputMode=inline
    export function rgbLed(led: C2eRgbLed, red: number, green: number, blue: number) {
        let index = 0;
        let buffer = pins.createBuffer(5)
        init()
        if (led != C2eRgbLed.All){
            switch (led) {
                case C2eRgbLed.LH:
                    index = 2;
                    break;
                case C2eRgbLed.RH:
                    index = 3;
                    break;
                case C2eRgbLed.LV:
                    index = 1;
                    break;
                case C2eRgbLed.RV:
                    index = 4;
                    break;

            }
            buffer[0] = 0x03;
            buffer[1] = index;
            buffer[2] = red;
            buffer[3] = green;
            buffer[4] = blue;
            pins.i2cWriteBuffer(0x22, buffer);
        }
        else { // all leds, repeat 4 times
            for (index = 1; index <5; index++){
                buffer[0] = 0x03;
                buffer[1] = index;
                buffer[2] = red;
                buffer[3] = green;
                buffer[4] = blue;
                pins.i2cWriteBuffer(0x22, buffer);
            }
        }
    }

    //% blockId=c2eStopAll block="Alles abschalten"
    //% advanced=true
    export function stopAll (){
        let buffer = pins.createBuffer(1)
        buffer[0] = 0x01;
        pins.i2cWriteBuffer(0x22, buffer);
    }

    //% blockId=c2eResetEncoder block="Lösche Encoder-Zähler |%encoder"
    //% advanced=true
    export function resetEncoder (encoder: C2eMotor) {
        let bitMask = 0;
        switch (encoder){
            case C2eMotor.links:
                bitMask = 1;
                break;
            case C2eMotor.rechts:
                bitMask = 2;
                break;
            case C2eMotor.beide:
                bitMask = 3;
                break;
        }
        let buffer = pins.createBuffer(2)
        buffer[0] = 5;
        buffer[1] = bitMask;
        pins.i2cWriteBuffer(0x22, buffer);
    }

    //% blockId=c2eReadBumper block="Stoßstange |%sensor| |%status"
    //% color="#00C040"
    export function readBumperSensor(sensor: C2eSensor, status: C2eState): boolean{
        let result = false
        let buffer = pins.i2cReadBuffer(0x21, 1);
        init();
        if (sensor == C2eSensor.links) {
            buffer[0] &= 0x08
        }
        if (sensor == C2eSensor.rechts) {
            buffer[0] &= 0x04
        }

        switch (status) {
        case C2eState.an:
            if (buffer[0] != 0) {
                result = true
            }
            else {
                result = false
            }
            break
        case C2eState.aus:
            if (buffer[0] == 0) {
                result = true
            }
            else {
                result = false
            }
            break
        }
        return result;
    }



    //% blockID=c2eReadLine block="Liniensensor |%sensor| |%status"
    //% color="#00C040"  
    export function readLineSensor(sensor: C2eSensor, status: C2eSensorStatus): boolean {
        let result = false
        let buffer = pins.i2cReadBuffer(0x21, 1);
        init();
        if (sensor == C2eSensor.links) {
            buffer[0] &= 0x02
        }
        if (sensor == C2eSensor.rechts) {
            buffer[0] &= 0x01
        }
        switch (status) {
            case C2eSensorStatus.hell:
                if (buffer[0] != 0) {
                    result = true
                }
                else {
                    result = false
                }
                break
            case C2eSensorStatus.dunkel:
                if (buffer[0] == 0) {
                    result = true
                }
                else {
                    result = false
                }
                break
        }
        return result
    }

    //% blockID=c2eDistance color="#00C040" block="Entfernung |%modus" blockGap=8
    export function distance(modus: C2eEinheit): number {
        let buffer = pins.i2cReadBuffer(0x21, 3)
        init()
        if (modus == C2eEinheit.mm) {
            return 256 * buffer[1] + buffer[2]
        }
        else {
            return (256 * buffer[1] + buffer[2]) / 10
        }
    }

    
    //% blockID=c2eEncoder color="#00C040" block="Encoderwert |%encoder"
    //% advanced = true
    export function encoderValue (encoder: C2eSensor): number {
        let result: number;
        let index: number;

        let wbuffer = pins.createBuffer(1);
        wbuffer[0] = 0x91;
        pins.i2cWriteBuffer(0x22, wbuffer);        
        let buffer = pins.i2cReadBuffer(0x22, 9);
        if (encoder == C2eSensor.links){
            index = 1;
        }
        else {
            index = 5;
        }
        result = buffer[index + 3];
        result = result * 256 + buffer[index + 2];
        result = result * 256 + buffer[index + 1];
        result = result * 256 + buffer[index];
        result = -(~result + 1);
        return result;
    }

    //% blockID=c2eBattVoltage color="#00C040" block="Batteriespannung (mV)"
    //% advanced = true
    export function batteryVoltage (): number {
        let wbuffer = pins.createBuffer(1);
        wbuffer[0] = 0x83;
        pins.i2cWriteBuffer(0x22, wbuffer);
        let buffer = pins.i2cReadBuffer(0x22, 3);
        return (buffer[2] * 256 + buffer[1]);
    }

    //% blockID=c2eLineRaw color="#00C040" block="Spursensor $sensor analog (mV)"
    //% advanced = true
    export function lineSensorRaw (sensor: C2eSensor): number {
        let wBuffer = pins.createBuffer(1);
        let sensorValue: number;

        wBuffer[0] = 0x84;
        pins.i2cWriteBuffer(0x22, wBuffer);
        let buffer = pins.i2cReadBuffer(0x22,5);
        if (sensor == C2eSensor.links){
            sensorValue = buffer[2] * 256 + buffer[1];
        }
        else {
            sensorValue = buffer[4] * 256 + buffer[3];
        }
        return sensorValue;
    }

    //% blockID=c2eSwOn color="#00C040" block="Taster An"
    //% advanced = true
    export function switchOn (): boolean {
        let buffer = pins.i2cReadBuffer(0x21, 1);
        if (buffer[0] & 0x10){
            return true;
        }
        else {
            return false;
        }
    }

    //% blockID=c2eSwOff color="#00C040" block="Taster Aus"
    //% advanced = true
    export function switchOff (): boolean {
        let buffer = pins.i2cReadBuffer(0x21, 1);
        if (buffer[0] & 0x20){
            return true;
        }
        else {
            return false;
        }
    }

    //% blockID=c2eWaitUntil color="#0082E6" block="Warte bis |%sensor| |%check| |%value"
    export function waitForSensor(sensor: C2eSensorWait, check: C2eCheck, value: number) {
        let abbruch = 0
        let sensorValue = 0
        while (abbruch == 0) {
            switch (sensor) {
                case C2eSensorWait.distance:
                    sensorValue = distance(C2eEinheit.mm)
                    break;
                case C2eSensorWait.distanceCm:
                    sensorValue = distance(C2eEinheit.cm)
                    break;
                case C2eSensorWait.accellX:
                    sensorValue = input.acceleration(Dimension.X)
                    break;
                case C2eSensorWait.accellY:
                    sensorValue = input.acceleration(Dimension.Y)
                    break;
                case C2eSensorWait.accellZ:
                    sensorValue = input.acceleration(Dimension.Z)
                    break;
                case C2eSensorWait.brightness:
                    sensorValue = input.lightLevel()
                    break;
                case C2eSensorWait.temperature:
                    sensorValue = input.temperature()
                    break;
                case C2eSensorWait.soundLevel:
                    sensorValue = input.soundLevel()
                    break;
            }
            switch (check) {
                case C2eCheck.equal:
                    if (sensorValue == value)
                        abbruch = 1
                    break;
                case C2eCheck.lessThan:
                    if (sensorValue < value)
                        abbruch = 1
                    break;
                case C2eCheck.greaterThan:
                    if (sensorValue > value)
                        abbruch = 1
                    break;
            }
        }
    }

    //% blockID=c2eWait4Line color="#0082E6" block="Warte bis Liniensensor $sensor = $status"
    export function waitLineSensor(sensor: C2eSensor, status: C2eSensorStatus) {
        while (!(readLineSensor(sensor, status))) {
        }
    }

    //% blockId=c2eWait4Bumper color="#0082E6" block="Warte bis Stoßstange $sensor = $status"
    export function waitBumperSensor(sensor: C2eSensor, status: C2eState) {
        while (!(readBumperSensor(sensor, status))) {
        }
    }



}
