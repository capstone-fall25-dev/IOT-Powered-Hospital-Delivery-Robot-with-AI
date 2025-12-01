#ifndef UART_H
#define UART_H
#include "stm32f1xx.h"
#include "robot.h"

#define UART_BUFFER_SIZE 50

extern uint8_t flag_cpltReceive;
extern float setpoint_left;
extern float setpoint_right;
void uart_receive_data(uint8_t data_rx);
void uart_handle(Robot_Typedef* robot);

#endif
