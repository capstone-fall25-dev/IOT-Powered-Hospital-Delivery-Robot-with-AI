// src/pages/EditTask.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTaskEditData, updateTask } from "@/services/taskService";
import { getAllMaps, getMapById } from "@/services/mapService";
import { getAllPatients } from "@/services/patientService";
import {
    getUnlockedCompartments,
    getCompartmentsByRobotAndCategory,
    getCompartmentById,
    getAllCategories,
} from "@/services/robotCompartmentService";
import { getAllPrescriptions, approvePrescriptionByCode, updatePrescription } from "@/services/prescriptionServices";
import { getAvailableRobots } from "@/services/robotService";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";
import styles from "@/assets/styles/taskForm.module.css";

// ======================= CONSTANTS =========================

// Dùng nếu sau này bạn muốn hiển thị text cho priority
const PRIORITY_MAP = {
    0: "Bình thường",
    1: "Khẩn cấp",
    2: "Nguy cấp",
};

// Các trạng thái nhiệm vụ (task.status) — hiển thị tiếng Việt
const TASK_STATUS_OPTIONS = [
    { value: "pending", valueVi: "Đang chờ" },
    { value: "in_progress", valueVi: "Đang thực hiện" },
    { value: "awaiting_handover", valueVi: "Chờ bàn giao" },
    { value: "returning", valueVi: "Đang quay về" },
    { value: "at_station", valueVi: "Đang ở trạm" },
    { value: "completed", valueVi: "Hoàn tất" },
    { value: "failed", valueVi: "Thất bại" },
    { value: "canceled", valueVi: "Đã hủy" },
];

// Các trạng thái nhiệm vụ cho phép EDIT (đồng bộ với AllowedStatusForEdit bên BE)
const EDITABLE_TASK_STATUSES = [
    "pending",
    "in_progress",
    "awaiting_handover",
    "returning",
    "at_station",
];

// Các trạng thái cho Stop
const STOP_STATUS_OPTIONS = [
    { value: "", label: "Giữ nguyên" },
    { value: "pending", label: "Chờ giao" },
    { value: "in_progress", label: "Đang giao" },
    { value: "awaiting_handover", label: "Chờ bàn giao" },
    { value: "delivered", label: "Đã giao xong" },
    { value: "skipped", label: "Bỏ qua" },
    { value: "failed", label: "Thất bại" },
];

