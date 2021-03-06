'use strict';

const Logger = require('../helper/logger.js');
const MeApi = require('../helper/me.js');

class CarAccessory {
  constructor(api, accessory) {
    this.api = api;
    this.accessory = accessory;

    this.polling = this.accessory.context.config.polling;

    this.me = new MeApi(this.accessory, this.api);

    this.getServices();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  async getServices() {
    let serviceLock = this.accessory.getServiceById(this.api.hap.Service.LockMechanism, 'CarLock');
    let serviceBattery = this.accessory.getService(this.api.hap.Service.BatteryService);
    let serviceDoor = this.accessory.getServiceById(this.api.hap.Service.ContactSensor, 'CarDoors');
    let serviceWindow = this.accessory.getServiceById(this.api.hap.Service.ContactSensor, 'CarWindows');
    let serviceLight = this.accessory.getServiceById(this.api.hap.Service.Lightbulb, 'CarLights');

    let serviceHumidityOld = this.accessory.getServiceById(this.api.hap.Service.HumiditySensor, 'tank');
    let serviceHumidityTank = this.accessory.getServiceById(this.api.hap.Service.HumiditySensor, 'CarFuelTankHumidity');
    let serviceHumidityBattery = this.accessory.getServiceById(
      this.api.hap.Service.HumiditySensor,
      'CarElectricBatteryHumidity'
    );
    let serviceLightbulbTank = this.accessory.getServiceById(this.api.hap.Service.Lightbulb, 'CarFuelTankLightbulb');
    let serviceLightbulbBattery = this.accessory.getServiceById(
      this.api.hap.Service.Lightbulb,
      'CarElectricBatteryLightbulb'
    );

    if (serviceHumidityOld) {
      Logger.info('Removing (old) Humidity service', this.accessory.displayName);
      this.accessory.removeService(serviceHumidityOld);
    }

    //Lock
    if (!serviceLock) {
      Logger.info('Adding LockMechanism service', this.accessory.displayName);
      serviceLock = this.accessory.addService(this.api.hap.Service.LockMechanism, 'Lock', 'CarLock');
    }

    serviceLock.getCharacteristic(this.api.hap.Characteristic.LockTargetState).onSet((state) => {
      Logger.info('Can not change lock state. Not supported at the moment!', this.accessory.displayName);

      setTimeout(() => {
        serviceLock.getCharacteristic(this.api.hap.Characteristic.LockTargetState).updateValue(state ? 0 : 1);

        serviceLock.getCharacteristic(this.api.hap.Characteristic.LockCurrentState).updateValue(state ? 0 : 1);
      }, 500);
    });

    serviceLock.getCharacteristic(this.api.hap.Characteristic.LockCurrentState).on('change', (state) => {
      if (state.oldValue !== state.newValue)
        Logger.info('Car trunk lock ' + (state.newValue ? 'secured' : 'unsecured'), this.accessory.displayName);
    });

    //Battery
    if (!serviceBattery) {
      Logger.info('Adding Battery service', this.accessory.displayName);
      serviceBattery = this.accessory.addService(this.api.hap.Service.BatteryService);
    }

    serviceBattery.getCharacteristic(this.api.hap.Characteristic.BatteryLevel).on('change', (state) => {
      if (state.oldValue !== state.newValue)
        Logger.info(
          'Fuel tank/Battery changed from ' + state.oldValue + '%' + ' to ' + state.newValue + '%',
          this.accessory.displayName
        );
    });

    if (this.accessory.context.config.hybridVehicle) {
      //Humidity
      if (this.accessory.context.config.tankBatteryType === 'HUMIDITY') {
        if (!serviceHumidityTank) {
          Logger.info('Adding Humidity (tank) service', this.accessory.displayName);
          serviceHumidityTank = this.accessory.addService(
            this.api.hap.Service.HumiditySensor,
            'Tank',
            'CarFuelTankHumidity'
          );
        }
        if (!serviceHumidityBattery) {
          Logger.info('Adding Humidity (battery) service', this.accessory.displayName);
          serviceHumidityBattery = this.accessory.addService(
            this.api.hap.Service.HumiditySensor,
            'Battery',
            'CarElectricBatteryHumidity'
          );
        }
      } else {
        if (serviceHumidityTank) {
          Logger.info('Removing Humidity (tank) service', this.accessory.displayName);
          this.accessory.removeService(serviceHumidityTank);
        }
        if (serviceHumidityBattery) {
          Logger.info('Removing Humidity (battery) service', this.accessory.displayName);
          this.accessory.removeService(serviceHumidityBattery);
        }
      }

      //Lightbulb
      if (this.accessory.context.config.tankBatteryType === 'LIGHTBULB') {
        if (!serviceLightbulbTank) {
          Logger.info('Adding Lightbulb (tank) service', this.accessory.displayName);
          serviceLightbulbTank = this.accessory.addService(
            this.api.hap.Service.Lightbulb,
            'Tank',
            'CarFuelTankLightbulb'
          );
        }
        if (!serviceLightbulbBattery) {
          Logger.info('Adding Lightbulb (battery) service', this.accessory.displayName);
          serviceLightbulbBattery = this.accessory.addService(
            this.api.hap.Service.Lightbulb,
            'Battery',
            'CarElectricBatteryLightbulb'
          );
        }

        if (!serviceLightbulbTank.testCharacteristic(this.api.hap.Characteristic.Brightness))
          serviceLightbulbTank.addCharacteristic(this.api.hap.Characteristic.Brightness);

        if (!serviceLightbulbBattery.testCharacteristic(this.api.hap.Characteristic.Brightness))
          serviceLightbulbBattery.addCharacteristic(this.api.hap.Characteristic.Brightness);

        //serviceLightbulbBattery.getCharacteristic(this.api.hap.Characteristic.On)
        //.onSet(this.setBattery.bind(this, serviceLightbulbBattery, this.api.hap.Characteristic.On, 'Battery State'));

        serviceLightbulbBattery
          .getCharacteristic(this.api.hap.Characteristic.Brightness)
          .onSet(
            this.setBattery.bind(
              this,
              serviceLightbulbBattery,
              this.api.hap.Characteristic.Brightness,
              'Battery Brightness'
            )
          );

        //serviceLightbulbTank.getCharacteristic(this.api.hap.Characteristic.On)
        //.onSet(this.setBattery.bind(this, serviceLightbulbTank, this.api.hap.Characteristic.On, 'Tank Load State'));

        serviceLightbulbTank
          .getCharacteristic(this.api.hap.Characteristic.Brightness)
          .onSet(
            this.setBattery.bind(
              this,
              serviceLightbulbTank,
              this.api.hap.Characteristic.Brightness,
              'Tank Load Brightness'
            )
          );
      } else {
        if (serviceLightbulbTank) {
          Logger.info('Removing Lightbulb (tank) service', this.accessory.displayName);
          this.accessory.removeService(serviceLightbulbTank);
        }
        if (serviceLightbulbBattery) {
          Logger.info('Removing Lightbulb (battery) service', this.accessory.displayName);
          this.accessory.removeService(serviceLightbulbBattery);
        }
      }
    } else if (this.accessory.context.config.electricVehicle) {
      //Humidity
      if (this.accessory.context.config.tankBatteryType === 'HUMIDITY') {
        if (!serviceHumidityBattery) {
          Logger.info('Adding Humidity (tank) service', this.accessory.displayName);
          serviceHumidityBattery = this.accessory.addService(
            this.api.hap.Service.HumiditySensor,
            'Tank',
            'CarFuelTankHumidity'
          );
        }
      } else {
        if (serviceHumidityBattery) {
          Logger.info('Removing Humidity (tank) service', this.accessory.displayName);
          this.accessory.removeService(serviceHumidityBattery);
        }
      }

      //Lightbulb
      if (this.accessory.context.config.tankBatteryType === 'LIGHTBULB') {
        if (!serviceLightbulbBattery) {
          Logger.info('Adding Lightbulb (tank) service', this.accessory.displayName);
          serviceLightbulbBattery = this.accessory.addService(
            this.api.hap.Service.Lightbulb,
            'Tank',
            'CarFuelTankLightbulb'
          );
        }

        if (!serviceLightbulbBattery.testCharacteristic(this.api.hap.Characteristic.Brightness))
          serviceLightbulbBattery.addCharacteristic(this.api.hap.Characteristic.Brightness);

        //serviceLightbulbBattery.getCharacteristic(this.api.hap.Characteristic.On)
        //.onSet(this.setBattery.bind(this, serviceLightbulbBattery, this.api.hap.Characteristic.On, 'Battery State'));

        serviceLightbulbBattery
          .getCharacteristic(this.api.hap.Characteristic.Brightness)
          .onSet(
            this.setBattery.bind(
              this,
              serviceLightbulbBattery,
              this.api.hap.Characteristic.Brightness,
              'Battery Brightness'
            )
          );
      } else {
        if (serviceLightbulbBattery) {
          Logger.info('Removing Lightbulb (tank) service', this.accessory.displayName);
          this.accessory.removeService(serviceLightbulbBattery);
        }
      }
    } else {
      //Humidity
      if (this.accessory.context.config.tankBatteryType === 'HUMIDITY') {
        if (!serviceHumidityTank) {
          Logger.info('Adding Humidity (tank) service', this.accessory.displayName);
          serviceHumidityTank = this.accessory.addService(
            this.api.hap.Service.HumiditySensor,
            'Tank',
            'CarFuelTankHumidity'
          );
        }
      } else {
        if (serviceHumidityTank) {
          Logger.info('Removing Humidity (tank) service', this.accessory.displayName);
          this.accessory.removeService(serviceHumidityTank);
        }
      }

      //Lightbulb
      if (this.accessory.context.config.tankBatteryType === 'LIGHTBULB') {
        if (!serviceLightbulbTank) {
          Logger.info('Adding Lightbulb (tank) service', this.accessory.displayName);
          serviceLightbulbTank = this.accessory.addService(
            this.api.hap.Service.Lightbulb,
            'Tank',
            'CarFuelTankLightbulb'
          );
        }

        if (!serviceLightbulbTank.testCharacteristic(this.api.hap.Characteristic.Brightness))
          serviceLightbulbTank.addCharacteristic(this.api.hap.Characteristic.Brightness);

        //serviceLightbulbTank.getCharacteristic(this.api.hap.Characteristic.On)
        //.onSet(this.setBattery.bind(this, serviceLightbulbTank, this.api.hap.Characteristic.On, 'Tank Load State'));

        serviceLightbulbTank
          .getCharacteristic(this.api.hap.Characteristic.Brightness)
          .onSet(
            this.setBattery.bind(
              this,
              serviceLightbulbTank,
              this.api.hap.Characteristic.Brightness,
              'Tank Load Brightness'
            )
          );
      } else {
        if (serviceLightbulbTank) {
          Logger.info('Removing Lightbulb (tank) service', this.accessory.displayName);
          this.accessory.removeService(serviceLightbulbTank);
        }
      }
    }

    //Door
    if (!serviceDoor) {
      Logger.info('Adding ContactSensor (doors) service', this.accessory.displayName);
      serviceDoor = this.accessory.addService(this.api.hap.Service.ContactSensor, 'Doors', 'CarDoors');
    }

    serviceDoor.getCharacteristic(this.api.hap.Characteristic.ContactSensorState).on('change', (state) => {
      if (state.oldValue !== state.newValue)
        Logger.info('Door(s)/Car trunk ' + (state.newValue ? 'opened' : 'closed'), this.accessory.displayName);
    });

    //Window
    if (!serviceWindow) {
      Logger.info('Adding ContactSensor (windows) service', this.accessory.displayName);
      serviceWindow = this.accessory.addService(this.api.hap.Service.ContactSensor, 'Windows', 'CarWindows');
    }

    serviceWindow.getCharacteristic(this.api.hap.Characteristic.ContactSensorState).on('change', (state) => {
      if (state.oldValue !== state.newValue)
        Logger.info('Window(s)/Sunroof ' + (state.newValue ? 'opened' : 'closed'), this.accessory.displayName);
    });

    //Light
    if (!serviceLight) {
      Logger.info('Adding LightBulb service', this.accessory.displayName);
      serviceLight = this.accessory.addService(this.api.hap.Service.Lightbulb, 'Lights', 'CarLights');
    }

    serviceLight
      .getCharacteristic(this.api.hap.Characteristic.On)
      .on('change', (state) => {
        if (state.oldValue !== state.newValue)
          Logger.info('Front/Rear light ' + (state.newValue ? 'on' : 'off'), this.accessory.displayName);
      })
      .onSet((state) => {
        Logger.info('Can not change light state. Not supported at the moment!', this.accessory.displayName);

        setTimeout(() => {
          serviceLight.getCharacteristic(this.api.hap.Characteristic.On).updateValue(state ? false : true);
        }, 500);
      });

    this.getStates(
      serviceLock,
      serviceBattery,
      serviceDoor,
      serviceWindow,
      serviceLight,
      serviceHumidityTank,
      serviceHumidityBattery,
      serviceLightbulbTank,
      serviceLightbulbBattery
    );
  }

  setBattery(service, characteristic, target, state) {
    Logger.info('Can not change ' + target, this.accessory.displayName);

    let newState =
      target === 'Tank Load State' || target === 'Battery State'
        ? !state
        : target === 'Tank Load Brightness'
        ? this.accessory.context.tankBrightness || 100
        : this.accessory.context.batterBrightness || 100;

    setTimeout(() => {
      service.getCharacteristic(characteristic).updateValue(newState);
    }, 500);
  }

  async getStates(
    serviceLock,
    serviceBattery,
    serviceDoor,
    serviceWindow,
    serviceLight,
    serviceHumidityTank,
    serviceHumidityBattery,
    serviceLightbulbTank,
    serviceLightbulbBattery
  ) {
    let endpoint = 'unknown';

    //Tank Load
    try {
      if (
        this.accessory.context.config.hybridVehicle ||
        (!this.accessory.context.config.electricVehicle && !this.accessory.context.config.hybridVehicle)
      ) {
        //Fuel Status Endpoint
        endpoint = 'fuelstatus';

        let dataFuel = await this.me.fuelStatus(this.accessory.context.config.vin);
        this.handleBatteryFuel(dataFuel, serviceBattery, serviceHumidityTank, serviceLightbulbTank);
      }
    } catch (err) {
      this.handleError(err, endpoint);
    }

    //Battery
    try {
      if (this.accessory.context.config.electricVehicle || this.accessory.context.config.hybridVehicle) {
        //Electric Vehicle Status Endpoint
        endpoint = 'electricvehicle';

        let dataElectro = await this.me.electroStatus(this.accessory.context.config.vin);
        this.handleBatteryElectro(dataElectro, serviceBattery, serviceHumidityBattery, serviceLightbulbBattery);
      }
    } catch (err) {
      this.handleError(err, endpoint);
    }

    //Lock Switch
    try {
      //Vehicle Lock Status Endpoint
      endpoint = 'vehiclelockstatus';

      let dataLock = await this.me.lockStatus(this.accessory.context.config.vin);
      this.handleLock(dataLock, serviceLock);
    } catch (err) {
      this.handleError(err, endpoint);
    }

    //Contact Sensor/Lightbulb
    try {
      //Vehicle Status Endpoint
      endpoint = 'vehiclestatus';

      let dataVehicle = await this.me.vehicleStatus(this.accessory.context.config.vin);
      this.handleDoors(dataVehicle, serviceDoor);
      this.handleWindows(dataVehicle, serviceWindow);
      this.handleLights(dataVehicle, serviceLight);
    } catch (err) {
      this.handleError(err, endpoint);
    }

    setTimeout(() => {
      this.getStates(
        serviceLock,
        serviceBattery,
        serviceDoor,
        serviceWindow,
        serviceLight,
        serviceHumidityTank,
        serviceHumidityBattery,
        serviceLightbulbTank,
        serviceLightbulbBattery
      );
    }, this.polling);
  }

  handleBatteryFuel(dataFuel, serviceBattery, serviceHumidityTank, serviceLightbulbTank) {
    let batteryValue;
    let batteryState = 0;

    if (dataFuel.length) {
      for (const key in dataFuel) {
        if (dataFuel[key].tanklevelpercent) {
          batteryValue = parseInt(dataFuel[key].tanklevelpercent.value);
        } else if (dataFuel[key].rangeliquid && this.accessory.context.config.maxRange) {
          batteryValue = (100 / this.accessory.context.config.maxRange) * parseInt(dataFuel[key].rangeliquid.value);
        }
      }
    }

    if (batteryValue !== undefined) {
      this.accessory.context.tankBrightness = batteryValue;

      if (batteryValue <= 20) batteryState = 1;

      serviceBattery.getCharacteristic(this.api.hap.Characteristic.BatteryLevel).updateValue(batteryValue);

      serviceBattery.getCharacteristic(this.api.hap.Characteristic.StatusLowBattery).updateValue(batteryState);

      if (serviceHumidityTank)
        serviceHumidityTank
          .getCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity)
          .updateValue(batteryValue);

      if (serviceLightbulbTank) {
        let state = batteryValue > 0;

        serviceLightbulbTank.getCharacteristic(this.api.hap.Characteristic.On).updateValue(state);

        serviceLightbulbTank.getCharacteristic(this.api.hap.Characteristic.Brightness).updateValue(batteryValue);
      }
    }

    serviceBattery.getCharacteristic(this.api.hap.Characteristic.ChargingState).updateValue(0);

    return;
  }

