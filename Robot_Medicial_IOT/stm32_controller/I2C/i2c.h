#ifndef I2C_H
#define I2C_H

#include "stm32f1xx.h" // Adjust for your STM32 series
#include <stdbool.h>
#include <stdint.h>

#define I2C_SOFT_DELAY_US 1.0f

typedef struct
{
	GPIO_TypeDef *SCL_Port;
	uint16_t SCL_Pin;
	GPIO_TypeDef *SDA_Port;
	uint16_t SDA_Pin;
} Soft_I2C_TypeDef;

void i2c_soft_init(Soft_I2C_TypeDef *i2c, GPIO_TypeDef *scl_port, uint16_t scl_pin, GPIO_TypeDef *sda_port, uint16_t sda_pin);
bool i2c_soft_read_addr8_data8(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint8_t *data);
bool i2c_soft_write_addr8_data8(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint8_t data);
bool i2c_soft_read_addr8_data16(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint16_t *data);
bool i2c_soft_read_addr8_data32(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint32_t *data);
bool i2c_soft_read_addr8_bytes(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint8_t *data, uint8_t len);
bool i2c_soft_write_addr8_bytes(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint8_t *data, uint8_t len);
void i2c_soft_delay(void);

#endif
