"""
Guru AI Avatar API
==================
POST /api/v1/guru/ask   — answer a free-form question (text response + optional Sarvam TTS)
POST /api/v1/guru/speak — convert text to audio via Sarvam AI TTS (returns base64 audio)

LLM: keyword-retrieval + template engine (local, zero-cost). Swap _find_answer for any LLM later.
TTS: Sarvam AI API (api.sarvam.ai) for realistic Indian-language voices.
"""

from __future__ import annotations

import base64
import os
import re
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["guru"])

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class GuruAskRequest(BaseModel):
    question: str
    grade: str = "Class 9"
    subject: str = "Science"
    language: str = "en-IN"
    concept_id: Optional[str] = None


class GuruAskResponse(BaseModel):
    answer: str
    language: str
    has_audio: bool
    audio_b64: Optional[str] = None


class GuruSpeakRequest(BaseModel):
    text: str
    language: str = "en-IN"


class GuruSpeakResponse(BaseModel):
    audio_b64: str


# ---------------------------------------------------------------------------
# Local answer knowledge base
# ---------------------------------------------------------------------------

_GRADE_CONTEXT = {
    "Class 1": "a 6-year-old child", "Class 2": "a 7-year-old child",
    "Class 3": "an 8-year-old child", "Class 4": "a 9-year-old child",
    "Class 5": "a 10-year-old child", "Class 6": "an 11-year-old student",
    "Class 7": "a 12-year-old student", "Class 8": "a 13-year-old student",
    "Class 9": "a 14-year-old student", "Class 10": "a 15-year-old student",
    "Class 11": "a 16-year-old student", "Class 12": "a 17-year-old student",
}

