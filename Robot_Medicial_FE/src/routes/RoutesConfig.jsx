import Home from "@/pages/Home";
import Login from "@/pages/Login";
import MainLayout from "@/layouts/MainLayout";
import RobotManagement from "../pages/RobotManagement";
import RobotDashBoard from "../pages/RobotDashBoard";
import DoctorProfileProvisionForm from "../pages/DoctorProfileProvisionForm";
import DoctorManagementPage from "../pages/DoctorManagementPage";
import RobotDetailMisson from "../pages/RobotDetailMisson";
import AddTask from "../pages/AddTask";
import UserProfile from "../pages/UserDetail";
import RobotDetail from "../pages/RobotDetail";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import RobotMissionHistory from "../pages/MissionHistory";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";

import ProjectMapListView from "../pages/Viewlistmap";
const routes = [
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/",
        element: (
            <Home />
        ),
    },

    {
        path: "/team",
        element: (
            <MainLayout>
                <RobotManagement />
            </MainLayout>
        ),
    },
    {
        path: "/dashboard",
        element: (
            <MainLayout>
                <RobotDashBoard />
            </MainLayout>
        ),
    },
    {
        path: "/doctor",
        element: (
            <MainLayout>
                <DoctorManagementPage />
            </MainLayout>
        ),
    },
    {
        path: "/robot-tasks",
        element: (
            <MainLayout>
                <RobotDetailMisson />
            </MainLayout>
        ),
    },

    {
        path: "/addtasks",
        element: (
            <MainLayout>
                <AddTask />
            </MainLayout>
        ),
    },

    {
        path: "/robot-detail/:id",
        element: (
            <MainLayout>
                <RobotDetail />
            </MainLayout>
        ),
    },


    {
        path: "/user-detail",
        element: (
            <MainLayout>
                <UserProfile />
            </MainLayout>
        ),
    },

    {
        path: "/doctor-profile",
        element: (
            <MainLayout>
                <DoctorProfileProvisionForm />
            </MainLayout>
        ),
    },

    {
        path: "/reset-password",
        element: (
            <>
                <ChangePasswordPage />
            </>
        ),
    },


    {
        path: "/change-password",
        element: (
            <MainLayout>
                <ChangePasswordPage />
            </MainLayout>
        ),
    },

    {
        path: "/history-mission",
        element: (
            <MainLayout>
                <RobotMissionHistory />
            </MainLayout>
        ),
    },

    {
        path: "/forgot-password",
        element: (
            <MainLayout>
                <ForgotPasswordPage />
            </MainLayout>
        ),
    },

    {
        path: "/viewlistmap",
        element: (
            <MainLayout>
                <ProjectMapListView />
            </MainLayout>
        ),
    },
];


export default routes;
