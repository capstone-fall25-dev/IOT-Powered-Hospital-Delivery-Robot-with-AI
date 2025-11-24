#include <math.h>
#include "mpu6050.h"
#include "robot.h"

#define MPU6050_ADDR 0xD0
const uint16_t i2c_timeout = 5;
const double Accel_Z_corrector = 14418.0;
#define Gz_Error 0.2f
extern Robot_Typedef robot;
uint32_t timer;
uint8_t check_id;
Kalman_t KalmanRoll = {
        .Q_angle = 0.001f,
        .Q_bias = 0.003f,
        .R_measure = 0.03f
};

Kalman_t KalmanPitch = {
        .Q_angle = 0.001f,
        .Q_bias = 0.003f,
        .R_measure = 0.03f
};

Kalman_t KalmanYaw = {
		.Q_angle = 0.001f,
		.Q_bias = 0.003f,
		.R_measure = 0.03f
};

typedef struct{
	float y_prev;
}Filter;
Filter gz_filter = {0};

float LowPassFilter(Filter* filter, float value){
	float y = 0.5 * value + 0.5 * filter->y_prev;
	filter->y_prev =  y;
	return y;
}

MPU6050_Status MPU6050_Init(MPU6050_t* mpu, I2C_HandleTypeDef *I2Cx) {
	mpu->hi2c = I2Cx;
    uint8_t Data;
    if(HAL_I2C_Mem_Read(mpu->hi2c, MPU6050_ADDR, WHO_AM_I_REG, 1, &check_id, 1, i2c_timeout) != HAL_OK) return MPU6050_ERROR;
    if (check_id != 104) return MPU6050_ERROR;
    
	Data = 0;
	if(HAL_I2C_Mem_Write(mpu->hi2c, MPU6050_ADDR, PWR_MGMT_1_REG, 1, &Data, 1, i2c_timeout) != HAL_OK) return MPU6050_ERROR;
	Data = 0x07;
	if(HAL_I2C_Mem_Write(mpu->hi2c, MPU6050_ADDR, SMPLRT_DIV_REG, 1, &Data, 1, i2c_timeout) != HAL_OK) return MPU6050_ERROR;
	Data = 0x00;
	if(HAL_I2C_Mem_Write(mpu->hi2c, MPU6050_ADDR, ACCEL_CONFIG_REG, 1, &Data, 1, i2c_timeout) != HAL_OK) return MPU6050_ERROR;
	Data = 0x00;
	if(HAL_I2C_Mem_Write(mpu->hi2c, MPU6050_ADDR, GYRO_CONFIG_REG, 1, &Data, 1, i2c_timeout) != HAL_OK) return MPU6050_ERROR;

    return MPU6050_OK;
}

MPU6050_Status MPU6050_Read_Accel(MPU6050_t *mpu) {
    uint8_t Rec_Data[6];
    if(HAL_I2C_Mem_Read(mpu->hi2c, MPU6050_ADDR, ACCEL_XOUT_H_REG, 1, Rec_Data, 6, i2c_timeout) != HAL_OK) return MPU6050_ERROR;

    mpu->Accel_X_RAW = (int16_t) (Rec_Data[0] << 8 | Rec_Data[1]);
    mpu->Accel_Y_RAW = (int16_t) (Rec_Data[2] << 8 | Rec_Data[3]);
    mpu->Accel_Z_RAW = (int16_t) (Rec_Data[4] << 8 | Rec_Data[5]);

    mpu->Ax = mpu->Accel_X_RAW / 16384.0;
    mpu->Ay = mpu->Accel_Y_RAW / 16384.0;
    mpu->Az = mpu->Accel_Z_RAW / Accel_Z_corrector;
	return MPU6050_OK;
}

MPU6050_Status MPU6050_Read_Gyro(MPU6050_t *mpu) {
    uint8_t Rec_Data[6];
    if(HAL_I2C_Mem_Read(mpu->hi2c, MPU6050_ADDR, GYRO_XOUT_H_REG, 1, Rec_Data, 6, i2c_timeout) != HAL_OK) return MPU6050_ERROR;

    mpu->Gyro_X_RAW = (int16_t) (Rec_Data[0] << 8 | Rec_Data[1]);
    mpu->Gyro_Y_RAW = (int16_t) (Rec_Data[2] << 8 | Rec_Data[3]);
    mpu->Gyro_Z_RAW = (int16_t) (Rec_Data[4] << 8 | Rec_Data[5]);

    mpu->Gx = mpu->Gyro_X_RAW / 131.0;
    mpu->Gy = mpu->Gyro_Y_RAW / 131.0;
    mpu->Gz = mpu->Gyro_Z_RAW / 131.0;
	return MPU6050_OK;
}

