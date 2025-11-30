#include "robot.h"
#include "main.h"
#include "math.h"

uint32_t time_delay_servo_1 = 0;
uint32_t time_delay_servo_2 = 0;

void robot_init(Robot_Typedef *robot, Servo_TypeDef* servo_1, Servo_TypeDef* servo_2, StepperMotor *_motorLeft, StepperMotor *_motorRight)
{
	robot->servo1 = servo_1;
	robot->servo2 = servo_2;
	robot->motorLeft = _motorLeft;
	robot->motorRight = _motorRight;
	robot->v_left = 0.0f;
	robot->v_right = 0.0f;
	robot->state = ROBOT_STOP;
	robot_control(robot, 0, 0);
	Servo_Set(robot->servo1, SERVO1_ANGLE_CLOSE);
	Servo_Set(robot->servo2, SERVO2_ANGLE_CLOSE);
}

void robot_control(Robot_Typedef *robot, float speed_left, float speed_right)
{
	if (robot->state == ROBOT_RUN)
	{
		Stepper_Setup(robot->motorLeft, speed_left);
		Stepper_Setup(robot->motorRight, speed_right);
	}
	else if (robot->state == ROBOT_STOP)
	{
		Stepper_Setup(robot->motorLeft, 0);
		Stepper_Setup(robot->motorRight, 0);
	}
}

void Calculate_Velocity(Robot_Typedef *robot)
{
	robot->v_left = ((robot->motorLeft->direction == BACKWARD) ? (AS5600_CalVelocity(robot->motorLeft->encoder) * (-1.0f)) : AS5600_CalVelocity(robot->motorLeft->encoder)) / RATIO_MOTOR;
	robot->v_right = ((robot->motorRight->direction == FORWARD) ? (AS5600_CalVelocity(robot->motorRight->encoder) * (-1.0f)) : AS5600_CalVelocity(robot->motorRight->encoder)) / RATIO_MOTOR;
}

void Control_Servo(Robot_Typedef* robot){
	if(robot->servo1->state == SERVO_OPEN && robot->servo1->Angle != SERVO1_ANGLE_OPEN){
		for(uint8_t i=robot->servo1->Angle; i <= SERVO1_ANGLE_OPEN; i++){
			Servo_Set(robot->servo1, i);
			HAL_Delay(2);
		}
					
	}
	if(robot->servo1->state == SERVO_CLOSE && robot->servo1->Angle != SERVO1_ANGLE_CLOSE){
		for(uint8_t i=robot->servo1->Angle; i>= SERVO1_ANGLE_CLOSE; i--){
			Servo_Set(robot->servo1, i);
			HAL_Delay(2);
		}
		
	}
	
	if(robot->servo2->state == SERVO_OPEN && robot->servo2->Angle != SERVO2_ANGLE_OPEN){
		for(uint8_t i=robot->servo2->Angle; i >= SERVO2_ANGLE_OPEN; i--){
			Servo_Set(robot->servo2, i);
			HAL_Delay(2);
		}
		
	}
	if(robot->servo2->state == SERVO_CLOSE && robot->servo2->Angle != SERVO2_ANGLE_CLOSE){
		for(uint8_t i=robot->servo2->Angle; i<= SERVO2_ANGLE_CLOSE; i++){
			Servo_Set(robot->servo2, i);
			HAL_Delay(1);
		}
	}
}
