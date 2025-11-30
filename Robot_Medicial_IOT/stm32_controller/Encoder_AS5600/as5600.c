#include "as5600.h"
#include "math.h"

uint8_t check = 0;

static AS5600_Status i2c_write(AS5600_Typedef *sensor, uint8_t reg, uint8_t *data, uint8_t len)
{
	if (!i2c_soft_write_addr8_bytes(sensor->hi2c, sensor->address, reg, data, len))
		return AS5600_ERROR;
	return AS5600_OK;
}

static AS5600_Status i2c_read_reg(AS5600_Typedef *sensor, uint8_t reg, uint8_t *data, uint8_t len)
{
	if (!i2c_soft_read_addr8_bytes(sensor->hi2c, sensor->address, reg, data, len))
		return AS5600_ERROR;
	return AS5600_OK;
}

static AS5600_Status AS5600_ReadRawAngle(AS5600_Typedef *sensor)
{
	uint8_t data_read[2];
	if (i2c_read_reg(sensor, AS5600_RAW_ANGLE_REG, data_read, 2) != AS5600_OK)
		return AS5600_ERROR;
	uint16_t raw_angle = ((data_read[0] & 0x0F) << 8) | data_read[1];
	sensor->angle = raw_angle * 360.0f / 4096.0f;
	return AS5600_OK;
}

AS5600_Status AS5600_Init(AS5600_Typedef *sensor, Soft_I2C_TypeDef *_hi2c, uint16_t _address)
{
	sensor->hi2c = _hi2c;
	sensor->address = _address;
	sensor->angle = 0.0f;
	uint8_t data[2] = {0x07, 0x04};
	if (i2c_write(sensor, AS5600_CONF_REG, data, 2) != AS5600_OK){
		check = 1;
		return AS5600_ERROR;
	}
	if (AS5600_ReadRawAngle(sensor) != AS5600_OK){
		check = 2;
		return AS5600_ERROR;
	}
	return AS5600_OK;
}
float AS5600_CalVelocity(AS5600_Typedef *sensor)
{
	float last_angle = sensor->angle;
	if (AS5600_ReadRawAngle(sensor) != AS5600_OK)
		return -1;

	float delta = sensor->angle - last_angle;
	if (delta > 180.0f)
		delta -= 360.0f;
	if (delta < -180.0f)
		delta += 360.0f;
	
	float speed_deg_s = delta / TIME_SAMPLE;
	float speed_rad_s = speed_deg_s * PI / 180.0f;
	float speed_m_s = speed_rad_s * WHEEL_RADIUS;
	return fabs(speed_m_s);
}
