
#include "i2c.h"

void i2c_soft_delay(void){
//    for(volatile uint32_t i = 0; i < I2C_SOFT_DELAY_US * (SystemCoreClock / 2000000); i++);
	for(volatile uint32_t i = 0; i < 5; i++);
}

static void i2c_soft_scl_high(Soft_I2C_TypeDef *i2c){
    HAL_GPIO_WritePin(i2c->SCL_Port, i2c->SCL_Pin, GPIO_PIN_SET);
}

static void i2c_soft_scl_low(Soft_I2C_TypeDef *i2c){
    HAL_GPIO_WritePin(i2c->SCL_Port, i2c->SCL_Pin, GPIO_PIN_RESET);
}

static void i2c_soft_sda_high(Soft_I2C_TypeDef *i2c){
    HAL_GPIO_WritePin(i2c->SDA_Port, i2c->SDA_Pin, GPIO_PIN_SET);
}

static void i2c_soft_sda_low(Soft_I2C_TypeDef *i2c){
    HAL_GPIO_WritePin(i2c->SDA_Port, i2c->SDA_Pin, GPIO_PIN_RESET);
}

static bool i2c_soft_sda_read(Soft_I2C_TypeDef *i2c){
    return HAL_GPIO_ReadPin(i2c->SDA_Port, i2c->SDA_Pin) == GPIO_PIN_SET;
}

static void i2c_soft_start(Soft_I2C_TypeDef *i2c){
    i2c_soft_sda_high(i2c);
    i2c_soft_scl_high(i2c);
    i2c_soft_delay();
    i2c_soft_sda_low(i2c);
    i2c_soft_delay();
    i2c_soft_scl_low(i2c);
}

static void i2c_soft_stop(Soft_I2C_TypeDef *i2c){
    i2c_soft_sda_low(i2c);
    i2c_soft_delay();
    i2c_soft_scl_high(i2c);
    i2c_soft_delay();
    i2c_soft_sda_high(i2c);
    i2c_soft_delay();
}

static bool i2c_soft_write_byte(Soft_I2C_TypeDef *i2c, uint8_t byte){
    for(int i = 7; i >= 0; i--){
        if(byte & (1 << i)){
            i2c_soft_sda_high(i2c);
        }else{
            i2c_soft_sda_low(i2c);
        }
        i2c_soft_delay();
        i2c_soft_scl_high(i2c);
        i2c_soft_delay();
        i2c_soft_scl_low(i2c);
    }
    i2c_soft_sda_high(i2c);
    i2c_soft_delay();
    i2c_soft_scl_high(i2c);
    i2c_soft_delay();
    bool ack = !i2c_soft_sda_read(i2c);
    i2c_soft_scl_low(i2c);
    return ack;
}

static uint8_t i2c_soft_read_byte(Soft_I2C_TypeDef *i2c, bool ack){
    uint8_t byte = 0;
    i2c_soft_sda_high(i2c);
    for(int i = 7; i >= 0; i--){
        i2c_soft_delay();
        i2c_soft_scl_high(i2c);
        i2c_soft_delay();
        if (i2c_soft_sda_read(i2c)){
            byte |= (1 << i);
        }
        i2c_soft_scl_low(i2c);
    }
    if(ack){
        i2c_soft_sda_low(i2c);
    }else{
        i2c_soft_sda_high(i2c);
    }
    i2c_soft_delay();
    i2c_soft_scl_high(i2c);
    i2c_soft_delay();
    i2c_soft_scl_low(i2c);
    return byte;
}

void i2c_soft_init(Soft_I2C_TypeDef *i2c, GPIO_TypeDef *scl_port, uint16_t scl_pin, GPIO_TypeDef *sda_port, uint16_t sda_pin){
    i2c->SCL_Port = scl_port;
    i2c->SCL_Pin = scl_pin;
    i2c->SDA_Port = sda_port;
    i2c->SDA_Pin = sda_pin;

    i2c_soft_sda_high(i2c);
    i2c_soft_scl_high(i2c);
}

bool i2c_soft_read_addr8_data8(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint8_t *data){
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x00))
        return false;
    if (!i2c_soft_write_byte(i2c, reg_addr))
        return false;
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x01))
        return false;
    *data = i2c_soft_read_byte(i2c, false);
    i2c_soft_stop(i2c);
    return true;
}

bool i2c_soft_write_addr8_data8(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint8_t data){
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x00))
        return false;
    if (!i2c_soft_write_byte(i2c, reg_addr))
        return false;
    if (!i2c_soft_write_byte(i2c, data))
        return false;
    i2c_soft_stop(i2c);
    return true;
}

bool i2c_soft_read_addr8_data16(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint16_t *data){
    uint8_t buf[2];
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x00))
        return false;
    if (!i2c_soft_write_byte(i2c, reg_addr))
        return false;
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x01))
        return false;
    buf[0] = i2c_soft_read_byte(i2c, true);
    buf[1] = i2c_soft_read_byte(i2c, false);
    i2c_soft_stop(i2c);
    *data = (buf[0] << 8) | buf[1];
    return true;
}

bool i2c_soft_read_addr8_data32(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint32_t *data){
    uint8_t buf[4];
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x00))
        return false;
    if (!i2c_soft_write_byte(i2c, reg_addr))
        return false;
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x01))
        return false;
    buf[0] = i2c_soft_read_byte(i2c, true);
    buf[1] = i2c_soft_read_byte(i2c, true);
    buf[2] = i2c_soft_read_byte(i2c, true);
    buf[3] = i2c_soft_read_byte(i2c, false);
    i2c_soft_stop(i2c);
    *data = (buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3];
    return true;
}

bool i2c_soft_read_addr8_bytes(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint8_t *data, uint8_t len){
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x00))
        return false;
    if (!i2c_soft_write_byte(i2c, reg_addr))
        return false;
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x01))
        return false;
    for (uint8_t i = 0; i < len - 1; i++){
        data[i] = i2c_soft_read_byte(i2c, true);
    }
    data[len - 1] = i2c_soft_read_byte(i2c, false);
    i2c_soft_stop(i2c);
    return true;
}

bool i2c_soft_write_addr8_bytes(Soft_I2C_TypeDef *i2c, uint8_t slave_addr, uint8_t reg_addr, uint8_t *data, uint8_t len){
    i2c_soft_start(i2c);
    if (!i2c_soft_write_byte(i2c, (slave_addr << 1) | 0x00))
        return false;
    if (!i2c_soft_write_byte(i2c, reg_addr))
        return false;
    for (uint8_t i = 0; i < len; i++){
        if (!i2c_soft_write_byte(i2c, data[i]))
            return false;
    }
    i2c_soft_stop(i2c);
    return true;
}
