const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbxV4nk5Zf9C6RyZszkhR6iygdY0vh7WuLJsWSmhfGGaqA86pIgkG-l_ApvXr8DeuMds/exec"; 
const CUPO_MAXIMO = 10;

const form = document.getElementById('turnoForm');
const selectEsp = document.getElementById('especialidad');
const inputFec = document.getElementById('fechaTurno');
const infoCupos = document.getElementById('cuposInfo');
const btn = document.getElementById('btnEnviar');
const msg = document.getElementById('mensajeEstado');

// Bloquear fechas pasadas
inputFec.setAttribute('min', new Date().toISOString().split('T')[0]);

async function consultarCupos() {
    const esp = selectEsp.value;
    const fec = inputFec.value;
    if (!esp || !fec) return;

    infoCupos.style.display = "block";
    infoCupos.innerText = "Consultando disponibilidad...";
    infoCupos.style.backgroundColor = "#e2e2e2";

    try {
        // Agregamos un timestamp para evitar caché del navegador
        const response = await fetch(`${URL_SCRIPT}?especialidad=${encodeURIComponent(esp)}&fecha=${fec}&t=${Date.now()}`);
        const ocupadosTxt = await response.text();
        const ocupados = parseInt(ocupadosTxt, 10) || 0;
        const disponibles = CUPO_MAXIMO - ocupados;

        if (disponibles <= 0) {
            infoCupos.innerText = `❌ No hay cupos para ${esp} el día ${fec}`;
            infoCupos.style.backgroundColor = "#f8d7da";
            btn.disabled = true;
        } else {
            infoCupos.innerText = `✅ Quedan ${disponibles} turnos disponibles`;
            infoCupos.style.backgroundColor = "#d4edda";
            btn.disabled = false;
        }
    } catch (error) {
        infoCupos.innerText = "Error al verificar cupos.";
    }
}

selectEsp.addEventListener('change', consultarCupos);
inputFec.addEventListener('change', consultarCupos);

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    msg.innerText = "Procesando reserva...";

    // Usamos URLSearchParams para evitar errores de CORS con Google Script
    const formData = new URLSearchParams();
    formData.append('nombre', document.getElementById('nombre').value.trim());
    formData.append('dni', document.getElementById('dni').value.trim());
    formData.append('historial', document.querySelector('input[name="historial"]:checked').value);
    formData.append('telefono', document.getElementById('telefono').value.trim());
    formData.append('especialidad', selectEsp.value);
    formData.append('fechaTurno', inputFec.value);

    try {
        const response = await fetch(URL_SCRIPT, {
            method: 'POST',
            body: formData,
            mode: 'cors' // Ahora sí podemos usar cors
        });

        const resultado = await response.text();

        if (resultado === "OK") {
            msg.innerText = "✅ Turno reservado exitosamente.";
            enviarWhatsApp({
                nombre: document.getElementById('nombre').value,
                dni: document.getElementById('dni').value,
                telefono: document.getElementById('telefono').value,
                especialidad: selectEsp.value,
                fechaTurno: inputFec.value
            });
        } else if (resultado === "DUPLICADO") {
            msg.style.color = "red";
            msg.innerText = "⚠️ Ya tienes un turno para esta especialidad y fecha.";
            btn.disabled = false;
        } else if (resultado === "LLENO") {
            msg.style.color = "red";
            msg.innerText = "❌ Los cupos se agotaron justo ahora.";
            consultarCupos();
        } else {
            msg.innerText = "Error: " + resultado;
            btn.disabled = false;
        }
    } catch (error) {
        msg.innerText = "Error de conexión con el servidor.";
        btn.disabled = false;
    }
});

function enviarWhatsApp(datos) {
    let tel = datos.telefono.replace(/\D/g, '');
    if (!tel.startsWith("549")) tel = "549" + (tel.startsWith("15") ? tel.substring(2) : tel);
    const texto = `*RESERVA CONFIRMADA*%0A*Paciente:* ${datos.nombre}%0A*Especialidad:* ${datos.especialidad}%0A*Fecha:* ${datos.fechaTurno}%0A*DNI:* ${datos.dni}`;
    window.open(`https://wa.me/${tel}?text=${texto}`, '_blank');
    
    // Reiniciar formulario
    form.reset();
    infoCupos.style.display = "none";
    setTimeout(() => { msg.innerText = ""; }, 5000);
    btn.disabled = false;
}