_ANSWERS: dict[str, str] = {
    # Science
    "force": "Force is a push or pull that changes motion, shape, or direction. Without force, objects keep doing what they're doing — Newton's First Law!",
    "inertia": "Inertia is an object's resistance to changing its state of motion. Heavier objects have more inertia — that's why a truck is harder to stop than a bicycle.",
    "acceleration": "Acceleration is how fast velocity changes. Formula: a = (v - u) / t. You accelerate when you speed up, slow down, or change direction.",
    "velocity": "Velocity is speed with direction. 60 km/h north is velocity. Just 60 km/h without direction is only speed.",
    "friction": "Friction opposes motion between surfaces. It's why shoes grip floors and rubbing hands makes them warm.",
    "newton": "Newton's Laws: (1) Objects stay still or moving unless a force acts. (2) F = ma. (3) Every action has an equal and opposite reaction!",
    "electricity": "Electric current is the flow of electrons through a conductor. Measured in Amperes (A).",
    "resistance": "Resistance opposes electric current flow. Measured in Ohms. Thin wires resist more than thick wires.",
    "ohm": "Ohm's Law: V = I × R. Voltage = Current × Resistance. Simple and powerful!",
    "photosynthesis": "Plants make food using sunlight + water + CO2, releasing oxygen. Formula: 6CO2 + 6H2O + light → C6H12O6 + 6O2",
    "cell": "A cell is the smallest unit of life. Every living thing is made of cells — from single bacteria to trillion-celled humans.",
    "atom": "An atom has a nucleus (protons + neutrons) surrounded by electrons. Everything is made of atoms!",
    "gravity": "Gravity attracts objects with mass towards each other. Earth's gravity pulls things down at 9.8 m/s².",
    "light": "Light travels as electromagnetic waves at 300,000 km/s — the universal speed limit!",
    "sound": "Sound travels as vibrations through matter. It cannot travel through vacuum. Speed in air: ~343 m/s.",
    "energy": "Energy is the ability to do work. Types: kinetic, potential, thermal, electrical, chemical, light, sound.",
    "motion": "Motion is change in position over time. Described by: distance, displacement, speed, velocity, acceleration.",
    "pressure": "Pressure = Force / Area. Sharp knives cut easily because small area creates huge pressure.",
    "wave": "Waves transfer energy through vibration. Sound waves need a medium; light waves don't.",
    "magnet": "Magnets attract iron and have north/south poles. Like poles repel; opposite poles attract.",
    "acid": "Acids have pH below 7, taste sour, turn litmus red. Examples: lemon juice (pH 2), vinegar (pH 3).",
    "base": "Bases have pH above 7, feel slippery, turn litmus blue. Examples: baking soda (pH 9), soap (pH 10).",
    "dna": "DNA (deoxyribonucleic acid) carries genetic information. It's shaped like a double helix and found in every cell's nucleus.",
    "evolution": "Evolution is the change in species over generations through natural selection. Species better adapted to their environment survive and reproduce more.",
    "ecosystem": "An ecosystem is all living organisms in an area plus their physical environment, interacting as a system.",
    # Math
    "quadratic": "Quadratic equation: ax² + bx + c = 0. Solve using: x = (-b ± √(b²-4ac)) / 2a — the quadratic formula!",
    "pythagor": "Pythagoras: a² + b² = c² in a right triangle where c is the hypotenuse. Used in architecture, GPS, and navigation!",
    "triangle": "Triangle: 3 sides, angles sum = 180°. Types: equilateral (all equal), isosceles (two equal), scalene (all different).",
    "fraction": "Fraction = part of whole. Numerator / denominator. 3/4 means 3 of 4 equal parts.",
    "algebra": "Algebra uses variables for unknowns. Solve: 2x + 3 = 9 → 2x = 6 → x = 3. Like solving puzzles!",
    "percentage": "Percent means 'out of 100'. To find 20% of 500: 500 × 20/100 = 100.",
    "probability": "Probability = favourable outcomes / total outcomes. Coin toss: P(heads) = 1/2 = 50%.",
    "prime": "Prime numbers have exactly 2 factors: 1 and themselves. Examples: 2, 3, 5, 7, 11. Note: 1 is NOT prime!",
    "geometry": "Geometry studies shapes. Circle area = πr². Rectangle area = l×w. Triangle area = ½×b×h.",
    "integer": "Integers: ..., -3, -2, -1, 0, 1, 2, 3, ... Whole numbers including negatives and zero.",
    "ratio": "Ratio compares two quantities. If ratio of boys to girls is 3:2 in 25 students, boys = 15, girls = 10.",
    "theorem": "A theorem is a mathematical statement proven from axioms. Pythagoras's theorem is one of the most famous!",
    # History
    "gandhi": "Mahatma Gandhi (1869–1948) led India's independence through non-violence. Key movements: Non-cooperation, Dandi March, Quit India (1942).",
    "independence": "India's independence: 15 August 1947. Nearly 200 years of British rule ended. Nehru became first PM.",
    "mughal": "Mughal Empire (1526–1857). Famous rulers: Akbar (religious tolerance), Shah Jahan (built Taj Mahal), Aurangzeb.",
    "french revolution": "French Revolution (1789): overthrew monarchy due to inequality, taxes, food shortages. 'Liberté, Égalité, Fraternité!'",
    "world war": "WW2 (1939–1945): Allies (UK, USA, USSR) defeated Axis (Germany, Japan, Italy). Ended with Hiroshima & Nagasaki atomic bombs.",
    "colonialism": "Colonialism is when powerful countries take control of weaker ones. Britain colonized India for raw materials and markets.",
    "constitution": "India's Constitution came into effect on 26 January 1950. Dr. B.R. Ambedkar was the chief architect. It's the longest written constitution in the world!",
    # General
    "hello": "Hello! I'm Guru, your AI learning companion! Ask me anything — Science, Math, History, or any school topic!",
    "hi": "Hi there! What would you like to learn today? I'm here to make any topic easy for you!",
    "namaste": "Namaste! Main Guru hoon — aapka AI shiksha sahayak! Koi bhi sawaal poochiye!",
    "namaskar": "Namaskar! Mun Guru — aapankara AI sikshak! Jebele ichha, prashna karanti!",
    "help": "Ask me anything! Try: 'What is force?', 'Explain photosynthesis', 'How to solve quadratic equations?', or 'Who was Gandhi?'",
    "thank": "You're welcome! Keep asking questions — curiosity is the best learning tool!",
    "good": "Thank you! You're doing great! Keep up the excellent work!",
    "what is": "Great question! Let me explain that for you...",
}

GREETINGS = {"hello", "hi", "namaste", "namaskar", "hey", "greetings"}


def _detect_language(text: str) -> str:
    odia_chars = sum(1 for c in text if '\u0B00' <= c <= '\u0B7F')
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    if odia_chars > 2:
        return "or-IN"
    if hindi_chars > 2:
        return "hi-IN"
    return "en-IN"


