import { Navigate, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  console.error("404: redirecting from", location.pathname);
  return <Navigate to="/" replace />;
};

export default NotFound;