export default function EditTask() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

    // ===================== STATE =====================
    const [loading, setLoading] = useState(true);

    const [maps, setMaps] = useState([]);
    const [robots, setRobots] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [patients, setPatients] = useState([]);
    const [categories, setCategories] = useState([]);

    const [baseCompartments, setBaseCompartments] = useState([]);
    const [unselectPrescriptionModal, setUnselectPrescriptionModal] = useState({
        show: false,
        prescriptionCode: "",
        prescriptionId: null,
        originalStatus: "",
        stopIndex: -1,
        loading: false,
    });

    const [form, setForm] = useState({
        mapId: "",
        robotId: "",
        priority: 0,
        scheduledStartAt: "",
        stops: [],
    });

    // Trạng thái nhiệm vụ (task.status)
    const [taskStatus, setTaskStatus] = useState("");               // status đang hiển thị / chọn trên UI
    const [initialTaskStatus, setInitialTaskStatus] = useState(""); // status ban đầu trả về từ BE

    const [initLoaded, setInitLoaded] = useState(false);

    // ============================================================
    // PRESCRIPTION STATUS MAP (chuyển status sang tiếng Việt)
    // ============================================================
    const prescriptionStatusMap = {
        pending: "Đang chờ",
        approved: "Đã duyệt",
        dispensed: "Đã phát",
        canceled: "Đã hủy",
    };

    function getPrescriptionStatusText(status) {
        if (!status) return "";
        return prescriptionStatusMap[status.toLowerCase()] || "Không xác định";
    }

    // ===================== LOAD INITIAL BASE DATA =====================
    useEffect(() => {
        async function loadInit() {
            try {
                const [mapsData, robotsData, patientsData, categoriesData] =
                    await Promise.all([
                        getAllMaps(),
                        getAvailableRobots(),
                        getAllPatients(),
                        getAllCategories(),
                    ]);

                setMaps(mapsData);
                // getAvailableRobots() trả về {message, available_count, data: Array}
                // Cần lấy data array
                setRobots(robotsData?.data || robotsData || []);
                setPatients(patientsData);
                setCategories(categoriesData);
            } catch (err) {
                console.error(err);
                showToast("error", err.message);
            }
        }

        loadInit().then(() => setInitLoaded(true));
    }, []);

    // ===================== LOAD TASK EDIT DTO =====================
    useEffect(() => {
        if (!initLoaded) {
            return;
        }
        if (!categories || categories.length === 0) {
            return;
        }
        // Đợi robots được load để có thể so sánh và thêm robot fallback nếu cần
        if (!robots || robots.length === 0) {
            return;
        }

        async function loadTask() {
            try {
                const data = await getTaskEditData(id);

                // Nếu robot hiện tại không nằm trong danh sách available → thêm robot "không khả dụng" vào list
                // So sánh với type conversion để tránh type mismatch (number vs string)
                if (Array.isArray(robots) && data.robotId && 
                    !robots.some((r) => Number(r.id) === Number(data.robotId))) {
                    setRobots((prev) => {
                        // Kiểm tra xem đã có robot này chưa (tránh duplicate)
                        if (prev.some((r) => Number(r.id) === Number(data.robotId))) {
                            return prev;
                        }
                        return [
                            ...prev,
                            {
                                id: data.robotId,
                                name: `Robot #${data.robotId} (không khả dụng)`,
                                batteryPercent: 0,
                            },
                        ];
                    });
                }

                // Convert stops BE -> structure FE
                const editedStops = await Promise.all(
                    data.stops.map(async (s) => {
                        let filtered = [];
                        let resolvedCategoryId = (s.categoryId && s.categoryId > 0) ? s.categoryId : null;
                        
                        // Nếu có categoryId từ BE → load compartments theo category
                        if (s.categoryId && s.categoryId > 0) {
                            filtered = await getCompartmentsByRobotAndCategory(
                                data.robotId,
                                s.categoryId
                            );
                        }
                        // Nếu không có categoryId nhưng có compartmentId → cần tìm categoryId từ compartment
                        else if (s.compartmentId && s.compartmentId > 0) {
                            try {
                                // Thử load compartment detail trực tiếp theo ID để lấy categoryId
                                const compDetail = await getCompartmentById(s.compartmentId);
                                
                                if (compDetail && compDetail.categoryId) {
                                    // Tìm thấy compartment và có categoryId → load compartments theo category
                                    resolvedCategoryId = compDetail.categoryId;
                                    filtered = await getCompartmentsByRobotAndCategory(
                                        data.robotId,
                                        resolvedCategoryId
                                    );
                                } else {
                                    // Compartment không có categoryId → thử tìm trong unlocked compartments
                                    const allCompartments = await getUnlockedCompartments(data.robotId);
                                    const foundComp = allCompartments.find((c) => Number(c.id) === Number(s.compartmentId));
                                    
                                    if (foundComp && foundComp.categoryId) {
                                        resolvedCategoryId = foundComp.categoryId;
                                        filtered = await getCompartmentsByRobotAndCategory(
                                            data.robotId,
                                            resolvedCategoryId
                                        );
                                    } else {
                                        // Không tìm thấy compartment hoặc không có categoryId → thêm fallback
                                        filtered = [
                                            {
                                                id: s.compartmentId,
                                                compartmentCode: `#${s.compartmentId} (không khả dụng)`,
                                            },
                                        ];
                                    }
                                }
                            } catch (err) {
                                // Nếu không load được compartment detail, thử tìm trong unlocked compartments
                                const allCompartments = await getUnlockedCompartments(data.robotId);
                                const foundComp = allCompartments.find((c) => Number(c.id) === Number(s.compartmentId));
                                
                                if (foundComp && foundComp.categoryId) {
                                    resolvedCategoryId = foundComp.categoryId;
                                    filtered = await getCompartmentsByRobotAndCategory(
                                        data.robotId,
                                        resolvedCategoryId
                                    );
                                } else {
                                    // Không tìm thấy → thêm fallback
                                    filtered = [
                                        {
                                            id: s.compartmentId,
                                            compartmentCode: `#${s.compartmentId} (không khả dụng)`,
                                        },
                                    ];
                                }
                            }
                        }

                        // Nếu compartmentId BE trả về không có trong filtered → thêm fallback
                        // So sánh với cả number và string để tránh type mismatch
                        const hasCompartment = s.compartmentId && s.compartmentId > 0 && filtered.some((c) => {
                            const compId = Number(c.id);
                            const stopCompId = Number(s.compartmentId);
                            return compId === stopCompId;
                        });
                        
                        if (s.compartmentId && s.compartmentId > 0 && !hasCompartment) {
                            filtered = [
                                ...filtered,
                                {
                                    id: s.compartmentId,
                                    compartmentCode: `#${s.compartmentId} (không khả dụng)`,
                                },
                            ];
                        }

                        // Load prescription preview và list nếu có bệnh nhân và category là thuốc
                        let prescriptionPreview = null;
                        let prescriptionList = [];
                        let prescriptionCode = "";

                        // Kiểm tra category có phải thuốc không (cần load categories trước)
                        // Sử dụng resolvedCategoryId nếu có, nếu không dùng categoryId từ BE
                        const finalCategoryId = resolvedCategoryId || (s.categoryId && s.categoryId > 0 ? s.categoryId : null);
                        const category = finalCategoryId && finalCategoryId > 0 
                            ? categories.find((c) => Number(c.id) === Number(finalCategoryId))
                            : null;
                        const isMedicine = category && category.name && 
                            ["thuốc", "medicine", "drug", "medication", "dược phẩm", "pharmaceutical"]
                                .some((keyword) => category.name.toLowerCase().includes(keyword));

                        if (s.patientId && isMedicine) {
                            // Load tất cả prescriptions (pending, dispensed, approved) trừ canceled
                            const allPrescriptions = await getAllPrescriptions({ patientId: s.patientId });
                            const validPrescriptions = (allPrescriptions || [])
                                .filter((p) => p.status?.toLowerCase() !== "canceled")
                                .map((p) => ({
                                    ...p,
                                    originalStatus: p.status, // Lưu status ban đầu
                                }));
                            prescriptionList = validPrescriptions;

                            // Tìm prescription đã được chọn (nếu có trong itemDesc hoặc prescriptionCode)
                            // Hoặc lấy approved đầu tiên
                            if (validPrescriptions.length > 0) {
                                // Tìm prescription code từ itemDesc nếu có
                                const itemDescMatch = s.itemDesc?.match(/RX#([A-Z0-9-]+)/);
                                const codeFromItemDesc = itemDescMatch ? itemDescMatch[1] : null;
                                
                                if (codeFromItemDesc) {
                                    prescriptionPreview = validPrescriptions.find(
                                        (p) => p.prescriptionCode === codeFromItemDesc
                                    );
                                    if (prescriptionPreview) {
                                        prescriptionCode = prescriptionPreview.prescriptionCode;
                                    }
                                } else {
                                    // Lấy approved đầu tiên hoặc latest
                                    prescriptionPreview = validPrescriptions
                                        .filter((p) => p.status?.toLowerCase() === "approved")
                                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] 
                                        || validPrescriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                                    if (prescriptionPreview) {
                                        prescriptionCode = prescriptionPreview.prescriptionCode;
                                    }
                                }
                            }
                        }

                        return {
                            stopId: s.stopId,
                            seqNo: s.seqNo,
                            destinationId: s.destinationId ? String(s.destinationId) : "",
                            patientId: s.patientId ? String(s.patientId) : "",
                            // Sử dụng resolvedCategoryId nếu có, nếu không dùng categoryId từ BE (chỉ dùng nếu > 0)
                            categoryId: (resolvedCategoryId || (s.categoryId && s.categoryId > 0 ? s.categoryId : null)) 
                                ? String(resolvedCategoryId || s.categoryId) 
                                : "",
                            compartmentId: s.compartmentId ? String(s.compartmentId) : "",
                            customName: s.customName ?? "",
                            itemDesc: s.itemDesc ?? "",
                            status: s.status, // giữ status hiện tại của stop
                            filteredCompartments: filtered,
                            prescriptionPreview,
                            prescriptionList,
                            prescriptionCode,
                        };
                    })
                );

                const formData = {
                    mapId: data.mapId ? String(data.mapId) : "",
                    robotId: data.robotId ? String(data.robotId) : "",
                    priority: data.priority, // BE đang trả 0/1/2
                    scheduledStartAt: data.scheduledStartAt
                        ? formatDateTimeLocal(data.scheduledStartAt)
                        : "",
                    stops: editedStops,
                };
                
                setForm(formData);

                // Lưu trạng thái nhiệm vụ ban đầu
                setTaskStatus(data.status);
                setInitialTaskStatus(data.status);

                // load destinations theo map
                const mapDetail = await getMapById(data.mapId);
                setDestinations(mapDetail.destinations || []);

                // load unlocked compartments cho robot
                const comps = await getUnlockedCompartments(data.robotId);
                setBaseCompartments(comps);

                setLoading(false);
            } catch (err) {
                console.error(err);
                showToast("error", err.message);
                setLoading(false);
            }
        }

        loadTask();
    }, [id, initLoaded, robots, categories]);

    // ===================== HELPER: Format datetime cho input datetime-local =====================
    // Input datetime-local cần format: YYYY-MM-DDTHH:mm (local time, không có timezone)
    // Vấn đề: Database lưu local time (UTC+7), nhưng backend có thể serialize thành UTC (có Z)
    // → Khi frontend parse UTC, JavaScript tự động convert về local time của browser
    // → Nếu browser không ở UTC+7 → lệch giờ
    // Giải pháp: Nếu backend trả về UTC (có Z), cần điều chỉnh về UTC+7 (giờ Việt Nam)
    function formatDateTimeLocal(dateTimeString) {
        if (!dateTimeString) return "";
        
        try {
            let date;
            
            // Kiểm tra xem string có Z (UTC) hay không
            if (typeof dateTimeString === 'string' && dateTimeString.endsWith('Z')) {
                // Backend trả về UTC (có Z)
                // Database lưu local time (UTC+7), nhưng backend serialize thành UTC
                // → Cần parse UTC và điều chỉnh về UTC+7
                date = new Date(dateTimeString);
                
                // Lấy UTC components và tạo date mới với UTC+7
                // Vì database lưu local time (UTC+7), cần hiển thị đúng giờ đó
                const utcYear = date.getUTCFullYear();
                const utcMonth = date.getUTCMonth();
                const utcDay = date.getUTCDate();
                const utcHours = date.getUTCHours();
                const utcMinutes = date.getUTCMinutes();
                const utcSeconds = date.getUTCSeconds();
                
                // Tạo date mới với UTC+7 (giờ Việt Nam)
                // Sử dụng Date.UTC và thêm 7 giờ
                date = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHours + 7, utcMinutes, utcSeconds));
            } else if (typeof dateTimeString === 'string' && dateTimeString.includes('+')) {
                // Có timezone offset → parse bình thường, JavaScript sẽ tự động convert
                date = new Date(dateTimeString);
            } else {
                // Không có timezone info → giả định là local time (giờ Việt Nam UTC+7)
                // JavaScript sẽ hiểu là local time của browser
                date = new Date(dateTimeString);
            }
            
            // Kiểm tra nếu date không hợp lệ
            if (isNaN(date.getTime())) {
                console.error("Invalid date:", dateTimeString);
                return "";
            }
            
            // Lấy local time components (sau khi đã điều chỉnh timezone nếu cần)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (err) {
            console.error("Error formatting datetime:", err, dateTimeString);
            return "";
        }
    }

    // ===================== HELPER: Kiểm tra category có liên quan đến thuốc không =====================
    function isMedicineCategory(categoryId) {
        if (!categoryId) return false;
        const category = categories.find((c) => c.id === Number(categoryId));
        if (!category || !category.name) return false;
        
        const categoryName = category.name.toLowerCase().trim();
        const medicineKeywords = ["thuốc", "medicine", "drug", "medication", "dược phẩm", "pharmaceutical"];
        
        return medicineKeywords.some((keyword) => categoryName.includes(keyword));
    }

    // ===================== LOAD PRESCRIPTIONS FOR PATIENT =====================
    async function loadPrescriptionsForPatient(patientId, idx, stopsClone) {
        if (!patientId) return;

        try {
            // Load tất cả prescriptions (không filter status) rồi filter ở frontend
            const allPrescriptions = await getAllPrescriptions({ patientId });
            
            // Lọc ra các đơn không bị canceled
            const validPrescriptions = (allPrescriptions || []).filter(
                (p) => p.status?.toLowerCase() !== "canceled"
            );

            stopsClone[idx].prescriptionList = validPrescriptions;
        } catch (err) {
            console.error("Error load prescriptions:", err);
            stopsClone[idx].prescriptionList = [];
        }
    }

    // ===================== UPDATE STOP FIELD =====================
    async function updateStop(idx, key, value) {
        const clone = [...form.stops];
        clone[idx][key] = value;

        // update status stop
        if (key === "status") {
            clone[idx].status = value;
        }

        // Khi đổi category → reset compartment → load lại danh sách
        if (key === "categoryId") {
            const oldCompartment = clone[idx].compartmentId;
            clone[idx].compartmentId = "";
            clone[idx].prescriptionList = [];
            clone[idx].prescriptionCode = "";
            clone[idx].prescriptionPreview = null;

            let list = await getCompartmentsByRobotAndCategory(
                form.robotId,
                value
            );

            // Nếu compartment cũ không còn → thêm fallback
            if (oldCompartment && !list.some((c) => c.id === oldCompartment)) {
                list = [
                    ...list,
                    {
                        id: oldCompartment,
                        compartmentCode: `#${oldCompartment} (không khả dụng)`,
                    },
                ];
            }

            clone[idx].filteredCompartments = list;

            // Nếu category là thuốc và đã chọn patient → load prescriptions
            if (isMedicineCategory(value) && clone[idx].patientId) {
                await loadPrescriptionsForPatient(clone[idx].patientId, idx, clone);
            }
        }

        setForm((f) => ({ ...f, stops: clone }));
    }

    // ===================== SELECT MAP =====================
    async function handleSelectMap(mapId) {
        setForm((f) => ({ ...f, mapId }));

        if (!mapId) {
            setDestinations([]);
            return;
        }

        const detail = await getMapById(mapId);
        setDestinations(detail.destinations || []);
    }

    // ===================== SELECT ROBOT =====================
    async function handleSelectRobot(robotId) {
        setForm((f) => ({
            ...f,
            robotId,
        }));

        const comps = await getUnlockedCompartments(robotId);
        setBaseCompartments(comps);
    }

    // ===================== SELECT PATIENT =====================
    async function handleSelectPatient(patientId, idx) {
        const stop = form.stops[idx];
        updateStop(idx, "patientId", patientId);

        if (!patientId) {
            updateStop(idx, "prescriptionPreview", null);
            updateStop(idx, "prescriptionList", []);
            updateStop(idx, "prescriptionCode", "");
            return;
        }

        // Chỉ load prescriptions nếu category là thuốc
        if (isMedicineCategory(stop.categoryId)) {
            const clone = [...form.stops];
            await loadPrescriptionsForPatient(patientId, idx, clone);
            setForm((f) => ({ ...f, stops: clone }));
        } else {
            // Không phải thuốc → không load đơn thuốc
            updateStop(idx, "prescriptionPreview", null);
            updateStop(idx, "prescriptionList", []);
            updateStop(idx, "prescriptionCode", "");
        }
    }

    // ===================== CLICK VÀO MÃ ĐƠN THUỐC =====================
    //  - Nếu chưa chọn → TỰ ĐỘNG APPROVE
    //  - Nếu đã chọn → Hiển thị modal xác nhận bỏ chọn
    // =====================
    async function handleSelectPrescription(prescriptionCode, idx) {
        if (!prescriptionCode) {
            updateStop(idx, "prescriptionCode", "");
            updateStop(idx, "prescriptionPreview", null);
            return;
        }

        const stop = form.stops[idx];
        
        // Nếu đơn thuốc này đã được chọn → hiển thị modal xác nhận bỏ chọn
        if (stop.prescriptionCode === prescriptionCode) {
            const prescription = stop.prescriptionList.find(
                (p) => p.prescriptionCode === prescriptionCode
            );
            
            if (prescription) {
                setUnselectPrescriptionModal({
                    show: true,
                    prescriptionCode: prescriptionCode,
                    prescriptionId: prescription.id,
                    originalStatus: prescription.originalStatus || prescription.status,
                    stopIndex: idx,
                    loading: false,
                });
            }
            return;
        }

        // Nếu chưa chọn → approve như bình thường
        try {
            // Gọi API approve prescription
            const approved = await approvePrescriptionByCode(prescriptionCode);
            
            // Cập nhật state
            updateStop(idx, "prescriptionCode", prescriptionCode);
            updateStop(idx, "prescriptionPreview", approved);

            // Hiển thị toast thông báo
            showToast("success", `Đã chọn và xác nhận đơn thuốc: ${prescriptionCode}`);

            // Cập nhật lại danh sách prescriptions (status đã đổi thành approved)
            if (stop.patientId) {
                const clone = [...form.stops];
                await loadPrescriptionsForPatient(stop.patientId, idx, clone);
                setForm((f) => ({ ...f, stops: clone }));
            }
        } catch (err) {
            console.error("Lỗi xác nhận đơn thuốc:", err);
            showToast("error", err.message);
        }
    }

    // ===================== BỎ CHỌN ĐƠN THUỐC - Trả lại status ban đầu =====================
    async function handleUnselectPrescription() {
        const { prescriptionId, originalStatus, stopIndex, prescriptionCode } = unselectPrescriptionModal;

        if (!prescriptionId || !originalStatus) {
            setUnselectPrescriptionModal({ ...unselectPrescriptionModal, show: false });
            return;
        }

        setUnselectPrescriptionModal((prev) => ({ ...prev, loading: true }));

        try {
            // Gọi API update prescription với status ban đầu
            await updatePrescription(prescriptionId, { status: originalStatus });

            // Cập nhật state - bỏ chọn đơn thuốc
            updateStop(stopIndex, "prescriptionCode", "");
            updateStop(stopIndex, "prescriptionPreview", null);

            // Cập nhật lại danh sách prescriptions
            const stop = form.stops[stopIndex];
            if (stop.patientId) {
                const clone = [...form.stops];
                await loadPrescriptionsForPatient(stop.patientId, stopIndex, clone);
                setForm((f) => ({ ...f, stops: clone }));
            }

            showToast("success", `Đã bỏ chọn đơn thuốc: ${prescriptionCode}`);
            setUnselectPrescriptionModal({ show: false, prescriptionCode: "", prescriptionId: null, originalStatus: "", stopIndex: -1, loading: false });
        } catch (err) {
            console.error("Lỗi bỏ chọn đơn thuốc:", err);
            showToast("error", err.message);
            setUnselectPrescriptionModal((prev) => ({ ...prev, loading: false }));
        }
    }

    // ===================== TASK STATUS HELPERS =====================
    const canEditTaskStatus = EDITABLE_TASK_STATUSES.includes(
        initialTaskStatus
    );

    function handleChangeTaskStatus(next) {
        if (!canEditTaskStatus) return;
        setTaskStatus(next);
    }

    // ===================== SUBMIT UPDATE =====================
    async function handleUpdate() {
        // Validate bản đồ
        if (!form.mapId) {
            showToast("warning", "Vui lòng chọn bản đồ.");
            return;
        }

        // Validate robot
        if (!form.robotId) {
            showToast("warning", "Vui lòng chọn robot.");
            return;
        }

        // Validate có điểm dừng
        if (form.stops.length === 0) {
            showToast("warning", "Vui lòng có ít nhất một điểm dừng.");
            return;
        }

        // Validate từng điểm dừng
        for (let i = 0; i < form.stops.length; i++) {
            const stop = form.stops[i];
            const stopNumber = i + 1;

            if (!stop.destinationId) {
                showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn điểm đến.`);
                return;
            }

            if (!stop.patientId) {
                showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn bệnh nhân.`);
                return;
            }

            if (!stop.categoryId) {
                showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn loại ngăn.`);
                return;
            }

            if (!stop.compartmentId) {
                showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn ngăn chứa.`);
                return;
            }

            // Nếu category là thuốc → phải chọn đơn thuốc
            if (isMedicineCategory(stop.categoryId) && !stop.prescriptionCode) {
                showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn đơn thuốc.`);
                return;
            }
        }

        // Tất cả validation đã pass → cập nhật task
        try {
            const payload = {
                robotId: form.robotId ? Number(form.robotId) : 0,
                mapId: form.mapId ? Number(form.mapId) : 0,
                // ❗ BE yêu cầu priority là NUMBER 0/1/2
                priority: typeof form.priority === "number"
                    ? form.priority
                    : Number(form.priority),
                scheduledStartAt: form.scheduledStartAt
                    ? new Date(form.scheduledStartAt).toISOString()
                    : null,
                stops: form.stops.map((s) => ({
                    stopId: s.stopId,
                    seqNo: s.seqNo,
                    destinationId: s.destinationId
                        ? Number(s.destinationId)
                        : 0,
                    patientId: s.patientId ? Number(s.patientId) : 0,
                    compartmentId: s.compartmentId
                        ? Number(s.compartmentId)
                        : 0,
                    categoryId: s.categoryId
                        ? Number(s.categoryId)
                        : 0,
                    prescriptionCode: s.prescriptionCode || null, // Gửi prescriptionCode nếu có
                    customName: s.customName,
                    itemDesc: s.itemDesc,
                    // Chỉ gửi status stop nếu user chọn 1 giá trị rõ ràng
                    ...(s.status ? { status: s.status } : {}),
                })),
            };

            // Nếu user đã đổi trạng thái task → gửi status lên BE
            // Nếu giữ nguyên → KHÔNG gửi field status để BE auto-complete khi tất cả stop delivered
            if (taskStatus && taskStatus !== initialTaskStatus) {
                payload.status = taskStatus;
            }

            await updateTask(id, payload);

            showToast("success", "Cập nhật nhiệm vụ thành công");
            setTimeout(() => navigate(`/task-detail/${id}`), 1500);
        } catch (err) {
            console.error(err);
            showToast("error", err.message);
        }
    }

    // ===================== LOADING UI =====================
    if (loading) {
        return (
            <div className={styles.page}>
                <div className="container-xl py-4">
                    <div
                        className="d-flex justify-content-center align-items-center"
                        style={{ minHeight: "50vh" }}
                    >
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3"></div>
                            <p className="text-muted">Đang tải dữ liệu...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ===========================================================
    //                           UI
    // ===========================================================
    return (
        <div className={styles.page}>
            <Toast toast={toast} showToast={showToast} />
            <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-11 col-xl-10">
                        {/* =================== HEADER =================== */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-pencil-square"></i>
                                </span>
                                <div>
                                    <h4 className={`${styles.pageTitle} mb-1`}>
                                        Chỉnh sửa nhiệm vụ #{id}
                                    </h4>
                                    <div className="text-muted small">
                                        Cập nhật thông tin bản đồ, robot và các
                                        điểm dừng giao thuốc.
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-outline-secondary"
                                    style={{
                                        borderRadius: "5px",
                                        padding: "0.5rem 1.2rem",
                                    }}
                                    onClick={() =>
                                        navigate(`/task-detail/${id}`)
                                    }
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Quay lại
                                </button>
                            </div>
                        </div>

                        {/* =================== FORM =================== */}
                        <div className={`${styles.glass} p-4 p-md-5`}>
                            {/* ========== BLOCK 1: THÔNG TIN NHIỆM VỤ ========= */}
                            <h5 className={styles.sectionTitle}>
                                <i
                                    className="bi bi-clipboard-check me-2"
                                    style={{ color: "var(--teal-dark)" }}
                                ></i>
                                Thông tin nhiệm vụ
                            </h5>

                            {/* MAP + TIME */}
                            <div className="row g-4 mb-3">
                                <div className="col-md-6">
                                    <label
                                        className={`form-label ${styles.formLabel}`}
                                    >
                                        Bản đồ{" "}
                                        <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${styles.formSelect}`}
                                        value={form.mapId}
                                        onChange={(e) =>
                                            handleSelectMap(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            — Chọn bản đồ —
                                        </option>
                                        {maps.map((m) => (
                                            <option value={String(m.id)} key={m.id}>
                                                #{m.id} - {m.mapName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label
                                        className={`form-label ${styles.formLabel}`}
                                    >
                                        Thời gian bắt đầu
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className={`form-control ${styles.formControl}`}
                                        value={form.scheduledStartAt}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                scheduledStartAt:
                                                    e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            {/* ROBOT + PRIORITY */}
                            <div className="row g-4 mb-3">
                                <div className="col-md-8">
                                    <label
                                        className={`form-label ${styles.formLabel}`}
                                    >
                                        Robot{" "}
                                        <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${styles.formSelect}`}
                                        value={form.robotId || ""}
                                        onChange={(e) =>
                                            handleSelectRobot(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            — Chọn robot —
                                        </option>
                                        {Array.isArray(robots) &&
                                            robots.map((r) => (
                                            <option value={String(r.id)} key={r.id}>
                                                #{r.id} - {r.name}
                                                {typeof r.batteryPercent ===
                                                "number"
                                                    ? ` (Pin: ${r.batteryPercent}%)`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Priority (ẩn nhưng vẫn giữ để đồng bộ data) */}
                                <div className="col-md-4" hidden>
                                    <label
                                        className={`form-label ${styles.formLabel}`}
                                    >
                                        Độ ưu tiên
                                    </label>
                                    <select
                                        className={`form-select ${styles.formSelect}`}
                                        value={form.priority}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                priority: Number(
                                                    e.target.value
                                                ),
                                            }))
                                        }
                                    >
                                        <option value={0}>
                                            0 - Bình thường
                                        </option>
                                        <option value={1}>1 - Khẩn cấp</option>
                                        <option value={2}>2 - Nguy cấp</option>
                                    </select>
                                </div>
                            </div>

                            {/* TASK STATUS — đặt sau info, không để đầu form */}
                            <div className="mb-4">
                                <label
                                    className={`form-label ${styles.formLabel}`}
                                >
                                    Trạng thái nhiệm vụ
                                </label>
                                <div className="d-flex flex-wrap gap-2">
                                    {TASK_STATUS_OPTIONS.map((opt) => {
                                        const isActive =
                                            taskStatus === opt.value;
                                        const canClick = canEditTaskStatus;

                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className="btn btn-sm"
                                                onClick={() =>
                                                    canClick &&
                                                    handleChangeTaskStatus(
                                                        opt.value
                                                    )
                                                }
                                                style={{
                                                    borderRadius: "999px",
                                                    border: isActive
                                                        ? "1px solid var(--teal-dark)"
                                                        : "1px solid rgba(148,163,184,0.6)",
                                                    background: isActive
                                                        ? "linear-gradient(135deg, rgba(13,148,136,0.9) 0%, rgba(8,145,178,0.9) 100%)"
                                                        : "rgba(255,255,255,0.9)",
                                                    color: isActive
                                                        ? "#ffffff"
                                                        : "#0f172a",
                                                    padding:
                                                        "0.25rem 0.85rem",
                                                    fontWeight: 600,
                                                    fontSize: "0.8rem",
                                                    opacity: canClick
                                                        ? 1
                                                        : 0.5,
                                                    cursor: canClick
                                                        ? "pointer"
                                                        : "not-allowed",
                                                }}
                                            >
                                                {opt.valueVi}
                                            </button>
                                        );
                                    })}
                                </div>
                                {!canEditTaskStatus && (
                                    <div className="text-muted small mt-1">
                                        Nhiệm vụ đang ở trạng thái không cho
                                        phép chỉnh sửa trạng thái. Bạn vẫn có
                                        thể cập nhật điểm dừng.
                                    </div>
                                )}
                            </div>

                            <hr className={styles.divider} />

                            {/* ========== BLOCK 2: DANH SÁCH ĐIỂM DỪNG ========= */}
                            <h5 className={styles.sectionTitle}>
                                <i
                                    className="bi bi-geo-alt me-2"
                                    style={{ color: "var(--teal-dark)" }}
                                ></i>
                                Danh sách điểm dừng ({form.stops.length})
                            </h5>

                            {form.stops.map((s, idx) => (
                                <div className={styles.stopCard} key={idx}>
                                    {/* HEADER: bên trái là số + tên, bên phải là status stop */}
                                    <div
                                        className={`${styles.stopHeader} d-flex justify-content-between align-items-center`}
                                    >
                                        <div className="d-flex align-items-center gap-2">
                                            <div className={styles.stopNumber}>
                                                {s.seqNo}
                                            </div>
                                            <div className={styles.stopTitle}>
                                                Điểm dừng #{s.seqNo}
                                            </div>
                                        </div>

                                        <div className="d-flex align-items-center gap-2">
                                            <span
                                                className={styles.formLabel}
                                                style={{
                                                    marginBottom: 0,
                                                    fontSize: "0.78rem",
                                                }}
                                            >
                                                Trạng thái
                                            </span>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                style={{
                                                    width: "180px",
                                                    padding: "0.3rem 0.75rem",
                                                    fontSize: "0.8rem",
                                                }}
                                                value={s.status ?? ""}
                                                onChange={(e) =>
                                                    updateStop(
                                                        idx,
                                                        "status",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                {STOP_STATUS_OPTIONS.map(
                                                    (opt) => (
                                                        <option
                                                            key={opt.value}
                                                            value={opt.value}
                                                        >
                                                            {opt.label}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* BODY: thông tin chi tiết */}
                                    <div className="row g-3">
                                        {/* DESTINATION */}
                                        <div className="col-md-6">
                                            <label
                                                className={`form-label ${styles.formLabel}`}
                                            >
                                                Điểm đến{" "}
                                                <span className="text-danger">
                                                    *
                                                </span>
                                            </label>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                value={s.destinationId}
                                                onChange={(e) =>
                                                    updateStop(
                                                        idx,
                                                        "destinationId",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    — Chọn —
                                                </option>
                                                {destinations.map((d) => (
                                                    <option
                                                        key={d.id}
                                                        value={String(d.id)}
                                                    >
                                                        {d.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* PATIENT */}
                                        <div className="col-md-6">
                                            <label
                                                className={`form-label ${styles.formLabel}`}
                                            >
                                                Bệnh nhân{" "}
                                                <span className="text-danger">
                                                    *
                                                </span>
                                            </label>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                value={s.patientId}
                                                onChange={(e) =>
                                                    handleSelectPatient(
                                                        e.target.value,
                                                        idx
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    — Chọn —
                                                </option>
                                                {patients.map((p) => (
                                                    <option
                                                        key={p.id}
                                                        value={String(p.id)}
                                                    >
                                                        {p.fullName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* CATEGORY */}
                                        <div className="col-md-4">
                                            <label
                                                className={`form-label ${styles.formLabel}`}
                                            >
                                                Loại ngăn{" "}
                                                <span className="text-danger">
                                                    *
                                                </span>
                                            </label>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                value={s.categoryId || ""}
                                                onChange={(e) =>
                                                    updateStop(
                                                        idx,
                                                        "categoryId",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    — Chọn —
                                                </option>
                                                {categories.map((c) => {
                                                    const catValue = String(c.id);
                                                    return (
                                                        <option
                                                            key={c.id}
                                                            value={catValue}
                                                        >
                                                            {c.name}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {/* COMPARTMENT */}
                                        <div className="col-md-4">
                                            <label
                                                className={`form-label ${styles.formLabel}`}
                                            >
                                                Ngăn chứa{" "}
                                                <span className="text-danger">
                                                    *
                                                </span>
                                            </label>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                value={s.compartmentId || ""}
                                                onChange={(e) =>
                                                    updateStop(
                                                        idx,
                                                        "compartmentId",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    — Chọn —
                                                </option>
                                                {s.filteredCompartments.map(
                                                    (c) => {
                                                        const compValue = String(c.id);
                                                        return (
                                                            <option
                                                                key={c.id}
                                                                value={compValue}
                                                            >
                                                                {c.compartmentCode}
                                                            </option>
                                                        );
                                                    }
                                                )}
                                            </select>
                                        </div>

                                        {/* CUSTOM NAME */}
                                        <div className="col-md-4">
                                            <label
                                                className={`form-label ${styles.formLabel}`}
                                            >
                                                Ghi chú riêng
                                            </label>
                                            <input
                                                className={`form-control ${styles.formControl}`}
                                                value={s.customName}
                                                onChange={(e) =>
                                                    updateStop(
                                                        idx,
                                                        "customName",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="VD: Giao ngay..."
                                            />
                                        </div>
                                    </div>

                                    {/* PRESCRIPTION BOX */}
                                    {/* Hiển thị danh sách đơn thuốc nếu category là thuốc */}
                                    {isMedicineCategory(s.categoryId) && s.patientId && (
                                        <div className="col-12 mt-3">
                                            <label className={`form-label ${styles.formLabel}`}>
                                                Chọn đơn thuốc <span className="text-danger">*</span>
                                            </label>
                                            {s.prescriptionList && s.prescriptionList.length > 0 ? (
                                                <>
                                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                                        {s.prescriptionList.map((pres) => (
                                                            <button
                                                                key={pres.id}
                                                                type="button"
                                                                className={`btn ${
                                                                    s.prescriptionCode === pres.prescriptionCode
                                                                        ? "btn-success"
                                                                        : "btn-outline-primary"
                                                                }`}
                                                                onClick={() => handleSelectPrescription(pres.prescriptionCode, idx)}
                                                                style={{ borderRadius: "5px" }}
                                                            >
                                                                <i className="bi bi-file-medical me-1"></i>
                                                                {pres.prescriptionCode}
                                                                {pres.status && (
                                                                    <span className={`badge ms-2 ${
                                                                        pres.status === "approved" ? "bg-success" :
                                                                        pres.status === "pending" ? "bg-warning" :
                                                                        pres.status === "dispensed" ? "bg-info" : "bg-secondary"
                                                                    }`}>
                                                                        {getPrescriptionStatusText(pres.status)}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {s.prescriptionCode && s.prescriptionPreview && (
                                                        <div className="alert alert-success mb-0">
                                                            <i className="bi bi-check-circle me-2"></i>
                                                            Đã chọn và xác nhận đơn thuốc: <strong>{s.prescriptionCode}</strong>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="alert alert-warning mb-0">
                                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                                    Bệnh nhân này chưa có đơn thuốc nào (hoặc tất cả đơn đã bị hủy).
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Hiển thị chi tiết đơn thuốc đã chọn (nếu có) - hidden */}
                                    {s.prescriptionPreview && s.prescriptionCode && (
                                        <div className="col-12 mt-3" hidden>
                                            <div className={styles.rxBox}>
                                                <h6 className={styles.rxTitle}>
                                                    <i className="bi bi-file-medical"></i>
                                                    Đơn thuốc: {s.prescriptionPreview.prescriptionCode}
                                                </h6>

                                                {s.prescriptionPreview.items && s.prescriptionPreview.items.map(
                                                    (item) => (
                                                    <div
                                                        key={item.id}
                                                        className={
                                                            styles.rxItem
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.rxMedicineName
                                                            }
                                                        >
                                                            {item.medicineName}
                                                        </div>
                                                        <div
                                                            className={
                                                                styles.rxInfo
                                                            }
                                                        >
                                                            <strong>
                                                                Số lượng:
                                                            </strong>{" "}
                                                            {item.quantity}
                                                        </div>
                                                        <div
                                                            className={
                                                                styles.rxInfo
                                                            }
                                                        >
                                                            <strong>
                                                                Liều dùng:
                                                            </strong>{" "}
                                                            {item.dosage}
                                                        </div>
                                                        <div
                                                            className={
                                                                styles.rxInfo
                                                            }
                                                        >
                                                            <strong>
                                                                Hướng dẫn:
                                                            </strong>{" "}
                                                            {item.instructions}
                                                        </div>
                                                    </div>
                                                )
                                            )}

                                                {/* ITEM DESC */}
                                                <div className="mt-3">
                                                    <label
                                                        className={`form-label ${styles.formLabel}`}
                                                    >
                                                        Mô tả vật phẩm
                                                        (tùy chọn)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className={`form-control ${styles.formControl}`}
                                                        placeholder="VD: 2 túi dịch truyền + 1 ống tiêm..."
                                                        value={s.itemDesc}
                                                        onChange={(e) =>
                                                            updateStop(
                                                                idx,
                                                                "itemDesc",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mô tả vật phẩm cho trường hợp không phải thuốc */}
                                    {!isMedicineCategory(s.categoryId) && (
                                        <div className="col-12 mt-3">
                                            <label className={`form-label ${styles.formLabel}`}>
                                                Mô tả vật phẩm (tùy chọn)
                                            </label>
                                            <input
                                                type="text"
                                                className={`form-control ${styles.formControl}`}
                                                placeholder="VD: 2 túi dịch truyền + 1 ống tiêm..."
                                                value={s.itemDesc}
                                                onChange={(e) =>
                                                    updateStop(
                                                        idx,
                                                        "itemDesc",
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* SAVE BUTTON */}
                            <button
                                className={`${styles.btnTeal} w-100 mt-4`}
                                onClick={handleUpdate}
                            >
                                <i className="bi bi-check-circle me-2"></i>
                                Cập nhật nhiệm vụ
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL XÁC NHẬN BỎ CHỌN ĐƠN THUỐC */}
            {unselectPrescriptionModal.show && (
                <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                                    Xác nhận bỏ chọn đơn thuốc
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setUnselectPrescriptionModal({ ...unselectPrescriptionModal, show: false })}
                                    disabled={unselectPrescriptionModal.loading}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    Bạn có chắc chắn muốn bỏ chọn đơn thuốc <strong>{unselectPrescriptionModal.prescriptionCode}</strong>?
                                </p>
                                <p className="text-muted mb-0">
                                    Đơn thuốc sẽ được trả về trạng thái ban đầu: <strong>{getPrescriptionStatusText(unselectPrescriptionModal.originalStatus)}</strong>
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setUnselectPrescriptionModal({ ...unselectPrescriptionModal, show: false })}
                                    disabled={unselectPrescriptionModal.loading}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleUnselectPrescription}
                                    disabled={unselectPrescriptionModal.loading}
                                >
                                    {unselectPrescriptionModal.loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-x-circle me-2"></i>
                                            Xác nhận bỏ chọn
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}
