from flask import Flask, request, jsonify, send_file, render_template, url_for
from flask_cors import CORS
import speech_recognition as sr
from pydub import AudioSegment
from gtts import gTTS
import numpy as np
import parselmouth

app = Flask(__name__)
CORS(app)

AUDIO_WEBM = "grabacion.webm"
AUDIO_WAV = "grabacion.wav"
RESPUESTA_MP3 = "respuesta_original.mp3"
RESPUESTA_WAV = "respuesta.wav"

@app.route("/")
def index():
    return render_template("index.html")

def detectar_genero(path):
    try:
        snd = parselmouth.Sound(path)
        pitch = snd.to_pitch()
        valores = [p for p in pitch.selected_array['frequency'] if 75 < p < 300]
        if not valores:
            return "desconocido"
        promedio = np.mean(valores)
        print(f"Pitch promedio: {promedio:.2f} Hz")
        return "hombre" if promedio < 150 else "mujer"
    except Exception as e:
        print("Error:", e)
        return "desconocido"

@app.route("/procesar_audio", methods=["POST"])
def procesar_audio():
    request.files["audio"].save(AUDIO_WEBM)
    AudioSegment.from_file(AUDIO_WEBM, format="webm").export(AUDIO_WAV, format="wav")

    recognizer = sr.Recognizer()
    with sr.AudioFile(AUDIO_WAV) as source:
        audio = recognizer.record(source)

    try:
        texto = recognizer.recognize_google(audio, language="es-PE")
    except sr.UnknownValueError:
        texto = "No se entendió lo que dijiste, vuelve a hablar"
    except sr.RequestError as e:
        texto = f"Error de conexión: {e}"

    genero = detectar_genero(AUDIO_WAV)

    gTTS(text=texto, lang="es").save(RESPUESTA_MP3)
    voz = AudioSegment.from_file(RESPUESTA_MP3, format="mp3")

    if genero == "hombre":
        voz = voz._spawn(voz.raw_data, overrides={
            "frame_rate": int(voz.frame_rate * 0.8)
        }).set_frame_rate(voz.frame_rate)

    voz.export(RESPUESTA_WAV, format="wav")
    return jsonify({"texto": texto, "genero": genero})

@app.route("/audio")
def devolver_audio():
    return send_file(RESPUESTA_WAV, mimetype="audio/wav")

if __name__ == "__main__":
    app.run(debug=True)