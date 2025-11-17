// src/components/PopupWindow.jsx
import { useEffect, useRef, useState } from "react";
import styles from "@/assets/styles/robotLiveConsole.module.css";

export default function PopupWindow({
  id,
  title,
  icon = "bi-window",
  children,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 600, height: 400 },
  minSize = { width: 300, height: 200 },
  onClose,
  onMinimize,
  isMinimized = false,
  zIndex = 1000,
}) {
  const windowRef = useRef(null);
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // =================== DRAG FUNCTIONALITY ===================
  const handleDragStart = (e) => {
    if (isFullscreen) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleDrag = (e) => {
    if (!isDragging || isFullscreen) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // =================== RESIZE FUNCTIONALITY ===================
  const handleResizeStart = (e) => {
    if (isFullscreen) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  const handleResize = (e) => {
    if (!isResizing || isFullscreen) return;
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    const newWidth = Math.max(minSize.width, resizeStart.width + deltaX);
    const newHeight = Math.max(minSize.height, resizeStart.height + deltaY);

    setSize({
      width: newWidth,
      height: newHeight,
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  // =================== WINDOW CONTROLS ===================
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleMinimize = () => {
    if (onMinimize) onMinimize(id);
  };

  const handleClose = () => {
    if (onClose) onClose(id);
  };

  // =================== MOUSE EVENT LISTENERS ===================
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", handleDragEnd);
      return () => {
        document.removeEventListener("mousemove", handleDrag);
        document.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResize);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing, resizeStart]);

  const windowStyle = isFullscreen
    ? {}
    : {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      };

  return (
    <div
      ref={windowRef}
      className={`${styles.popupWindow} ${isMinimized ? styles.minimized : ""} ${
        isFullscreen ? styles.fullscreen : ""
      }`}
      style={{ ...windowStyle, zIndex }}
    >
      {/* Window Header */}
      <div className={styles.windowHeader} onMouseDown={handleDragStart}>
        <div className={styles.windowTitle}>
          <i className={`bi ${icon}`}></i>
          {title}
        </div>

        <div className={styles.windowControls}>
          <button
            className={`${styles.windowBtn} ${styles.windowBtnMinimize}`}
            onClick={handleMinimize}
            title="Thu nhỏ"
          >
            <i className="bi bi-dash"></i>
          </button>
          <button
            className={`${styles.windowBtn} ${styles.windowBtnMaximize}`}
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Khôi phục" : "Toàn màn hình"}
          >
            <i className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-fullscreen"}`}></i>
          </button>
          <button
            className={`${styles.windowBtn} ${styles.windowBtnClose}`}
            onClick={handleClose}
            title="Đóng"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className={styles.windowContent}>{children}</div>

      {/* Resize Handle */}
      {!isFullscreen && (
        <div className={styles.resizeHandle} onMouseDown={handleResizeStart}></div>
      )}
    </div>
  );
}