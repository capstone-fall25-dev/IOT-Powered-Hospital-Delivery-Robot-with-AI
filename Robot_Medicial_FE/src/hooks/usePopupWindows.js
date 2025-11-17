// src/hooks/usePopupWindows.js (Updated)
import { useState } from "react";

export function usePopupWindows() {
  const [windows, setWindows] = useState({
    camera: { isOpen: true, isMinimized: false, zIndex: 1000 },
    map: { isOpen: true, isMinimized: false, zIndex: 1001 },
    navMap: { isOpen: false, isMinimized: false, zIndex: 1002 },
    liveMap: { isOpen: false, isMinimized: false, zIndex: 1003 },
  });

  const [nextZIndex, setNextZIndex] = useState(1004);

  const openWindow = (id) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], isOpen: true, isMinimized: false, zIndex: nextZIndex },
    }));
    setNextZIndex(nextZIndex + 1);
  };

  const closeWindow = (id) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], isOpen: false },
    }));
  };

  const minimizeWindow = (id) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], isMinimized: !prev[id].isMinimized },
    }));
  };

  const focusWindow = (id) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], zIndex: nextZIndex },
    }));
    setNextZIndex(nextZIndex + 1);
  };

  return {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    focusWindow,
  };
}