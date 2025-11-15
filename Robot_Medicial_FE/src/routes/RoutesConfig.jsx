import Home from "@/pages/Home";
import Login from "@/pages/Login";
import MainLayout from "@/layouts/MainLayout";

import RobotDashBoard from "@/pages/RobotDashBoard";
import AddTask from "@/pages/AddTask";
import TaskDetail from "@/pages/TaskDetail";
import EditTask from "../pages/EditTask";

import DoctorProfileProvisionForm from "@/pages/DoctorProfileProvisionForm";
import DoctorManagementPage from "@/pages/DoctorManagementPage";
import RobotDetailMisson from "@/pages/RobotDetailMisson";

import UserProfile from "@/pages/UserDetail";

import ChangePasswordPage from "@/pages/ChangePasswordPage";
import RobotMissionHistory from "@/pages/MissionHistory";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import PatientsManagement from "@/pages/PatientManagement";

import PatientDetail from "@/pages/PatientsDetail";
import CreatePatient from "@/pages/CreatePatient";
import RoomFleetCards from "@/pages/RoomManagement";

import MedicineListPage from "@/pages/MedicineMangement";
import MedicineCreate from "@/pages/MedicineCreate";
import MedicineDetail from "@/pages/MedicineDetail";
import MedicineEdit from "@/pages/MedicineEdit";
import MedicineCategoryList from "@/pages/MedicineCategoryList";

import PrescriptionManagement from "@/pages/PrescriptionsManagement";
import PrescriptionCreate from "@/pages/PrescriptionCreate";
import PrescriptionEdit from "@/pages/PrescriptionEdit";
import PrescriptionDetail from "@/pages/PrescriptionDetail";

import RobotManagement from "@/pages/RobotManagement";
import CreateRobot from "@/pages/CreateRobot";  
import RobotDetail from "@/pages/RobotDetail";

import ProjectMapListView from "@/pages/ViewListMap";
import RunMap from "@/pages/RunMap";
import CreateMap from "@/pages/CreateMap";

const routes = [
  { path: "/login", element: <Login /> },
  { path: "/", element: <Home /> },

  { path: "/team", element: <MainLayout><RobotManagement /></MainLayout> },
  { path: "/dashboard", element: <MainLayout><RobotDashBoard /></MainLayout> },
  { path: "/task-detail/:id", element: <MainLayout><TaskDetail /></MainLayout> },
  { path: "/task-edit/:id", element: <MainLayout><EditTask /></MainLayout> },
  { path: "/doctor", element: <MainLayout><DoctorManagementPage /></MainLayout> },
  { path: "/robot-tasks", element: <MainLayout><RobotDetailMisson /></MainLayout> },
  { path: "/addtasks", element: <MainLayout><AddTask /></MainLayout> },
  { path: "/robot-detail/:id", element: <MainLayout><RobotDetail /></MainLayout> },
  { path: "/user-detail", element: <MainLayout><UserProfile /></MainLayout> },
  { path: "/doctor-profile/:userId", element: <MainLayout><DoctorProfileProvisionForm /></MainLayout> },
  { path: "/reset-password", element: <ChangePasswordPage /> },
  { path: "/change-password", element: <MainLayout><ChangePasswordPage /></MainLayout> },
  { path: "/history-mission", element: <MainLayout><RobotMissionHistory /></MainLayout> },
  { path: "/forgot-password", element: <MainLayout><ForgotPasswordPage /></MainLayout> },

  // 🧭 Map Manager
  { path: "/viewlistmap", element: <MainLayout><ProjectMapListView /></MainLayout> },

  // 🗺️ Trang tạo bản đồ mới (Live Mapping)
  { path: "/create-map", element: <MainLayout><CreateMap /></MainLayout> },
  { path: "/run-map", element: <MainLayout><RunMap /></MainLayout> },

  // 👩‍⚕️ Patients & Medicines
  { path: "/patients", element: <MainLayout><PatientsManagement /></MainLayout> },
  { path: "/patient/:id", element: <MainLayout><PatientDetail /></MainLayout> },
  { path: "/patients/add", element: <MainLayout><CreatePatient /></MainLayout> },
  { path: "/rooms/all", element: <MainLayout><RoomFleetCards /></MainLayout> },

  { path: "/medicines", element: <MainLayout><MedicineListPage /></MainLayout> },
  { path: "/medicines/add", element: <MainLayout><MedicineCreate /></MainLayout> },
  { path: "/medicines/:id", element: <MainLayout><MedicineDetail /></MainLayout> },
  { path: "/medicines/edit/:id", element: <MainLayout><MedicineEdit /></MainLayout> },
  { path: "/categories", element: <MainLayout><MedicineCategoryList /></MainLayout> },

  { path: "/prescriptions", element: <MainLayout><PrescriptionManagement /></MainLayout> },
  { path: "/prescriptions/add", element: <MainLayout><PrescriptionCreate /></MainLayout> },
  { path: "/prescriptions/:id/edit", element: <MainLayout><PrescriptionEdit /></MainLayout> },
  { path: "/prescriptions/:id", element: <MainLayout><PrescriptionDetail /></MainLayout> },

  { path: "/createRobot", element: <MainLayout><CreateRobot /></MainLayout> },
];

export default routes;