def _find_answer(question: str, subject: str, grade: str) -> str:
    q_lower = question.lower().strip()
    grade_ctx = _GRADE_CONTEXT.get(grade, "a student")

    for keyword, answer in _ANSWERS.items():
        if keyword in q_lower:
            if keyword in GREETINGS:
                return answer
            return f"Great question! Here's a clear explanation for {grade_ctx}:\n\n{answer}"

    detected = _detect_language(question)
    words = re.sub(r'\b(what|is|are|the|a|an|how|why|explain|tell|me|about|does|do|can|please|define|who|was|were)\b', '', q_lower)
    key_term = words.strip().title() if words.strip() else question.strip()

    if detected == "or-IN":
        return f"ଆପଣ '{key_term}' ବିଷୟରେ ଜାଣିବାକୁ ଚାହୁଁଛନ୍ତି। ଏହା ଏକ ସୁନ୍ଦର ପ୍ରଶ୍ନ! ଶୀଘ୍ର AI ଶକ୍ତି ଯୋଡ଼ି ଏହି ବିଷୟ ବ୍ୟାଖ୍ୟା ଦେବି। ଏବେ, '{key_term}' ବାରେ ଆପଣ ଙ୍କ ପୁସ୍ତକ ଦେଖନ୍ତୁ!"
    elif detected == "hi-IN":
        return f"आपने '{key_term}' के बारे में पूछा। बहुत अच्छा सवाल! यह {subject} का एक महत्वपूर्ण विषय है {grade} के लिए। अपनी पाठ्यपुस्तक में '{key_term}' का अध्याय पढ़ें!"
    else:
        return (
            f"You asked about '{key_term}' — excellent question! "
            f"This is an important topic in {subject} for {grade}. "
            f"My knowledge on this specific term is still expanding! "
            f"For now, check your textbook's chapter on {key_term}. "
            f"Want to try a related quiz on topics I know well?"
        )


# ---------------------------------------------------------------------------
# Sarvam TTS
# ---------------------------------------------------------------------------

_SARVAM_LANG_MAP = {
    "en-IN": "en-IN", "hi-IN": "hi-IN", "or-IN": "od-IN",
    "bn-IN": "bn-IN", "te-IN": "te-IN", "ta-IN": "ta-IN",
    "mr-IN": "mr-IN", "gu-IN": "gu-IN", "kn-IN": "kn-IN",
    "ml-IN": "ml-IN", "pa-IN": "pa-IN",
}


async def _call_sarvam_tts(text: str, language: str) -> Optional[bytes]:
    if not SARVAM_API_KEY:
        return None

    sarvam_lang = _SARVAM_LANG_MAP.get(language, "en-IN")
    text_chunk = text[:480]

    payload = {
        "inputs": [text_chunk],
        "target_language_code": sarvam_lang,
        "speaker": "meera",
        "pitch": 0,
        "pace": 1.05,
        "loudness": 1.5,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model": "bulbul:v1",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                SARVAM_TTS_URL,
                json=payload,
                headers={"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                audios = resp.json().get("audios", [])
                if audios:
                    return base64.b64decode(audios[0])
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/guru/ask", response_model=GuruAskResponse)
async def ask_guru(payload: GuruAskRequest) -> GuruAskResponse:
    if not payload.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")

    lang = payload.language
    detected = _detect_language(payload.question)
    if lang == "en-IN" and detected != "en-IN":
        lang = detected

    answer = _find_answer(payload.question, payload.subject, payload.grade)
    audio_bytes = await _call_sarvam_tts(answer, lang)
    audio_b64 = base64.b64encode(audio_bytes).decode() if audio_bytes else None

    return GuruAskResponse(answer=answer, language=lang, has_audio=audio_b64 is not None, audio_b64=audio_b64)


@router.post("/guru/speak", response_model=GuruSpeakResponse)
async def speak_text(payload: GuruSpeakRequest) -> GuruSpeakResponse:
    if not SARVAM_API_KEY:
        raise HTTPException(status_code=503, detail="SARVAM_API_KEY not configured in .env")

    audio_bytes = await _call_sarvam_tts(payload.text, payload.language)
    if not audio_bytes:
        raise HTTPException(status_code=502, detail="Sarvam TTS call failed")

    return GuruSpeakResponse(audio_b64=base64.b64encode(audio_bytes).decode())
