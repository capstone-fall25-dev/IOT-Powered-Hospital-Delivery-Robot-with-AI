#ifndef RESPONSE_H
#define RESPONSE_H

#include "stm32f1xx.h"

uint8_t response_uart(char **argv, int8_t* speed_left, int8_t* speed_right, uint8_t* state, uint8_t* servo1_flag, uint8_t* servo2_flag);

#endif
