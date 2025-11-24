#ifndef SERVO_H
#define SERVO_H

#include "stm32f1xx.h"
#define MIN_PULSE_WIDTH 400
#define MAX_PULSE_WIDTH 2500
#define SERVO_NUMER 3
#define SERVO1_ANGLE_OPEN 156
#define SERVO1_ANGLE_CLOSE 82
#define SERVO2_ANGLE_OPEN 30
#define SERVO2_ANGLE_CLOSE 105

typedef enum{
	SERVO_OPEN,
	SERVO_CLOSE
}Servo_State;

typedef struct{
	TIM_HandleTypeDef *htim;
	uint32_t Channel;
	uint8_t Angle;
	Servo_State state;
}Servo_TypeDef;

extern Servo_TypeDef* servo_list[SERVO_NUMER];

void Servo_Set(Servo_TypeDef* servo, uint8_t angle);
void Servo_Init(Servo_TypeDef *servo, TIM_HandleTypeDef* htim, uint32_t channel);
#endif
