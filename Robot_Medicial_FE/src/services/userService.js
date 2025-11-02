export async function getAllUsers() {
    try {
        const res = await fetch('/api/users/get-all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error('Lỗi khi gọi API get-all users:', err);
        throw err;
    }
}