MPU6050_Status MPU6050_Read_Temp(MPU6050_t *mpu) {
    uint8_t Rec_Data[2];
    int16_t temp;

    if(HAL_I2C_Mem_Read(mpu->hi2c, MPU6050_ADDR, TEMP_OUT_H_REG, 1, Rec_Data, 2, i2c_timeout) != HAL_OK) return MPU6050_ERROR;

    temp = (int16_t) (Rec_Data[0] << 8 | Rec_Data[1]);
    mpu->Temperature = (float) ((int16_t) temp / (float) 340.0 + (float) 36.53);
	return MPU6050_OK;
}

MPU6050_Status MPU6050_Read_All(MPU6050_t *mpu) {
    uint8_t Rec_Data[14];
    int16_t temp;
	
    if(HAL_I2C_Mem_Read(mpu->hi2c, MPU6050_ADDR, ACCEL_XOUT_H_REG, 1, Rec_Data, 14, i2c_timeout) != HAL_OK) return MPU6050_ERROR;

    mpu->Accel_X_RAW = (int16_t) (Rec_Data[0] << 8 | Rec_Data[1]);
    mpu->Accel_Y_RAW = (int16_t) (Rec_Data[2] << 8 | Rec_Data[3]);
    mpu->Accel_Z_RAW = (int16_t) (Rec_Data[4] << 8 | Rec_Data[5]);
    temp = (int16_t)(Rec_Data[6] << 8 | Rec_Data[7]);
    mpu->Gyro_X_RAW = (int16_t) (Rec_Data[8] << 8 | Rec_Data[9]);
    mpu->Gyro_Y_RAW = (int16_t) (Rec_Data[10] << 8 | Rec_Data[11]);
    mpu->Gyro_Z_RAW = (int16_t) (Rec_Data[12] << 8 | Rec_Data[13]);
    
    mpu->Ax = mpu->Accel_X_RAW / 16384.0;
    mpu->Ay = mpu->Accel_Y_RAW / 16384.0;
    mpu->Az = mpu->Accel_Z_RAW / Accel_Z_corrector;
    mpu->Temperature = (float) ((int16_t) temp / (float) 340.0 + (float) 36.53);
    mpu->Gx = mpu->Gyro_X_RAW / 131.0;
    mpu->Gy = mpu->Gyro_Y_RAW / 131.0;
    mpu->Gz = mpu->Gyro_Z_RAW / 131.0;
    
    double dt = (double) (HAL_GetTick() - timer) / 1000;
    timer = HAL_GetTick();
    
    double roll;
    double roll_sqrt = sqrt(mpu->Accel_X_RAW * mpu->Accel_X_RAW + mpu->Accel_Z_RAW * mpu->Accel_Z_RAW);
    if (roll_sqrt != 0.0) {
        roll = atan(mpu->Accel_Y_RAW / roll_sqrt) * RAD_TO_DEG;
    } else {
        roll = 0.0;
    }
    
    double pitch = atan2(-mpu->Accel_X_RAW, mpu->Accel_Z_RAW) * RAD_TO_DEG;
    
    double yaw = mpu->KalmanYaw + mpu->Gz * dt;

    if ((pitch < -90 && mpu->KalmanPitch)){
        mpu->KalmanPitch = pitch;
    } else {
        mpu->KalmanPitch = Kalman_getAngle(&KalmanPitch, pitch, mpu->Gy, dt);
    }
    if (fabs(mpu->KalmanPitch) > 90) {
        mpu->Gx = -mpu->Gx;
    }
    mpu->KalmanRoll = Kalman_getAngle(&KalmanRoll, roll, mpu->Gx, dt);
    mpu->KalmanYaw = Kalman_getAngle(&KalmanYaw, yaw, mpu->Gz, dt);
	return MPU6050_OK;
}

