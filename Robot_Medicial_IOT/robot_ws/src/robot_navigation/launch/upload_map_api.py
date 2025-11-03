#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
import requests
import yaml
import base64
import os

class MapUploader(Node):
    def __init__(self):
        super().__init__('map_uploader')

        # === Config API endpoint ===
        self.api_url = "http://157.66.26.217:5000/api/MapsUpload/json"

        # === Path to your map files ===
        pkg_share = os.path.join(os.path.expanduser('~'), 'robot_ws', 'src', 'robot_navigation', 'map')
        yaml_path = os.path.join(pkg_share, 'map_1.yaml')
        pgm_path = os.path.join(pkg_share, 'map_1.pgm')

        self.get_logger().info(f"Reading map YAML: {yaml_path}")

        try:
            with open(yaml_path, 'r') as file:
                map_data = yaml.safe_load(file)
        except Exception as e:
            self.get_logger().error(f"Failed to read map yaml: {e}")
            return

        # === Convert image to base64 ===
        try:
            with open(pgm_path, "rb") as image_file:
                encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            self.get_logger().error(f"Failed to read map image: {e}")
            return

        # === Prepare JSON body for POST ===
        map_json = {
            "MapName": os.path.basename(yaml_path).replace(".yaml", ""),
            "Mode": map_data.get("mode", "trinary"),
            "Resolution": float(map_data.get("resolution", 0.05)),
            "OriginX": float(map_data.get("origin", [0, 0, 0])[0]),
            "OriginY": float(map_data.get("origin", [0, 0, 0])[1]),
            "OriginZ": float(map_data.get("origin", [0, 0, 0])[2]),
            "OccupiedThresh": float(map_data.get("occupied_thresh", 0.65)),
            "FreeThresh": float(map_data.get("free_thresh", 0.25)),
            "Negate": bool(map_data.get("negate", 0)),
            "ImageName": os.path.basename(pgm_path),
            "ImageBase64": encoded_image
        }

        self.get_logger().info("Uploading map to API...")

        try:
            response = requests.post(self.api_url, json=map_json)
            if response.status_code == 201:
                self.get_logger().info(f"✅ Upload successful: {response.json()}")
            else:
                self.get_logger().error(f"❌ Upload failed [{response.status_code}]: {response.text}")
        except Exception as e:
            self.get_logger().error(f"Error posting to API: {e}")


def main(args=None):
    rclpy.init(args=args)
    node = MapUploader()
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
