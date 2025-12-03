import { useState } from "react";

export default function useToast() {
    const [toast, setToast] = useState({
        show: false,
        type: "",
        message: ""
    });

    const showToast = (type, message, duration = 2800) => {
        setToast({ show: true, type, message });

        setTimeout(() => {
            setToast({ show: false, type: "", message: "" });
        }, duration);
    };

    return { toast, showToast };
}
