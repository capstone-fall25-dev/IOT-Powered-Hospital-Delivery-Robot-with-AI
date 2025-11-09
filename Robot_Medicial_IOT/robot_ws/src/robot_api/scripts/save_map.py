#!/usr/bin/env python3
import os
import subprocess
import base64
import yaml
from datetime import datetime
import threading
import asyncio

import requests
from fastapi import FastAPI, HTTPException
import uvicorn

import rclpy
from rclpy.node import Node
from ament_index_python import get_package_share_directory


class MapWebhookNode(Node):
    """
    ROS2 node that exposes an HTTP endpoint.
    When a POST /save_map request arrives, it:
      1) saves the current map via nav2 map_saver_cli
      2) reads the saved map (.pgm + .yaml)
      3) uploads the map JSON to configured upload API
    """
    def __init__(self,
                 upload_api_url: str = "http://localhost:5170/api/MapsUpload/json",
                 package_name: str = "robot_navigation",
                 map_subfolder: str = "map"):
        super().__init__('map_webhook_node')
        self.get_logger().info("MapWebhookNode started")
        self.upload_api_url = upload_api_url

        # Directory inside package to save maps
        pkg_share = get_package_share_directory(package_name)
        self.map_dir = os.path.join(pkg_share, map_subfolder)
        os.makedirs(self.map_dir, exist_ok=True)
        self.get_logger().info(f"Map dir: {self.map_dir}")

        # FastAPI app
        self.app = FastAPI(title="Map Save & Upload Webhook")

        @self.app.post("/save_map")
        async def save_map_endpoint(payload: dict):
            """
            Expects optional JSON payload:
              {
                "map_name": "optional_map_name",
                "triggered_by": "optional_info"
              }
            Returns JSON with status and details.
            """
            # Extract optional map_name
            map_name = None
            if isinstance(payload, dict):
                map_name = payload.get("map_name")
            if not map_name:
                # default base name
                map_name = "map"

            # Run save+upload in background thread to avoid blocking the server loop
            try:
                result = await asyncio.to_thread(self._save_and_upload, map_name)
                # result is dict
                return result
            except Exception as e:
                self.get_logger().error(f"Error in save/upload: {e}")
                raise HTTPException(status_code=500, detail=str(e))

    def start_api(self, host: str = "0.0.0.0", port: int = 8000):
        """Run uvicorn in background thread"""
        thread = threading.Thread(
            target=uvicorn.run,
            args=(self.app,),
            kwargs={"host": host, "port": port, "log_level": "info"},
            daemon=True
        )
        thread.start()
        self.get_logger().info(f"HTTP API started at http://{host}:{port}")

    def _save_and_upload(self, base_map_name: str):
        """
        Blocking function executed in thread:
         - save map using nav2_map_server map_saver_cli
         - read files, encode, upload
        Returns a dict with status and info.
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        full_map_name = f"{base_map_name}_{timestamp}"
        map_path_prefix = os.path.join(self.map_dir, full_map_name)
        yaml_path = f"{map_path_prefix}.yaml"
        pgm_path = f"{map_path_prefix}.pgm"

        # 1) Save map
        cmd = f"ros2 run nav2_map_server map_saver_cli -f {map_path_prefix}"
        self.get_logger().info(f"Saving map with command: {cmd}")
        try:
            subprocess.run(cmd, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as ex:
            stderr = ex.stderr.decode('utf-8') if ex.stderr else str(ex)
            self.get_logger().error(f"Failed to save map: {stderr}")
            raise RuntimeError(f"map_saver failed: {stderr}")

        # verify files
        if not os.path.exists(yaml_path) or not os.path.exists(pgm_path):
            self.get_logger().error(f"Saved files missing: yaml={os.path.exists(yaml_path)} pgm={os.path.exists(pgm_path)}")
            raise RuntimeError("Saved map files not found after map_saver run")

        # 2) Read yaml
        try:
            with open(yaml_path, 'r') as f:
                map_data = yaml.safe_load(f)
        except Exception as e:
            self.get_logger().error(f"Failed to read yaml: {e}")
            raise

        # 3) Read and encode image
        try:
            with open(pgm_path, "rb") as f:
                encoded_image = base64.b64encode(f.read()).decode('utf-8')
        except Exception as e:
            self.get_logger().error(f"Failed to read PGM: {e}")
            raise

        # 4) Build JSON payload to upload
        payload = {
            "MapName": os.path.basename(yaml_path).replace(".yaml", ""),
            "Mode": map_data.get("mode", "trinary"),
            "Resolution": float(map_data.get("resolution", 0.05)),
            "OriginX": float(map_data.get("origin", [0, 0, 0])[0]),
            "OriginY": float(map_data.get("origin", [0, 0, 0])[1]),
            "OriginZ": float(map_data.get("origin", [0, 0, 0])[2]),
            "OccupiedThresh": float(map_data.get("occupied_thresh", 0.65)),
            "FreeThresh": float(map_data.get("free_thresh", 0.25)),
            "Negate": int(map_data.get("negate", 0)),
            "ImageName": os.path.basename(pgm_path),
            "ImageBase64": encoded_image
        }

        self.get_logger().info(f"Uploading map '{payload['MapName']}' to {self.upload_api_url} ...")
        try:
            resp = requests.post(self.upload_api_url, json=payload, timeout=30)
        except Exception as e:
            self.get_logger().error(f"HTTP request failed: {e}")
            raise RuntimeError(f"Upload HTTP request failed: {e}")

        if resp.status_code not in (200, 201):
            self.get_logger().error(f"Upload failed code={resp.status_code} text={resp.text}")
            raise RuntimeError(f"Upload failed: {resp.status_code} {resp.text}")

        # success
        try:
            resp_json = resp.json()
        except Exception:
            resp_json = {"text": resp.text}

        self.get_logger().info(f"Map uploaded successfully: {resp.status_code}")
        return {
            "status": "success",
            "map_name": payload["MapName"],
            "yaml_path": yaml_path,
            "pgm_path": pgm_path,
            "upload_status": resp.status_code,
            "upload_response": resp_json
        }


def main(args=None):
    rclpy.init(args=args)
    # You can change upload_api_url and package name if needed
    node = MapWebhookNode(upload_api_url=os.environ.get("MAP_UPLOAD_API", "http://localhost:5170/api/MapsUpload/json"),
                          package_name=os.environ.get("ROBOT_PKG", "robot_navigation"),
                          map_subfolder=os.environ.get("MAP_SUBFOLDER", "map"))
    node.start_api(host="0.0.0.0", port=int(os.environ.get("MAP_API_PORT", "8000")))
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()
