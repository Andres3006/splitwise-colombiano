const registerForm = document.getElementById('register-only-form');
const messageBox = document.getElementById('register-message-box');
const birthDateInput = document.getElementById('register-birth-date');

function setRegisterMessage(value) {
    const content = typeof value === 'string'
        ? value
        : value?.message
            ? value.message
            : value?.name
                ? `Cuenta creada para ${value.name}. Ya puedes iniciar sesion.`
                : 'Operacion completada correctamente.';

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
        throw new Error(typeof data === 'string' ? data : data.error || 'Ocurrio un error');
    }

    return data;
}

function setBirthDateMax() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    birthDateInput.max = `${year}-${month}-${day}`;
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
                birth_date: birthDateInput.value
            })
        });

        registerForm.reset();
        setBirthDateMax();
        setRegisterMessage(data);
    } catch (error) {
        setRegisterMessage(error.message);
    }
});

setBirthDateMax();
