import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function RobotDetail({ robot }) {
    const data = robot || {
        name: "Robot A1",
        type: "Vận chuyển thuốc",
        id: "RB-A1-001",
        status: "Đang hoạt động",
        battery: 78,
        location: "Khoa Nội - Tầng 3",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWiKDAUyyUTsFFWQjPyzYOtquG8FoXLz07Bg&s",
        gallery: [
            "https://file3.qdnd.vn/data/images/0/2023/02/01/tuanson/17.jpg?dpi=150&quality=100&w=870",
            "https://file3.qdnd.vn/data/images/0/2023/02/01/tuanson/19.jpg",
            "https://file.qdnd.vn/data/images/0/2020/06/16/tuanson/1.jpg?dpi=150&quality=100&w=575",
            "https://media.vov.vn/sites/default/files/styles/large/public/2023-01/xe%20tang%20My%20Abrams%20-twitter.jpg",
        ],
        logs: [
            { time: "10:30", task: "Giao thuốc cho phòng 305", status: "Hoàn thành" },
            { time: "09:45", task: "Nạp pin", status: "Hoàn thành" },
            { time: "09:00", task: "Chờ nhiệm vụ", status: "Đang chờ" },
        ],
    };

    return (
        <div
            style={{
                background: "linear-gradient(135deg, #8bf0e4 0%, #ffffff 100%)",
                minHeight: "100vh",
                padding: "60px 0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <div className="container" style={{ fontFamily: "Inter", color: "#111010" }}>
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.85)",
                        backdropFilter: "blur(15px)",
                        WebkitBackdropFilter: "blur(15px)",
                        borderRadius: "20px",
                        boxShadow: "0 8px 32px rgba(31, 38, 135, 0.2)",
                        padding: "40px",
                    }}
                >
                    {/* Header */}
                    <div className="d-flex align-items-center mb-4">
                        <img
                            src={data.image}
                            alt={data.name}
                            className="rounded-3 me-4 shadow-sm"
                            style={{
                                width: 150,
                                height: 150,
                                objectFit: "cover",
                                border: "3px solid #fff",
                            }}
                        />
                        <div>
                            <h2 className="fw-bold mb-1">{data.name}</h2>
                            <div className="text-muted">{data.id}</div>
                            <span
                                className={`badge ${data.status === "Đang hoạt động" ? "bg-success" : "bg-secondary"
                                    } me-2`}
                            >
                                {data.status}
                            </span>
                        </div>
                    </div>

                    <hr />

                    {/* Thông tin và Lịch sử */}
                    <div className="row">
                        <div className="col-md-6">
                            <h5>Thông tin chi tiết</h5>
                            <ul className="list-unstyled mt-3">
                                <li><strong>Loại robot:</strong> {data.type}</li>
                                <li><strong>Vị trí hiện tại:</strong> {data.location}</li>
                                <li><strong>Kết nối:</strong> Online</li>
                            </ul>
                            <button className="btn btn-primary rounded-pill mt-3 px-4 shadow-sm">
                                Điều khiển robot
                            </button>
                        </div>

                        <div className="col-md-6">
                            <h5>Lịch sử hoạt động</h5>
                            <div className="mt-3">
                                {data.logs.map((log, idx) => (
                                    <div
                                        key={idx}
                                        className="d-flex justify-content-between border-bottom py-2"
                                    >
                                        <div>
                                            <strong>{log.task}</strong>
                                            <div className="small text-muted">{log.time}</div>
                                        </div>
                                        <span
                                            className={`badge ${log.status === "Hoàn thành"
                                                ? "bg-success"
                                                : log.status === "Đang chờ"
                                                    ? "bg-warning text-dark"
                                                    : "bg-secondary"
                                                }`}
                                        >
                                            {log.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bộ sưu tập ảnh */}
                    {data.gallery && data.gallery.length > 0 && (
                        <>
                            <hr className="my-4" />
                            <h5 className="mb-3">Hình ảnh hoạt động</h5>
                            <div className="row g-3">
                                {data.gallery.map((img, idx) => (
                                    <div key={idx} className="col-md-3 col-6">
                                        <div
                                            style={{
                                                overflow: "hidden",
                                                borderRadius: "12px",
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                transition: "transform 0.3s ease",
                                            }}
                                            className="hover-zoom"
                                        >
                                            <img
                                                src={img}
                                                alt={`robot-${idx}`}
                                                style={{
                                                    width: "100%",
                                                    height: "180px",
                                                    objectFit: "cover",
                                                    borderRadius: "12px",
                                                    transition: "transform 0.4s ease",
                                                }}
                                                onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                                                onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