  handleBatteryElectro(dataElectro, serviceBattery, serviceHumidityBattery, serviceLightbulbBattery) {
    let batteryValue;
    let batteryState = 0;

    if (dataElectro.length) {
      for (const key in dataElectro) {
        if (dataElectro[key].soc) {
          batteryValue = parseInt(dataElectro[key].soc.value);
        } else if (dataElectro[key].rangeelectric && this.accessory.context.config.maxRange) {
          batteryValue =
            (100 / this.accessory.context.config.maxRange) * parseInt(dataElectro[key].rangeelectric.value);
        }
      }
    }

    if (batteryValue !== undefined) {
      this.accessory.context.batteryBrightness = batteryValue;

      if (batteryValue <= 20) batteryState = 1;

      if (!this.accessory.context.config.hybridVehicle) {
        serviceBattery.getCharacteristic(this.api.hap.Characteristic.BatteryLevel).updateValue(batteryValue);

        serviceBattery.getCharacteristic(this.api.hap.Characteristic.StatusLowBattery).updateValue(batteryState);
      }

      if (serviceHumidityBattery)
        serviceHumidityBattery
          .getCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity)
          .updateValue(batteryValue);

      if (serviceLightbulbBattery) {
        let state = batteryValue > 0;

        serviceLightbulbBattery.getCharacteristic(this.api.hap.Characteristic.On).updateValue(state);

        serviceLightbulbBattery.getCharacteristic(this.api.hap.Characteristic.Brightness).updateValue(batteryValue);
      }
    }

