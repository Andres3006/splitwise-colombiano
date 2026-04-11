const registerForm = document.getElementById('register-only-form');
const messageBox = document.getElementById('register-message-box');

function setRegisterMessage(value) {
    const content = typeof value === 'string'
        ? value
        : JSON.stringify(value, null, 2);

    messageBox.textContent = content;
    messageBox.classList.toggle('hidden', !content);
}

async function registerRequest(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const response = await fetch(path, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : data.error || 'Ocurrió un error');
    }

    return data;
}

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        const data = await registerRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('register-name').value,
                email: document.getElementById('register-email').value,
                password: document.getElementById('register-password').value,
                birth_date: document.getElementById('register-birth-date').value
            })
        });

        registerForm.reset();
        setRegisterMessage(data);
    } catch (error) {
        setRegisterMessage(error.message);
    }
});
