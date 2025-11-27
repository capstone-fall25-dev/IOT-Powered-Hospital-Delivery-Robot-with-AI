// src/routes/RoutesConfig.jsx
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
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
import RobotEdit from "@/pages/RobotEdit";

import RobotDashBoard from "@/pages/RobotDashBoard";
import AddTask from "@/pages/AddTask";
import TaskDetail from "@/pages/TaskDetail";
import EditTask from "../pages/EditTask";
import RunTask from "@/pages/RunTask";

import ProjectMapListView from "@/pages/ViewListMap";
import RunMap from "@/pages/RunMap";
import CreateMap from "@/pages/CreateMap";

import CompartmentCategoryManager from "@/pages/CompartmentCategoryManager";

import ForgotPasswordChangePage from "@/pages/ForgotPasswordChange";

const routes = [
  /*=============================================
    PUBLIC ROUTES - Chỉ cho phép khi CHƯA login
  =============================================*/
  {
    path: "/",
    element: (
      <PublicRoute>
        <Home />
      </PublicRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <ChangePasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: "/forgot-password-change",
    element: (
      <PublicRoute>
        <ForgotPasswordChangePage />
      </PublicRoute>
    ),
  },

  /*=============================================
    PROTECTED - Tất cả routes sau đây yêu cầu login (không kiểm tra role ở phần lớn - trừ các route user admin)
  =============================================*/

  {
    path: "/user-profile",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <UserProfile />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/change-password",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <ChangePasswordPage />
        </MainLayout>
      </ProtectedRoute>
    ),
  },

  // User management routes — giữ role admin như yêu cầu
  {
    path: "/users",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout>
          <UserManagementPage />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  { 
    path: "/user-detail/:userId", 
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout><UserDetail /></MainLayout>
      </ProtectedRoute>
    )
  },
  { 
    path: "/users/create", 
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout><UserCreate /></MainLayout>
      </ProtectedRoute>
    )
  },
  { 
    path: "/users/edit/:userId", 
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout><UserEdit /></MainLayout>
      </ProtectedRoute>
    )
  },

  // Các route khác đều yêu cầu login (ProtectedRoute) nhưng không kiểm tra role
  { path: "/patients", element: (
      <ProtectedRoute>
        <MainLayout><PatientsManagement /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/patient/:id", element: (
      <ProtectedRoute>
        <MainLayout><PatientDetail /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/patients/add", element: (
      <ProtectedRoute>
        <MainLayout><CreatePatient /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/patients/edit/:id", element: (
      <ProtectedRoute>
        <MainLayout><PatientEdit /></MainLayout>
      </ProtectedRoute>
    )
  },

  { path: "/rooms", element: (
      <ProtectedRoute>
        <MainLayout><RoomFleetCards /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/rooms/create", element: (
      <ProtectedRoute>
        <MainLayout><RoomCreate /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/rooms/:id", element: (
      <ProtectedRoute>
        <MainLayout><RoomDetail /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/rooms/:id/edit", element: (
      <ProtectedRoute>
        <MainLayout><RoomEdit /></MainLayout>
      </ProtectedRoute>
    )
  },

  { path: "/medicines", element: (
      <ProtectedRoute>
        <MainLayout><MedicineListPage /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/medicines/add", element: (
      <ProtectedRoute>
        <MainLayout><MedicineCreate /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/medicines/:id", element: (
      <ProtectedRoute>
        <MainLayout><MedicineDetail /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/medicines/edit/:id", element: (
      <ProtectedRoute>
        <MainLayout><MedicineEdit /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/categories", element: (
      <ProtectedRoute>
        <MainLayout><MedicineCategoryList /></MainLayout>
      </ProtectedRoute>
    )
  },

  { path: "/prescriptions", element: (
      <ProtectedRoute>
        <MainLayout><PrescriptionManagement /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/prescriptions/add", element: (
      <ProtectedRoute>
        <MainLayout><PrescriptionCreate /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/prescriptions/:id", element: (
      <ProtectedRoute>
        <MainLayout><PrescriptionDetail /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/prescriptions/:id/edit", element: (
      <ProtectedRoute>
        <MainLayout><PrescriptionEdit /></MainLayout>
      </ProtectedRoute>
    )
  },

  { path: "/team", element: (
      <ProtectedRoute>
        <MainLayout><RobotManagement /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/createRobot", element: (
      <ProtectedRoute>
        <MainLayout><CreateRobot /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/robot-detail/:id", element: (
      <ProtectedRoute>
        <MainLayout><RobotDetail /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/history-mission", element: (
      <ProtectedRoute>
        <MainLayout><RobotMissionHistory /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/robot-tasks", element: (
      <ProtectedRoute>
        <MainLayout><RobotDetailMisson /></MainLayout>
      </ProtectedRoute>
    )
  },

  { path: "/dashboard", element: (
      <ProtectedRoute>
        <MainLayout><RobotDashBoard /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/addtasks", element: (
      <ProtectedRoute>
        <MainLayout><AddTask /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/task-detail/:id", element: (
      <ProtectedRoute>
        <MainLayout><TaskDetail /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/task-edit/:id", element: (
      <ProtectedRoute>
        <MainLayout><EditTask /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/run-task/:taskId", element: (
      <ProtectedRoute>
        <MainLayout><RunTask /></MainLayout>
      </ProtectedRoute>
    )
  },

  { path: "/viewlistmap", element: (
      <ProtectedRoute>
        <MainLayout><ProjectMapListView /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/create-map", element: (
      <ProtectedRoute>
        <MainLayout><CreateMap /></MainLayout>
      </ProtectedRoute>
    )
  },
  { path: "/run-map", element: (
      <ProtectedRoute>
        <MainLayout><RunMap /></MainLayout>
      </ProtectedRoute>
    )
  },

  { 
    path: "/compartment-categories", 
    element: (
      <ProtectedRoute>
        <MainLayout><CompartmentCategoryManager /></MainLayout>
      </ProtectedRoute>
    )
  },

  { path: "/robot-edit/:id", element: (
      <ProtectedRoute>
        <MainLayout><RobotEdit /></MainLayout>
      </ProtectedRoute>
    )
  },
];

export default routes;