#include "step_motor.h"

static StepperMotor *motors[NUMS_OF_MOTOR] = {NULL};

void Stepper_Init(StepperMotor *motor, TIM_HandleTypeDef *htim, uint32_t channel, AS5600_Typedef *_encoder, GPIO_TypeDef *dir_port, uint16_t dir_pin, GPIO_TypeDef *en_port, uint16_t en_pin){
	motor->htim = htim;
	motor->htim->Instance->ARR = 0;
	motor->Channel = channel;
	motor->encoder = _encoder;
	motor->DIR_Port = dir_port;
	motor->DIR_Pin = dir_pin;
	motor->ENA_Port = en_port;
	motor->ENA_Pin = en_pin;
	motor->state = INACTIVE;
	motor->steps_per_round = FULL_STEP_MODE;
	motor->speed = 0.0f;
	for (uint8_t i = 0; i < NUMS_OF_MOTOR; ++i){
		if (motors[i] == motor)
			return;
		if (motors[i] == NULL){
			motors[i] = motor;
			return;
		}
	}
	Stepper_Disable(motor);
}

void Stepper_Enable(StepperMotor *motor){
	HAL_TIM_PWM_Start(motor->htim, motor->Channel);
	HAL_GPIO_WritePin(motor->ENA_Port, motor->ENA_Pin, GPIO_PIN_RESET);
	motor->state = ACTIVE;
}

void Stepper_Disable(StepperMotor *motor){
	HAL_GPIO_WritePin(motor->ENA_Port, motor->ENA_Pin, GPIO_PIN_SET);
	motor->state = INACTIVE;
	HAL_TIM_PWM_Stop(motor->htim, motor->Channel);
}

void Stepper_SetDirection(StepperMotor *motor){
	HAL_GPIO_WritePin(motor->DIR_Port, motor->DIR_Pin, (GPIO_PinState)motor->direction);
}

void Stepper_SetSpeedRPM(StepperMotor *motor){
	if (motor->speed < MIN_RPM){
		motor->htim->Instance->ARR = 0;
		motor->htim->Instance->CCR1 = 0;
		Stepper_Disable(motor);
		return;
	}

	uint32_t freq = (uint32_t)((motor->speed * motor->steps_per_round) / 60.0f);
	if (freq > TIMER_FREQ)
		freq = TIMER_FREQ;
	uint32_t arr = (uint32_t)(TIMER_FREQ / freq) - 1;
	motor->htim->Instance->ARR = (arr >= 2) ? arr : 2;
	motor->htim->Instance->CCR1 = arr / 2;
	if (motor->state == INACTIVE){
		Stepper_Enable(motor);
	}
}

void Stepper_Control(StepperMotor *motor){
	Stepper_SetDirection(motor);
	Stepper_SetSpeedRPM(motor);
}

void Stepper_Setup(StepperMotor *motor, Direct_State _direct, float rpm){
	motor->direction = _direct;
	motor->speed = rpm;
	Stepper_Control(motor);
}

// void HAL_TIM_PWM_PulseFinishedCallback(TIM_HandleTypeDef* htim){
//
//	for(uint8_t i=0; i < NUMS_OF_MOTOR; ++i){
//		if(motors[i] == NULL) continue;
//		if(motors[i]->htim == htim && motors[i]->state == ACTIVE){
//			flag_done_step = 1;
//			//motors[i]->step_count++;
////			if(motors[i]->step_count >= motors[i]->target_steps){
////				//HAL_TIM_PWM_Stop_IT(motors[i]->htim, motors[i]->Channel);
////				motors[i]->step_count = 0;
////				motors[i]->target_steps = 0;
////			}
//		}
//	}
//}
