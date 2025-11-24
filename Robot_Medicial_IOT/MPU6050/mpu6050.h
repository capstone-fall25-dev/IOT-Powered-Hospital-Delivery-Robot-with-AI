#ifndef MPU6050_H
#define MPU6050_H

#include "stm32f1xx.h"

#define RAD_TO_DEG 57.295779513082320876798154814105
#define WHO_AM_I_REG 0x75
#define PWR_MGMT_1_REG 0x6B
#define SMPLRT_DIV_REG 0x19
#define ACCEL_CONFIG_REG 0x1C
#define ACCEL_XOUT_H_REG 0x3B
#define TEMP_OUT_H_REG 0x41
#define GYRO_CONFIG_REG 0x1B
#define GYRO_XOUT_H_REG 0x43

typedef enum{
	MPU6050_OK,
	MPU6050_ERROR
}MPU6050_Status;

typedef struct
{
	I2C_HandleTypeDef* hi2c;
    int16_t Accel_X_RAW;
    int16_t Accel_Y_RAW;
    int16_t Accel_Z_RAW;
    double Ax;
    double Ay;
    double Az;

    int16_t Gyro_X_RAW;
    int16_t Gyro_Y_RAW;
    int16_t Gyro_Z_RAW;
    double Gx;
    double Gy;
    double Gz;

    float Temperature;
	
	double Roll;
	double Pitch;
	double Yaw;
	
    double KalmanRoll; // roll
    double KalmanPitch; // pitch
	double KalmanYaw; // yaw
} MPU6050_t;

typedef struct
{
    double Q_angle;
    double Q_bias;
    double R_measure;
    double angle;
    double bias;
    double P[2][2];
} Kalman_t;

MPU6050_Status MPU6050_Init(MPU6050_t* mpu, I2C_HandleTypeDef *I2Cx);
MPU6050_Status MPU6050_Read_Accel(MPU6050_t *DataStruct);
MPU6050_Status MPU6050_Read_Gyro(MPU6050_t *DataStruct);
MPU6050_Status MPU6050_Read_Temp(MPU6050_t *DataStruct);
MPU6050_Status MPU6050_Read_All(MPU6050_t *DataStruct);
MPU6050_Status MPU6050_Read_All_Fast(MPU6050_t *mpu);
double Kalman_getAngle(Kalman_t *Kalman, double newAngle, double newRate, double dt);

#endif