    if (!this.accessory.context.config.hybridVehicle) {
      serviceBattery.getCharacteristic(this.api.hap.Characteristic.ChargingState).updateValue(0);
    }

    return;
  }

  handleLock(dataLock, service) {
    let state = 0;

    if (dataLock.length) {
      for (const key in dataLock) {
        if (dataLock[key].doorlockstatusdecklid && dataLock[key].doorlockstatusdecklid.value === 'false') {
          state = 1;
        } else if (
          dataLock[key].doorlockstatusvehicle &&
          (dataLock[key].doorlockstatusvehicle.value === '1' || dataLock[key].doorlockstatusvehicle.value === '2')
        ) {
          state = 1;
        } else if (dataLock[key].doorlockstatusgas && dataLock[key].doorlockstatusgas.value === 'false') {
          state = 1;
        }
      }

      service.getCharacteristic(this.api.hap.Characteristic.LockCurrentState).updateValue(state);

      service.getCharacteristic(this.api.hap.Characteristic.LockTargetState).updateValue(state);
    }

    return;
  }

  handleDoors(dataVehicle, service) {
    let state = 0;

    if (dataVehicle.length) {
      for (const key in dataVehicle) {
        if (dataVehicle[key].doorstatusfrontleft && dataVehicle[key].doorstatusfrontleft.value === 'true') {
          state = 1;
        } else if (dataVehicle[key].doorstatusfrontright && dataVehicle[key].doorstatusfrontright.value === 'true') {
          state = 1;
        } else if (dataVehicle[key].doorstatusrearleft && dataVehicle[key].doorstatusrearleft.value === 'true') {
          state = 1;
        } else if (dataVehicle[key].doorstatusrearright && dataVehicle[key].doorstatusrearright.value === 'true') {
          state = 1;
        } else if (dataVehicle[key].decklidstatus && dataVehicle[key].decklidstatus.value === 'true') {
          state = 1;
        }
      }

      service.getCharacteristic(this.api.hap.Characteristic.ContactSensorState).updateValue(state);
    }

    return;
  }

  handleWindows(dataVehicle, service) {
    let state = 0;

    if (dataVehicle.length) {
      for (const key in dataVehicle) {
        if (dataVehicle[key].windowstatusfrontleft && dataVehicle[key].windowstatusfrontleft.value !== '2') {
          state = 1;
        } else if (dataVehicle[key].windowstatusfrontright && dataVehicle[key].windowstatusfrontright.value !== '2') {
          state = 1;
        } else if (dataVehicle[key].windowstatusrearleft && dataVehicle[key].windowstatusrearleft.value !== '2') {
          state = 1;
        } else if (dataVehicle[key].windowstatusrearright && dataVehicle[key].windowstatusrearright.value !== '2') {
          state = 1;
        } else if (dataVehicle[key].sunroofstatus && dataVehicle[key].sunroofstatus.value !== '0') {
          state = 1;
        }
      }

      service.getCharacteristic(this.api.hap.Characteristic.ContactSensorState).updateValue(state);
    }

    return;
  }

  handleLights(dataVehicle, service) {
    let state = false;

    if (dataVehicle.length) {
      for (const key in dataVehicle) {
        if (dataVehicle[key].interiorLightsFront && dataVehicle[key].interiorLightsFront.value === 'true') {
          state = true;
        } else if (dataVehicle[key].interiorLightsRear && dataVehicle[key].interiorLightsRear.value === 'true') {
          state = true;
        } else if (dataVehicle[key].readingLampFrontLeft && dataVehicle[key].readingLampFrontLeft.value === 'true') {
          state = true;
        } else if (dataVehicle[key].readingLampFrontRight && dataVehicle[key].readingLampFrontRight.value === 'true') {
          state = true;
        }
      }

      service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(state);
    }

    return;
  }

  handleError(err, endpoint) {
    let error;
    let warn;

    if (this.pollingChanged) this.resetPolling();

    //axios error
    if (err.response) {
      if (err.response.status === 429) {
        this.changePolling(30000);
        warn =
          'The ' +
          endpoint +
          ' service received too many requests in a given amount of time. Polling is increased by 30 seconds.';
      }

      if (err.response.status === 500) {
        this.changePolling(3 * 60 * 1000);
        warn =
          'An error occurred on the server side, e.g. a required service did not provide a valid response. Next query will be made in 3 minutes.';
      }

      if (err.response.status === 503 || err.response.status === 504) {
        this.changePolling(5 * 60 * 1000);
        warn =
          'The server is unable to service the request due to a temporary unavailability condition. Next query will be made in 5 minutes.';
      }

      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (err.response.data) {
        error = {
          status: err.response.status,
          message: err.response.statusText,
          data: err.response.data,
        };
      } else {
        error = {
          status: err.response.status,
          message: err.response.statusText,
        };
      }
    } else if (err.request) {
      // The request was made but no response was received
      this.changePolling(3 * 60 * 1000);

      error = {
        code: err.code,
        message: 'Cannot reach Mercedes API. No response received. Next query will be made in 3 minutes',
      };
    } else if (err.output) {
      //simple-oauth2 boom error
      error = err.output.payload || err.output;
    } else {
      // Something happened in setting up the request that triggered an Error
      error = err;
    }

    if (warn) {
      Logger.warn(warn, this.accessory.displayName + ' ' + endpoint);
    } else {
      error = error || err;
      Logger.error(error, this.accessory.displayName + ' ' + endpoint);
    }
  }

  changePolling(timer) {
    this.pollingChanged = true;
    this.polling = timer;
    return;
  }

  resetPolling() {
    this.pollingChanged = false;
    this.polling = this.accessory.context.config.polling;
    return;
  }
}

module.exports = CarAccessory;
