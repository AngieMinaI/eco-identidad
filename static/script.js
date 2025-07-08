let mediaRecorder;
let chunks = [];
let grabando = false;
let audioRespuesta = null;
const generoTexto = document.getElementById("generoTexto");

// Mostrar pantalla principal al presionar R
document.addEventListener("keydown", function (e) {
  if (e.key === "r" || e.key === "R") {
    document.getElementById("pantalla-portada").style.display = "none";
    document.getElementById("app-container").style.display = "block";  
  }
});

async function toggleGrabacion() {
  const boton = document.getElementById("botonGrabacion");
  const status = document.getElementById("status");
  const resultado = document.getElementById("resultado");
  const avatar = document.getElementById("avatar");

  if (!grabando) {
    // Detener audio si está sonando
    if (audioRespuesta) {
      audioRespuesta.pause();
      audioRespuesta.currentTime = 0;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    grabando = true;

    boton.textContent = "⏹ Detener Grabación";
    status.textContent = "🎙 Grabando...";
    resultado.textContent = "";
    avatar.style.display = "none";
    generoTexto.style.display = "none";

    mediaRecorder.ondataavailable = e => chunks.push(e.data);

    mediaRecorder.onstop = async () => {
      status.textContent = "⏳ Procesando...";
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "grabacion.webm");

      try {
        const response = await fetch("/procesar_audio", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          status.textContent = "❌ Error al procesar audio";
          console.error("Error:", response.status);
          return;
        }

        const data = await response.json();
        resultado.textContent = `🗣 Dijiste: "${data.texto}"`;
        status.textContent = "✅ Voz reconocida";

        avatar.src = data.genero === "hombre"
          ? "/static/avatar_hombre.png"
          : "/static/avatar_mujer.png";
        avatar.style.display = "block";

        generoTexto.textContent = data.genero === "hombre" ? "HOMBRE" : "MUJER";
        generoTexto.style.display = "block";

        audioRespuesta = new Audio(`/audio?t=${Date.now()}`);
        audioRespuesta.play();
      } catch (error) {
        status.textContent = "❌ Error de red";
        console.error("Error:", error);
      }
    };

    mediaRecorder.start();
  } else {
    mediaRecorder.stop();
    grabando = false;
    boton.textContent = "🎙 Grabar Voz";
  }
}