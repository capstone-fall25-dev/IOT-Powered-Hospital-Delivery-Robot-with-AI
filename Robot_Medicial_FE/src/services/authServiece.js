export async function login(email, password) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        sessionStorage.setItem('token', data.token);

        return data;
    } catch (err) {
        console.error('Lỗi khi đăng nhập:', err);
        throw err;
    }
}
