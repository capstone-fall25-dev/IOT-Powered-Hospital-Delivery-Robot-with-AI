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
    { value: "canceled", valueVi: "Hủy bỏ" },
];

// Các trạng thái nhiệm vụ cho phép EDIT (đồng bộ với AllowedStatusForEdit bên BE)
const EDITABLE_TASK_STATUSES = [
    "pending",
    "canceled", // Cho phép edit task đã cancel để có thể restore
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
                        let compDetail = null; // Khai báo ở scope cao hơn để có thể sử dụng sau
                        let foundComp = null;  // Khai báo ở scope cao hơn để có thể sử dụng sau
                        
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
                                // Thử load compartment detail trực tiếp theo ID để lấy categoryId và compartmentCode
                                compDetail = await getCompartmentById(s.compartmentId);
                                
                                if (compDetail && compDetail.categoryId) {
                                    // Tìm thấy compartment và có categoryId → load compartments theo category
                                    resolvedCategoryId = compDetail.categoryId;
                                    filtered = await getCompartmentsByRobotAndCategory(
                                        data.robotId,
                                        resolvedCategoryId
                                    );
                                }
                            } catch (err) {
                                // Compartment có thể không tồn tại (404) hoặc đã bị xóa/release
                                // Không cần log error vì đây là trường hợp có thể xảy ra khi restore task canceled
                                // Tiếp tục thử tìm trong unlocked compartments
                            }
                            
                            // Nếu vẫn chưa có categoryId, thử tìm trong unlocked compartments
                            if (!resolvedCategoryId) {
                                try {
                                    const allCompartments = await getUnlockedCompartments(data.robotId);
                                    foundComp = allCompartments.find((c) => Number(c.id) === Number(s.compartmentId));
                                    
                                    if (foundComp && foundComp.categoryId) {
                                        resolvedCategoryId = foundComp.categoryId;
                                        filtered = await getCompartmentsByRobotAndCategory(
                                            data.robotId,
                                            resolvedCategoryId
                                        );
                                    }
                                } catch (err2) {
                                    // Không cần log error, chỉ cần tiếp tục với fallback
                                }
                            }
                            
                        }

                        // Nếu compartmentId BE trả về không có trong filtered → thêm fallback với compartmentCode đúng
                        // So sánh với cả number và string để tránh type mismatch
                        const hasCompartment = s.compartmentId && s.compartmentId > 0 && filtered.some((c) => {
                            const compId = Number(c.id);
                            const stopCompId = Number(s.compartmentId);
                            return compId === stopCompId;
                        });
                        
                        if (s.compartmentId && s.compartmentId > 0 && !hasCompartment) {
                            // Ưu tiên lấy compartmentCode từ BE response (đã có sẵn và đáng tin cậy nhất)
                            let compartmentCode = s.compartmentCode || null;
                            
                            // Nếu BE không trả về compartmentCode, thử từ foundComp (nếu đã load - nhanh hơn)
                            if (!compartmentCode && foundComp && foundComp.compartmentCode) {
                                compartmentCode = foundComp.compartmentCode;
                            }
                            // Thử từ compDetail (nếu đã load)
                            else if (!compartmentCode && compDetail && compDetail.compartmentCode) {
                                compartmentCode = compDetail.compartmentCode;
                            }
                            // Chỉ thử load lại compartment detail nếu thực sự cần và chưa load trước đó
                            else if (!compartmentCode && !compDetail) {
                                try {
                                    const compDetailRetry = await getCompartmentById(s.compartmentId);
                                    if (compDetailRetry && compDetailRetry.compartmentCode) {
                                        compartmentCode = compDetailRetry.compartmentCode;
                                        compDetail = compDetailRetry; // Lưu lại để dùng sau
                                    }
                                } catch (err) {
                                    // Compartment không tồn tại (404) - có thể đã bị xóa hoặc không tồn tại
                                }
                            }
                            
                            // Thêm vào filtered với compartmentCode đúng (hoặc fallback nếu không tìm thấy)
                            filtered = [
                                ...filtered,
                                {
                                    id: s.compartmentId,
                                    compartmentCode: compartmentCode || `#${s.compartmentId} (không khả dụng)`,
                                },
                            ];
                        }

                        // Kiểm tra category có phải thuốc không để set confirmedCustomName
                        const finalCategoryId = resolvedCategoryId || (s.categoryId && s.categoryId > 0 ? s.categoryId : null);
                        const category = finalCategoryId && finalCategoryId > 0 
                            ? categories.find((c) => Number(c.id) === Number(finalCategoryId))
                            : null;
                        const isMedicine = category && category.name && 
                            ["thuốc", "medicine", "drug", "medication", "dược phẩm", "pharmaceutical"]
                                .some((keyword) => category.name.toLowerCase().includes(keyword));
                        
                        // Nếu có customName và category là thuốc → tự động confirm
                        const confirmedCustomName = isMedicine && s.customName && s.customName.trim() !== "";

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
                            confirmedCustomName: confirmedCustomName, // Đã tick xác nhận customName chưa
                            status: s.status, // giữ status hiện tại của stop
                            filteredCompartments: filtered,
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
                // Đảm bảo status không null/undefined, nếu không có thì mặc định là "pending"
                const taskStatusValue = (data.status || data.Status || "").trim().toLowerCase() || "pending";
                setTaskStatus(taskStatusValue);
                setInitialTaskStatus(taskStatusValue);

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

    // ===================== HELPER: Lấy min datetime (hiện tại) =====================
    function getMinDateTime() {
        const now = new Date();
        // Format: YYYY-MM-DDTHH:MM (không có giây)
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

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

    // ===================== CONFIRM CUSTOM NAME (Tick button) =====================
    function handleConfirmCustomName(idx) {
        const stop = form.stops[idx];
        if (!stop.customName || stop.customName.trim() === "") {
            showToast("warning", "Vui lòng nhập mã đơn thuốc trước khi xác nhận.");
            return;
        }
        
        updateStop(idx, "confirmedCustomName", true);
        showToast("success", "Đã xác nhận mã đơn thuốc.");
    }

    // ===================== UNCONFIRM CUSTOM NAME (Uncheck) =====================
    function handleUnconfirmCustomName(idx) {
        updateStop(idx, "confirmedCustomName", false);
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
            
            // Reset customName và confirmedCustomName khi đổi category (nếu không phải thuốc)
            if (!isMedicineCategory(value)) {
                clone[idx].customName = "";
                clone[idx].confirmedCustomName = false;
            }

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
        updateStop(idx, "patientId", patientId);
    }

    // ===================== ADD STOP =====================
    function addStop() {
        const nextSeq = form.stops.length > 0 
            ? Math.max(...form.stops.map(s => s.seqNo)) + 1 
            : 1;

        const newStop = {
            stopId: 0, // 0 = stop mới, backend sẽ tạo mới
            seqNo: nextSeq,
            destinationId: "",
            patientId: "",
            categoryId: "",
            compartmentId: "",
            customName: "",
            itemDesc: "",
            confirmedCustomName: false,
            status: "pending",
            filteredCompartments: [],
        };

        setForm((f) => ({
            ...f,
            stops: [...f.stops, newStop],
        }));
    }

    // ===================== REMOVE STOP =====================
    function removeStop(idx) {
        const stop = form.stops[idx];
        
        // Nếu là stop mới (stopId = 0) → xóa luôn
        // Nếu là stop đã có trong DB → cần xác nhận hoặc đánh dấu để xóa
        if (stop.stopId === 0 || !stop.stopId) {
            setForm((f) => ({
                ...f,
                stops: f.stops.filter((_, i) => i !== idx).map((s, i) => ({
                    ...s,
                    seqNo: i + 1, // Cập nhật lại seqNo
                })),
            }));
        } else {
            // Stop đã có trong DB → đánh dấu để xóa (backend sẽ xử lý)
            // Hoặc có thể hiển thị confirm dialog
            if (window.confirm(`Bạn có chắc muốn xóa điểm dừng #${stop.seqNo}?`)) {
                setForm((f) => ({
                    ...f,
                    stops: f.stops.filter((_, i) => i !== idx).map((s, i) => ({
                        ...s,
                        seqNo: i + 1, // Cập nhật lại seqNo
                    })),
                }));
            }
        }
    }


    // ===================== TASK STATUS HELPERS =====================
    // Chỉ cho phép sửa status khi task là "pending" (không cho phép khi "canceled")
    const canEditTaskStatus = initialTaskStatus === "pending";

    function handleChangeTaskStatus(next) {
        if (!canEditTaskStatus) return;
        setTaskStatus(next);
    }

    // ===================== SUBMIT UPDATE =====================
    async function handleUpdate() {
        // Validate task có thể edit
        if (!EDITABLE_TASK_STATUSES.includes(initialTaskStatus)) {
            showToast("error", "Nhiệm vụ không thể chỉnh sửa ở trạng thái hiện tại. Chỉ có thể chỉnh sửa khi trạng thái là 'pending' hoặc 'canceled'.");
            return;
        }

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

        // Validate scheduledStartAt không được là quá khứ
        if (form.scheduledStartAt) {
            try {
                const now = new Date();
                const selected = new Date(form.scheduledStartAt);
                
                if (selected <= now) {
                    showToast("warning", "Thời gian bắt đầu không được là quá khứ. Vui lòng chọn thời gian trong tương lai.");
                    return;
                }
                
                // Nếu task đang canceled (để restore), cần thêm buffer ít nhất 2 phút
                const isCanceledTask = initialTaskStatus === "canceled";
                if (isCanceledTask) {
                    const minRequiredTime = new Date(now.getTime() + 2 * 60 * 1000);
                    if (selected <= minRequiredTime) {
                        showToast("warning", "Thời gian bắt đầu phải lớn hơn thời gian hiện tại ít nhất 2 phút để restore nhiệm vụ.");
                        return;
                    }
                }
            } catch (err) {
                showToast("error", "Thời gian bắt đầu không hợp lệ.");
                return;
            }
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

            // Nếu category là thuốc → phải nhập customName và xác nhận (tick)
            if (isMedicineCategory(stop.categoryId)) {
                if (!stop.customName || stop.customName.trim() === "") {
                    showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng nhập mã đơn thuốc.`);
                    return;
                }
                if (!stop.confirmedCustomName) {
                    showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng xác nhận mã đơn thuốc (tick).`);
                    return;
                }
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
                stops: form.stops.map((s) => {
                    const stopPayload = {
                        stopId: s.stopId || 0, // 0 = stop mới, backend sẽ tạo mới
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
                        customName: s.customName ?? "",
                        itemDesc: s.itemDesc ?? "",
                        // Chỉ gửi status stop nếu task là "pending" và user chọn 1 giá trị rõ ràng
                        ...(initialTaskStatus === "pending" && s.status ? { status: s.status } : {}),
                    };
                    
                    // Nếu category là thuốc và có customName (mã đơn thuốc) → gửi prescriptionCode
                    if (isMedicineCategory(s.categoryId) && s.customName && s.customName.trim() !== "") {
                        stopPayload.prescriptionCode = s.customName.trim();
                    }
                    
                    return stopPayload;
                }),
            };

            // Nếu user đã đổi trạng thái task → gửi status lên BE
            // Chỉ gửi status khi task là "pending" (không gửi khi "canceled")
            // Nếu giữ nguyên → KHÔNG gửi field status để BE auto-complete khi tất cả stop delivered
            if (initialTaskStatus === "pending" && taskStatus && taskStatus !== initialTaskStatus) {
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

    // ===================== CHECK IF TASK CAN BE EDITED =====================
    const canEditTask = EDITABLE_TASK_STATUSES.includes(initialTaskStatus);

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

    // ===================== NOT EDITABLE UI =====================
    if (!canEditTask) {
        return (
            <div className={styles.page}>
                <div className="container-xl py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-11 col-xl-10">
                            <div className={`${styles.glass} p-5 text-center`}>
                                <div className="mb-4">
                                    <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: "4rem" }}></i>
                                </div>
                                <h4 className="mb-3">Không thể chỉnh sửa nhiệm vụ</h4>
                                <p className="text-muted mb-4">
                                    Nhiệm vụ đang ở trạng thái <strong>"{initialTaskStatus}"</strong>.
                                    <br />
                                    Chỉ có thể chỉnh sửa nhiệm vụ khi trạng thái là <strong>"pending"</strong> hoặc <strong>"canceled"</strong>.
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate(`/task-detail/${id}`)}
                                >
                                    <i className="bi bi-arrow-left me-2"></i>
                                    Quay lại chi tiết nhiệm vụ
                                </button>
                            </div>
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
                            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                <h5 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                                    <i
                                        className="bi bi-clipboard-check me-2"
                                        style={{ color: "var(--teal-dark)" }}
                                    ></i>
                                    Thông tin nhiệm vụ
                                </h5>
                                {initialTaskStatus === "canceled" && (
                                    <div className="alert alert-info mb-0 py-2 px-3" style={{ fontSize: "0.85rem", maxWidth: "600px" }}>
                                        <i className="bi bi-info-circle me-2"></i>
                                        <strong>Nhiệm vụ đã bị hủy.</strong> Để restore, cập nhật "Thời gian bắt đầu" thành thời điểm trong tương lai.
                                        Nhiệm vụ sẽ tự động chuyển về trạng thái "chờ xử lý" khi đủ điều kiện (robot ở trạm, ngăn chứa trống).
                                    </div>
                                )}
                            </div>

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
                                        min={getMinDateTime()}
                                        onChange={(e) => {
                                            const selectedValue = e.target.value;
                                            const selected = new Date(selectedValue);
                                            const now = new Date();
                                            
                                            // Kiểm tra nếu chọn thời gian quá khứ
                                            if (selected <= now) {
                                                showToast("warning", "Thời gian bắt đầu không được là quá khứ. Vui lòng chọn thời gian trong tương lai.");
                                                return;
                                            }
                                            
                                            setForm((f) => ({
                                                ...f,
                                                scheduledStartAt: selectedValue,
                                            }));
                                        }}
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

                            {/* TASK STATUS — chỉ hiển thị khi task là "pending" */}
                            {initialTaskStatus === "pending" && (
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

                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    className="btn btn-sm"
                                                    onClick={() =>
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
                                                    }}
                                                >
                                                    {opt.valueVi}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <hr className={styles.divider} />

                            {/* ========== BLOCK 2: DANH SÁCH ĐIỂM DỪNG ========= */}
                            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                <h5 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                                    <i
                                        className="bi bi-geo-alt me-2"
                                        style={{ color: "var(--teal-dark)" }}
                                    ></i>
                                    Danh sách điểm dừng ({form.stops.length})
                                </h5>
                                <button
                                    className={styles.btnAddStop}
                                    onClick={addStop}
                                    disabled={!form.robotId}
                                    style={{ borderRadius: "5px" }}
                                >
                                    <i className="bi bi-plus-circle me-1"></i>
                                    Thêm điểm dừng
                                </button>
                            </div>

                            {form.stops.map((s, idx) => (
                                <div className={styles.stopCard} key={idx} style={{ position: "relative" }}>
                                    {/* Nút xóa điểm dừng */}
                                    <button
                                        className={styles.btnRemove}
                                        onClick={() => removeStop(idx)}
                                        title="Xóa điểm dừng"
                                        style={{
                                            position: "absolute",
                                            top: "10px",
                                            right: "10px",
                                            zIndex: 10,
                                            borderRadius: "50%",
                                            width: "30px",
                                            height: "30px",
                                            padding: 0,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        ×
                                    </button>

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

                                        {/* Chỉ hiển thị status của stop khi task là "pending" */}
                                        {initialTaskStatus === "pending" && (
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
                                        )}
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
                                        <div className="col-md-6">
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
                                        <div className="col-md-6">
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

                                    </div>

                                    {/* Mô tả vật phẩm và Mã đơn thuốc */}
                                    <div className="row g-3 mt-3">
                                        {/* Mô tả vật phẩm - luôn hiển thị */}
                                        <div className={isMedicineCategory(s.categoryId) ? "col-md-6" : "col-md-12"}>
                                            <label className={`form-label ${styles.formLabel}`}>
                                                Mô tả vật phẩm (tùy chọn)
                                            </label>
                                            <input
                                                type="text"
                                                className={`form-control ${styles.formControl}`}
                                                placeholder="VD: 2 túi dịch truyền + 1 ống tiêm..."
                                                value={s.itemDesc}
                                                onChange={(e) =>
                                                    updateStop(idx, "itemDesc", e.target.value)
                                                }
                                            />
                                        </div>

                                        {/* Mã đơn thuốc - chỉ hiển thị khi category là thuốc */}
                                        {isMedicineCategory(s.categoryId) && (
                                            <div className="col-md-6">
                                                <label className={`form-label ${styles.formLabel}`}>
                                                    Mã đơn thuốc <span className="text-danger">*</span>
                                                </label>
                                                <div className="d-flex gap-2 align-items-start">
                                                    <input
                                                        type="text"
                                                        className={`form-control ${styles.formControl}`}
                                                        placeholder="Nhập mã đơn thuốc..."
                                                        value={s.customName}
                                                        onChange={(e) => {
                                                            updateStop(idx, "customName", e.target.value);
                                                            // Tự động bỏ tick khi user sửa text
                                                            if (s.confirmedCustomName) {
                                                                updateStop(idx, "confirmedCustomName", false);
                                                            }
                                                        }}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={`btn ${
                                                            s.confirmedCustomName
                                                                ? "btn-success"
                                                                : "btn-outline-secondary"
                                                        }`}
                                                        onClick={() => {
                                                            if (s.confirmedCustomName) {
                                                                handleUnconfirmCustomName(idx);
                                                            } else {
                                                                handleConfirmCustomName(idx);
                                                            }
                                                        }}
                                                        disabled={!s.customName || s.customName.trim() === ""}
                                                        style={{
                                                            minWidth: "50px",
                                                            height: "46px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                        }}
                                                        title={
                                                            s.confirmedCustomName
                                                                ? "Bỏ xác nhận"
                                                                : "Xác nhận mã đơn thuốc"
                                                        }
                                                    >
                                                        {s.confirmedCustomName ? (
                                                            <i className="bi bi-check-circle-fill"></i>
                                                        ) : (
                                                            <i className="bi bi-check-circle"></i>
                                                        )}
                                                    </button>
                                                </div>
                                                {s.confirmedCustomName && (
                                                    <div className="alert alert-success mt-2 mb-0">
                                                        <i className="bi bi-check-circle me-2"></i>
                                                        Đã xác nhận mã đơn thuốc
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
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

        </div>
        </div>
    );
}
