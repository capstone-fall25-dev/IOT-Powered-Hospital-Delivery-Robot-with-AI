// ============================================
// IMPORTS - CORE & LAYOUT
// ============================================
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import MainLayout from "@/layouts/MainLayout";

// ============================================
// IMPORTS - AUTHENTICATION & USER
// ============================================
import UserProfile from "@/pages/UserDetail";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";

// ============================================
// IMPORTS - QUẢN LÝ BÁC SĨ (DOCTOR MANAGEMENT)
// ============================================
import DoctorProfileProvisionForm from "@/pages/DoctorProfileProvisionForm";
import DoctorManagementPage from "@/pages/DoctorManagementPage";

// ============================================
// IMPORTS - QUẢN LÝ BỆNH NHÂN (PATIENT MANAGEMENT)
// ============================================
import PatientsManagement from "@/pages/PatientManagement";
import PatientDetail from "@/pages/PatientsDetail";
import CreatePatient from "@/pages/CreatePatient";
import PatientEdit from "@/pages/PatientEdit";

// ============================================
// IMPORTS - QUẢN LÝ PHÒNG (ROOM MANAGEMENT)
// ============================================
import RoomFleetCards from "@/pages/RoomManagement";
import RoomCreate from "@/pages/RoomCreate";
import RoomDetail from "@/pages/RoomDetail";
import RoomEdit from "@/pages/RoomEdit";

// ============================================
// IMPORTS - QUẢN LÝ THUỐC (MEDICINE MANAGEMENT)
// ============================================
import MedicineListPage from "@/pages/MedicineMangement";
import MedicineCreate from "@/pages/MedicineCreate";
import MedicineDetail from "@/pages/MedicineDetail";
import MedicineEdit from "@/pages/MedicineEdit";
import MedicineCategoryList from "@/pages/MedicineCategoryList";

// ============================================
// IMPORTS - QUẢN LÝ ĐƠN THUỐC (PRESCRIPTION MANAGEMENT)
// ============================================
import PrescriptionManagement from "@/pages/PrescriptionsManagement";
import PrescriptionCreate from "@/pages/PrescriptionCreate";
import PrescriptionEdit from "@/pages/PrescriptionEdit";
import PrescriptionDetail from "@/pages/PrescriptionDetail";

// ============================================
// IMPORTS - QUẢN LÝ ROBOT (ROBOT MANAGEMENT)
// ============================================
import RobotManagement from "@/pages/RobotManagement";
import CreateRobot from "@/pages/CreateRobot";
import RobotDetail from "@/pages/RobotDetail";
import RobotMissionHistory from "@/pages/MissionHistory";
import RobotDetailMisson from "@/pages/RobotDetailMisson";

// ============================================
// IMPORTS - QUẢN LÝ NHIỆM VỤ (TASK MANAGEMENT)
// ============================================
import RobotDashBoard from "@/pages/RobotDashBoard";
import AddTask from "@/pages/AddTask";
import TaskDetail from "@/pages/TaskDetail";
import EditTask from "../pages/EditTask";

// ============================================
// IMPORTS - QUẢN LÝ BẢN ĐỒ (MAP MANAGEMENT)
// ============================================
import ProjectMapListView from "@/pages/ViewListMap";
import RunMap from "@/pages/RunMap";
import CreateMap from "@/pages/CreateMap";

