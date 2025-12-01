#include "uart.h"
#include "response.h"
#include <string.h>
#include <math.h>

uint8_t uart_buff[UART_BUFFER_SIZE] = {0};
uint8_t flag_cpltReceive = 0;
uint8_t buffer_index = 0;
float setpoint_left;
float setpoint_right;
char *argv[5];
uint8_t flag_data_error = 0;

float map_float(float x, float in_min, float in_max, float out_min, float out_max)
{
	float scale_value = ((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
	return scale_value;
}
void uart_receive_data(uint8_t data_rx)
{
	if (data_rx == '\n')
	{
		if(flag_data_error){
			flag_data_error = 0;
			return;
		}
		flag_cpltReceive = 1;
		uart_buff[buffer_index] = '\0';
		buffer_index = 0;
	}
	else
	{
		if (data_rx == ' ' || (data_rx >= '0' && data_rx <= '9') || data_rx == '-')
		{
			uart_buff[buffer_index++] = data_rx;
			if(buffer_index >= UART_BUFFER_SIZE - 2) buffer_index = 0;
		}else{	
			flag_data_error = 1;
			buffer_index = 0;
		}
	}
}

void uart_handle(Robot_Typedef* robot){
	if(flag_cpltReceive){
		flag_cpltReceive = 0;
		int8_t speed_left = 0;
		int8_t speed_right = 0;
		uint8_t state = 0;
		uint8_t servo_flag_1;
		uint8_t servo_flag_2;
		uint8_t index = 0;
		char *token = strtok((char *)uart_buff, " ");
		while (token != NULL)
		{
			argv[index++] = token;
			token = strtok(NULL, " ");
		}

		if(!response_uart(argv, &speed_left, &speed_right, &state, &servo_flag_1, &servo_flag_2)) return;
		
		if(servo_flag_1){
			robot->servo1->state = SERVO_OPEN;
		}else{
			robot->servo1->state = SERVO_CLOSE;
		}
		
		if(servo_flag_2){
			robot->servo2->state = SERVO_OPEN;
		}else{
			robot->servo2->state = SERVO_CLOSE;
		}
		
		if(state) robot->state = ROBOT_RUN;
		else robot->state = ROBOT_STOP;

		setpoint_left = (speed_left != 0) ? map_float(fabsf((float)speed_left), 0, 100, MIN_RPM, MAX_RPM) : 0;
		setpoint_right = (speed_right != 0) ? map_float(fabsf((float)speed_right), 0, 100, MIN_RPM, MAX_RPM) : 0;
		
		if (speed_left < 0) robot->motorLeft->direction = BACKWARD;
		else robot->motorLeft->direction = FORWARD;
		if (speed_right <= 0) robot->motorRight->direction = FORWARD;
		else robot->motorRight->direction = BACKWARD;
		robot_control(robot, setpoint_left, setpoint_right);
	}
}

