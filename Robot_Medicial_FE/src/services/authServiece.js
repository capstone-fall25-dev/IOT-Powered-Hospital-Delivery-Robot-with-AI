// src/services/authService.js

async function handleResponse(res) {
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    return await res.json();
}


export async function register(data) {
    try {
        const res = await fetch('/api/Auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await handleResponse(res);
    } catch (err) {
        console.error('❌ Lỗi khi gọi API register:', err);
        throw err;
    }
}


export async function verifyOtp(data) {
    try {
        const res = await fetch('/api/Auth/verify-otp', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await handleResponse(res);
    } catch (err) {
        console.error('❌ Lỗi khi gọi API verify-otp:', err);
        throw err;
    }
}


export async function login(data) {
    try {
        const res = await fetch('/api/Auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await handleResponse(res);

        // Lưu token vào localStorage (để dùng cho các request cần Auth)
        if (result?.token) {
            localStorage.setItem('authToken', result.token);
        }

        return result;
    } catch (err) {
        console.error('❌ Lỗi khi gọi API login:', err);
        throw err;
    }
}


export async function logout() {
    try {
        const res = await fetch('/api/Auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const result = await handleResponse(res);
        localStorage.removeItem('authToken');
        return result;
    } catch (err) {
        console.error('❌ Lỗi khi gọi API logout:', err);
        throw err;
    }
}


export async function getProfile() {
    try {
        const res = await fetch('/api/Auth/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        return await handleResponse(res);
    } catch (err) {
        console.error('❌ Lỗi khi gọi API getProfile:', err);
        throw err;
    }
}


export async function forgotPassword(data) {
    try {
        const res = await fetch('/api/Auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await handleResponse(res);
    } catch (err) {
        console.error('❌ Lỗi khi gọi API forgot-password:', err);
        throw err;
    }
}


export async function verifyForgotPassword(data) {
    try {
        const res = await fetch('/api/Auth/verify-forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await handleResponse(res);
    } catch (err) {
        console.error('❌ Lỗi khi gọi API verify-forgot-password:', err);
        throw err;
    }
}
