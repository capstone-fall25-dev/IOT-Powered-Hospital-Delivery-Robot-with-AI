// src/App.jsx

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import routes from "@/routes/RoutesConfig";

function App() {
  return (

    <Routes>
      {routes.map((route, index) => (
        <Route key={index} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

export default App;
