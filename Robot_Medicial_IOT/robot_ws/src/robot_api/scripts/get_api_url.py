import os
def get_api():
    try:
        path = "/home/tungduong/IOT-Powered-Hospital-Delivery-Robot-with-AI/Robot_Medicial_IOT/robot_ws/src/robot_api/config/api_url.txt"
        with open(path, "r") as f:
            data = f.read().strip()
            return data
    except:
        print("Can not read file")
        return ""