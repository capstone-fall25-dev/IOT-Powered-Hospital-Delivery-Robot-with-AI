#ifndef STEPPER_MOTOR_H
#define STEPPER_MOTOR_H

#include "stm32f1xx_hal.h"
#include "as5600.h"

#define MIN_RPM 40
#define MAX_RPM 1000
#define NUMS_OF_MOTOR 2
#define FULL_STEP_MODE 400
#define TIMER_FREQ 1000000
#define RATIO_MOTOR 5.18f

typedef enum
{
	FORWARD,
	BACKWARD
} Direct_State;

typedef enum
{
	ACTIVE,
	INACTIVE
} Motor_State;

typedef struct
{
	TIM_HandleTypeDef *htim;
	uint32_t Channel;
	GPIO_TypeDef *DIR_Port;
	uint16_t DIR_Pin;
	GPIO_TypeDef *ENA_Port;
	uint16_t ENA_Pin;
	uint16_t steps_per_round; // number of steps per round
	volatile Motor_State state;
	Direct_State direction;
	volatile float speed;
	AS5600_Typedef *encoder;
} StepperMotor;

void Stepper_Init(StepperMotor *motor, TIM_HandleTypeDef *htim, uint32_t Channel, AS5600_Typedef *_encoder,
				  GPIO_TypeDef *DIR_Port, uint16_t DIR_Pin,
				  GPIO_TypeDef *ENA_Port, uint16_t ENA_Pin);

void Stepper_Setup(StepperMotor *motor, Direct_State _direct, float rpm);
void Stepper_Enable(StepperMotor *motor);
void Stepper_Disable(StepperMotor *motor);
void Stepper_SetDirection(StepperMotor *motor);
void Stepper_SetSpeedRPM(StepperMotor *motor);

#endif
