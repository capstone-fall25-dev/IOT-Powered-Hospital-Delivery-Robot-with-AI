#ifndef ROBOT_H
#define ROBOT_H

#include "stm32f1xx.h"
#include "step_motor.h"
#include "servo.h"

typedef enum
{
	ROBOT_STOP,
	ROBOT_RUN,
	INVALID
} Robot_State;

typedef struct
{
	StepperMotor *motorLeft;
	StepperMotor *motorRight;
	float v_left;
	float v_right;
	Robot_State state;
	Servo_TypeDef* servo1;
	Servo_TypeDef* servo2;
} Robot_Typedef;

void robot_init(Robot_Typedef *robot, Servo_TypeDef* servo_1, Servo_TypeDef* servo_2, StepperMotor *_motorLeft, StepperMotor *_motorRight);
void robot_control(Robot_Typedef *robot, float speed_left, float speed_right);
void Calculate_Velocity(Robot_Typedef *robot);
void Control_Servo(Robot_Typedef* robot);
#endif