MPU6050_Status MPU6050_Read_All_Fast(MPU6050_t *mpu) {
    uint8_t Rec_Data[14];
    int16_t temp;

    if(HAL_I2C_Mem_Read(mpu->hi2c, MPU6050_ADDR, ACCEL_XOUT_H_REG, 1, Rec_Data, 14, i2c_timeout) != HAL_OK) return MPU6050_ERROR;

    mpu->Accel_X_RAW = (int16_t) (Rec_Data[0] << 8 | Rec_Data[1]);
    mpu->Accel_Y_RAW = (int16_t) (Rec_Data[2] << 8 | Rec_Data[3]);
    mpu->Accel_Z_RAW = (int16_t) (Rec_Data[4] << 8 | Rec_Data[5]);
    temp = (int16_t) (Rec_Data[6] << 8 | Rec_Data[7]);
    mpu->Gyro_X_RAW = (int16_t) (Rec_Data[8] << 8 | Rec_Data[9]);
    mpu->Gyro_Y_RAW = (int16_t) (Rec_Data[10] << 8 | Rec_Data[11]);
    mpu->Gyro_Z_RAW = (int16_t) (Rec_Data[12] << 8 | Rec_Data[13]);

    mpu->Ax = mpu->Accel_X_RAW / 16384.0f;
    mpu->Ay = mpu->Accel_Y_RAW / 16384.0f;
    mpu->Az = mpu->Accel_Z_RAW / Accel_Z_corrector;
    mpu->Temperature = (float) ((int16_t) temp / 340.0f + 36.53f);
    mpu->Gx = mpu->Gyro_X_RAW / 131.0f;
    mpu->Gy = mpu->Gyro_Y_RAW / 131.0f;
	if(robot.state == ROBOT_STOP || (robot.motorLeft->speed == robot.motorRight->speed && (robot.v_left*robot.v_right > 0))) mpu->Gz = 0.0f;
	else mpu->Gz = LowPassFilter(&gz_filter, mpu->Gyro_Z_RAW / 131.0f);
//	float dt = (float) (HAL_GetTick() - timer) / 1000.0f;
//    timer = HAL_GetTick();
//    float roll_sqrt = sqrtf(mpu->Accel_X_RAW * mpu->Accel_X_RAW + mpu->Accel_Z_RAW * mpu->Accel_Z_RAW);
//    if (roll_sqrt != 0.0f) {
//        mpu->Roll = atanf(mpu->Accel_Y_RAW / roll_sqrt) * RAD_TO_DEG;
//    } else {
//        mpu->Roll = 0.0f;
//    }
//    mpu->Pitch = atan2f(-mpu->Accel_X_RAW, mpu->Accel_Z_RAW) * RAD_TO_DEG;
//    mpu->Yaw += (robot.state == ROBOT_RUN) ? ((mpu->Gz - Gz_Error) * dt) : 0;
	return MPU6050_OK;
}

double Kalman_getAngle(Kalman_t *Kalman, double newAngle, double newRate, double dt) {
    double rate = newRate - Kalman->bias;
    Kalman->angle += dt * rate;

    Kalman->P[0][0] += dt * (dt * Kalman->P[1][1] - Kalman->P[0][1] - Kalman->P[1][0] + Kalman->Q_angle);
    Kalman->P[0][1] -= dt * Kalman->P[1][1];
    Kalman->P[1][0] -= dt * Kalman->P[1][1];
    Kalman->P[1][1] += Kalman->Q_bias * dt;

    double S = Kalman->P[0][0] + Kalman->R_measure;
    double K[2];
    K[0] = Kalman->P[0][0] / S;
    K[1] = Kalman->P[1][0] / S;

    double y = newAngle - Kalman->angle;
    Kalman->angle += K[0] * y;
    Kalman->bias += K[1] * y;

    double P00_temp = Kalman->P[0][0];
    double P01_temp = Kalman->P[0][1];

    Kalman->P[0][0] -= K[0] * P00_temp;
    Kalman->P[0][1] -= K[0] * P01_temp;
    Kalman->P[1][0] -= K[1] * P00_temp;
    Kalman->P[1][1] -= K[1] * P01_temp;

    return Kalman->angle;
};