// ============================================
// ROUTES CONFIGURATION
// ============================================
const routes = [
  // ============================================
  // 🔐 AUTHENTICATION ROUTES
  // ============================================
  { path: "/login", element: <Login /> },
  { path: "/reset-password", element: <ChangePasswordPage /> },
  { path: "/forgot-password", element: <MainLayout><ForgotPasswordPage /></MainLayout> },
  { path: "/change-password", element: <MainLayout><ChangePasswordPage /></MainLayout> },

  // ============================================
  // 🏠 HOME & DASHBOARD
  // ============================================
  { path: "/", element: <Home /> },

  // ============================================
  // 👤 USER PROFILE
  // ============================================
  { path: "/user-detail", element: <MainLayout><UserProfile /></MainLayout> },

  // ============================================
  // 👨‍⚕️ DOCTOR MANAGEMENT
  // ============================================
  { path: "/doctor", element: <MainLayout><DoctorManagementPage /></MainLayout> },
  { path: "/doctor-profile/:userId", element: <MainLayout><DoctorProfileProvisionForm /></MainLayout> },

  // ============================================
  // 👥 PATIENT MANAGEMENT
  // ============================================
  { path: "/patients", element: <MainLayout><PatientsManagement /></MainLayout> },
  { path: "/patient/:id", element: <MainLayout><PatientDetail /></MainLayout> },
  { path: "/patients/add", element: <MainLayout><CreatePatient /></MainLayout> },
  { path: "/patients/edit/:id", element: <MainLayout><PatientEdit /></MainLayout> },

  // ============================================
  // 🏥 ROOM MANAGEMENT
  // ============================================
  { path: "/rooms", element: <MainLayout><RoomFleetCards /></MainLayout> },
  { path: "/rooms/create", element: <MainLayout><RoomCreate /></MainLayout> },
  { path: "/rooms/:id", element: <MainLayout><RoomDetail /></MainLayout> },
  { path: "/rooms/:id/edit", element: <MainLayout><RoomEdit /></MainLayout> },

  // ============================================
  // 💊 MEDICINE MANAGEMENT
  // ============================================
  { path: "/medicines", element: <MainLayout><MedicineListPage /></MainLayout> },
  { path: "/medicines/add", element: <MainLayout><MedicineCreate /></MainLayout> },
  { path: "/medicines/:id", element: <MainLayout><MedicineDetail /></MainLayout> },
  { path: "/medicines/edit/:id", element: <MainLayout><MedicineEdit /></MainLayout> },
  { path: "/categories", element: <MainLayout><MedicineCategoryList /></MainLayout> },

  // ============================================
  // 📋 PRESCRIPTION MANAGEMENT
  // ============================================
  { path: "/prescriptions", element: <MainLayout><PrescriptionManagement /></MainLayout> },
  { path: "/prescriptions/add", element: <MainLayout><PrescriptionCreate /></MainLayout> },
  { path: "/prescriptions/:id", element: <MainLayout><PrescriptionDetail /></MainLayout> },
  { path: "/prescriptions/:id/edit", element: <MainLayout><PrescriptionEdit /></MainLayout> },

  // ============================================
  // 🤖 ROBOT MANAGEMENT
  // ============================================
  { path: "/team", element: <MainLayout><RobotManagement /></MainLayout> },
  { path: "/createRobot", element: <MainLayout><CreateRobot /></MainLayout> },
  { path: "/robot-detail/:id", element: <MainLayout><RobotDetail /></MainLayout> },
  { path: "/history-mission", element: <MainLayout><RobotMissionHistory /></MainLayout> },
  { path: "/robot-tasks", element: <MainLayout><RobotDetailMisson /></MainLayout> },

  // ============================================
  // ✅ TASK MANAGEMENT
  // ============================================
  { path: "/dashboard", element: <MainLayout><RobotDashBoard /></MainLayout> },
  { path: "/addtasks", element: <MainLayout><AddTask /></MainLayout> },
  { path: "/task-detail/:id", element: <MainLayout><TaskDetail /></MainLayout> },
  { path: "/task-edit/:id", element: <MainLayout><EditTask /></MainLayout> },

  // ============================================
  // 🗺️ MAP MANAGEMENT
  // ============================================
  { path: "/viewlistmap", element: <MainLayout><ProjectMapListView /></MainLayout> },
  { path: "/create-map", element: <MainLayout><CreateMap /></MainLayout> },
  { path: "/run-map", element: <MainLayout><RunMap /></MainLayout> },
];

export default routes;