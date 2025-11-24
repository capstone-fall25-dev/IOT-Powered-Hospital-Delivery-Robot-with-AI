#include "response.h"
#include "robot.h"
#include "string.h"
#include "stdio.h"
#include "math.h"

#define MAX_RANGE_SPEED 100
#define MIN_RANGE_SPEED -100

static int8_t get_data(char *data){
    if(data == NULL) return -1;
    uint8_t flag = 0;        
    uint8_t count_minus = 0; 
    int16_t value = 0; 
    uint8_t len = strlen(data);

    if(len == 0) return -1;

    for(uint8_t k = 0; k < len; k++){
        if(data[k] == '-'){
            if (count_minus >= 1 || k != 0) return -1;
            flag = 1;
            count_minus++;
            continue;
        }
        if(data[k] < '0' || data[k] > '9') return -1;

        value = value * 10 + (data[k] - '0');
    }
	if(value > 100) return 120;
    if(flag) value = -value;
    return (int8_t)value;
}


static void get_info_cmd(char **argv, int8_t* speed_left, int8_t* speed_right, uint8_t* servo1_flag, uint8_t* servo2_flag){
	*speed_left = get_data(argv[0]);
	*speed_right = get_data(argv[1]);
	*servo1_flag = (uint8_t)get_data(argv[2]);
	*servo2_flag = (uint8_t)get_data(argv[3]);
}

uint8_t response_uart(char **argv, int8_t* speed_left, int8_t* speed_right, uint8_t* state, uint8_t* servo1_flag, uint8_t* servo2_flag){
	get_info_cmd(argv, speed_left, speed_right, servo1_flag, servo2_flag);
	if(*speed_left == 0 && *speed_right == 0) *state = 0;
	else *state = 1;
	if (*speed_left > MAX_RANGE_SPEED || *speed_right > MAX_RANGE_SPEED || *speed_left < MIN_RANGE_SPEED || *speed_right < MIN_RANGE_SPEED || *servo1_flag > 1 || *servo2_flag > 1)
		return 0;
	return 1;
}
