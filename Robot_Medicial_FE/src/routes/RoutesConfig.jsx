// src/routes/RoutesConfig.jsx

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import MainLayout from "@/layouts/MainLayout";

import UserProfile from "@/pages/UserProfile";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";

import UserDetail from "@/pages/UserDetail";
import UserManagementPage from "@/pages/UserManagementPage";
import UserCreate from "@/pages/UserCreate";
import UserEdit from "@/pages/UserEdit";

import PatientsManagement from "@/pages/PatientManagement";
import PatientDetail from "@/pages/PatientsDetail";
import CreatePatient from "@/pages/CreatePatient";
import PatientEdit from "@/pages/PatientEdit";

import RoomFleetCards from "@/pages/RoomManagement";
import RoomCreate from "@/pages/RoomCreate";
import RoomDetail from "@/pages/RoomDetail";
import RoomEdit from "@/pages/RoomEdit";

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
import RobotMissionHistory from "@/pages/MissionHistory";
import RobotDetailMisson from "@/pages/RobotDetailMisson";


import RobotDashBoard from "@/pages/RobotDashBoard";
import AddTask from "@/pages/AddTask";
import TaskDetail from "@/pages/TaskDetail";
import EditTask from "../pages/EditTask";

import ProjectMapListView from "@/pages/ViewListMap";
import RunMap from "@/pages/RunMap";
import CreateMap from "@/pages/CreateMap";

import CompartmentCategoryManager from "@/pages/CompartmentCategoryManager";


const routes = [

  { path: "/login", element: <Login /> },
  { path: "/reset-password", element: <ChangePasswordPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/change-password", element: <MainLayout><ChangePasswordPage /></MainLayout> },

  { path: "/", element: <Home /> },

  { path: "/user-profile", element: <MainLayout><UserProfile /></MainLayout> },

  { path: "/users", element: <MainLayout><UserManagementPage /></MainLayout> },
  { path: "/user-detail/:userId", element: <MainLayout><UserDetail /></MainLayout> },
  { path: "/users/create", element: <MainLayout><UserCreate /></MainLayout> },
  { path: "/users/edit/:userId", element: <MainLayout><UserEdit /></MainLayout> },

  { path: "/patients", element: <MainLayout><PatientsManagement /></MainLayout> },
  { path: "/patient/:id", element: <MainLayout><PatientDetail /></MainLayout> },
  { path: "/patients/add", element: <MainLayout><CreatePatient /></MainLayout> },
  { path: "/patients/edit/:id", element: <MainLayout><PatientEdit /></MainLayout> },

  { path: "/rooms", element: <MainLayout><RoomFleetCards /></MainLayout> },
  { path: "/rooms/create", element: <MainLayout><RoomCreate /></MainLayout> },
  { path: "/rooms/:id", element: <MainLayout><RoomDetail /></MainLayout> },
  { path: "/rooms/:id/edit", element: <MainLayout><RoomEdit /></MainLayout> },

  { path: "/medicines", element: <MainLayout><MedicineListPage /></MainLayout> },
  { path: "/medicines/add", element: <MainLayout><MedicineCreate /></MainLayout> },
  { path: "/medicines/:id", element: <MainLayout><MedicineDetail /></MainLayout> },
  { path: "/medicines/edit/:id", element: <MainLayout><MedicineEdit /></MainLayout> },
  { path: "/categories", element: <MainLayout><MedicineCategoryList /></MainLayout> },

  { path: "/prescriptions", element: <MainLayout><PrescriptionManagement /></MainLayout> },
  { path: "/prescriptions/add", element: <MainLayout><PrescriptionCreate /></MainLayout> },
  { path: "/prescriptions/:id", element: <MainLayout><PrescriptionDetail /></MainLayout> },
  { path: "/prescriptions/:id/edit", element: <MainLayout><PrescriptionEdit /></MainLayout> },

  { path: "/team", element: <MainLayout><RobotManagement /></MainLayout> },
  { path: "/createRobot", element: <MainLayout><CreateRobot /></MainLayout> },
  { path: "/robot-detail/:id", element: <MainLayout><RobotDetail /></MainLayout> },
  { path: "/history-mission", element: <MainLayout><RobotMissionHistory /></MainLayout> },
  { path: "/robot-tasks", element: <MainLayout><RobotDetailMisson /></MainLayout> },

  { path: "/dashboard", element: <MainLayout><RobotDashBoard /></MainLayout> },
  { path: "/addtasks", element: <MainLayout><AddTask /></MainLayout> },
  { path: "/task-detail/:id", element: <MainLayout><TaskDetail /></MainLayout> },
  { path: "/task-edit/:id", element: <MainLayout><EditTask /></MainLayout> },

  { path: "/viewlistmap", element: <MainLayout><ProjectMapListView /></MainLayout> },
  { path: "/create-map", element: <MainLayout><CreateMap /></MainLayout> },
  { path: "/run-map", element: <MainLayout><RunMap /></MainLayout> },

  { path: "/compartment-categories", element: <MainLayout><CompartmentCategoryManager /></MainLayout> },
];

export default routes;