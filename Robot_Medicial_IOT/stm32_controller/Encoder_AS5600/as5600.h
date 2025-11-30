#ifndef AS5600_H
#define AS5600_H

#include "main.h"
#include "stdint.h"
#include "i2c.h"

#define AS5600_I2C_SLAVE_ADDRESS (0x36)
#define AS5600_RAW_ANGLE_REG (0x0C)
#define AS5600_CONF_REG (0x07)
#define AS5600_STATUS_REG 0x0B
#define AS5600_STATUS_MD (1 << 5) // Magnet detected
#define AS5600_STATUS_ML (1 << 4) // Magnet too weak
#define AS5600_STATUS_MH (1 << 3) // Magnet too strong

#define TIME_SAMPLE 0.04f

#define PI 3.14159265359f
#define WHEEL_RADIUS 0.045f

typedef enum
{
	AS5600_OK,
	AS5600_ERROR
} AS5600_Status;

typedef enum
{
	AS5600_MAGNET_TOO_WEAK = 0,
	AS5600_MAGNET_OK,
	AS5600_MAGNET_TOO_STRONG,
	AS5600_MAGNET_NOT_DETECTED
} AS5600_MagnetStatus;

typedef struct
{
	Soft_I2C_TypeDef *hi2c;
	uint16_t address;
	float angle;
} AS5600_Typedef;

AS5600_Status AS5600_Init(AS5600_Typedef *sensor, Soft_I2C_TypeDef *_hi2c, uint16_t address);
float AS5600_CalVelocity(AS5600_Typedef *sensor);
AS5600_MagnetStatus AS5600_ReadMagnetStatus(AS5600_Typedef *sensor);

#endif
