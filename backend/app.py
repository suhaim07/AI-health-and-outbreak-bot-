from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

api_key = (
    os.getenv("AI_API_KEY")
    or os.getenv("GROQ_API_KEY")
    or os.getenv("OPENROUTER_API_KEY")
    or os.getenv("GEMINI_API_KEY")
    or ""
).strip()
is_placeholder_key = not api_key or api_key in (
    "YOUR_API_KEY_HERE",
    "YOUR_API_KEY",
    "YOUR_GROQ_API_KEY_HERE",
)
ai_model = os.getenv("AI_MODEL") or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
ai_api_url = os.getenv("AI_API_URL", "").strip()

if is_placeholder_key:
    print("\n[WARNING] No AI API key found in backend/.env (AI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY).")
    print("[WARNING] /chat will use built-in safety guidance until a valid key is added.\n")


def get_ai_provider():
    if ai_api_url:
        return ai_api_url, ai_model, "custom"

    if api_key.startswith("sk-or-"):
        return (
            "https://openrouter.ai/api/v1/chat/completions",
            os.getenv("OPENROUTER_MODEL", ai_model),
            "openrouter",
        )

    if api_key.startswith("sk-") and not api_key.startswith("gsk_"):
        return (
            "https://api.openai.com/v1/chat/completions",
            os.getenv("OPENAI_MODEL", ai_model),
            "openai",
        )

    return "https://api.groq.com/openai/v1/chat/completions", ai_model, "groq"

OUTBREAK_COPY = {
    "English": {
        "mosquito_title": "Mosquito-Borne Illness Alert",
        "mosquito_message": "Dengue or chikungunya risk may be higher in your area this season.",
        "mosquito_precautions": "Remove standing water, use mosquito repellent or nets, wear full sleeves, and visit a clinic quickly for high fever, body pain, bleeding, or severe weakness.",
        "respiratory_title": "Respiratory Illness Alert",
        "respiratory_message": "Flu-like illness can spread faster in crowded places and during cooler weather.",
        "respiratory_precautions": "Wear a mask in crowds, wash hands, keep rooms ventilated, and see a doctor if breathing is hard or fever stays high.",
        "clear_title": "Local Health Check",
        "clear_message": "No major seasonal viral alert was found for your location in this app.",
        "clear_precautions": "Keep drinking clean water, wash hands, avoid mosquito bites, and visit a clinic if symptoms become severe.",
    },
    "Hindi": {
        "mosquito_title": "मच्छर से फैलने वाली बीमारी की चेतावनी",
        "mosquito_message": "इस मौसम में आपके क्षेत्र में डेंगू या चिकनगुनिया का जोखिम बढ़ सकता है।",
        "mosquito_precautions": "रुका पानी हटाएं, मच्छरदानी या रिपेलेंट इस्तेमाल करें, पूरे कपड़े पहनें, और तेज बुखार, बदन दर्द, खून आना या बहुत कमजोरी हो तो तुरंत क्लिनिक जाएं।",
        "respiratory_title": "सांस की बीमारी की चेतावनी",
        "respiratory_message": "भीड़ और ठंडे मौसम में फ्लू जैसी बीमारी तेजी से फैल सकती है।",
        "respiratory_precautions": "भीड़ में मास्क पहनें, हाथ धोएं, कमरे में हवा आने दें, और सांस लेने में दिक्कत या तेज बुखार रहे तो डॉक्टर को दिखाएं।",
        "clear_title": "स्थानीय स्वास्थ्य जांच",
        "clear_message": "इस ऐप के अनुसार आपके स्थान पर कोई बड़ा मौसमी वायरल अलर्ट नहीं मिला।",
        "clear_precautions": "साफ पानी पिएं, हाथ धोएं, मच्छरों से बचें, और लक्षण गंभीर हों तो क्लिनिक जाएं।",
    },
    "Kannada": {
        "mosquito_title": "ಸೊಳ್ಳೆಯಿಂದ ಹರಡುವ ರೋಗ ಎಚ್ಚರಿಕೆ",
        "mosquito_message": "ಈ ಋತುವಿನಲ್ಲಿ ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ಡೆಂಗ್ಯೂ ಅಥವಾ ಚಿಕನ್‌ಗುನ್ಯಾ ಅಪಾಯ ಹೆಚ್ಚಿರಬಹುದು.",
        "mosquito_precautions": "ನಿಂತ ನೀರನ್ನು ತೆಗೆಯಿರಿ, ಸೊಳ್ಳೆ ನಿವಾರಕ ಅಥವಾ ಜಾಲ ಬಳಸಿ, ಪೂರ್ಣ ಬಟ್ಟೆ ಧರಿಸಿ, ಹೆಚ್ಚು ಜ್ವರ, ಮೈ ನೋವು, ರಕ್ತಸ್ರಾವ ಅಥವಾ ಹೆಚ್ಚು ದೌರ್ಬಲ್ಯ ಇದ್ದರೆ ತಕ್ಷಣ ಕ್ಲಿನಿಕ್‌ಗೆ ಹೋಗಿ.",
        "respiratory_title": "ಉಸಿರಾಟದ ರೋಗ ಎಚ್ಚರಿಕೆ",
        "respiratory_message": "ಜನಸಂದಣಿ ಮತ್ತು ತಂಪಾದ ಹವಾಮಾನದಲ್ಲಿ ಫ್ಲೂ ತರಹದ ರೋಗ ಬೇಗ ಹರಡಬಹುದು.",
        "respiratory_precautions": "ಜನಸಂದಣಿಯಲ್ಲಿ ಮಾಸ್ಕ್ ಧರಿಸಿ, ಕೈ ತೊಳೆಯಿರಿ, ಕೊಠಡಿಗೆ ಗಾಳಿ ಬರಲು ಬಿಡಿ, ಉಸಿರಾಟ ಕಷ್ಟ ಅಥವಾ ಹೆಚ್ಚು ಜ್ವರ ಇದ್ದರೆ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ.",
        "clear_title": "ಸ್ಥಳೀಯ ಆರೋಗ್ಯ ಪರಿಶೀಲನೆ",
        "clear_message": "ಈ ಆಪ್ ಪ್ರಕಾರ ನಿಮ್ಮ ಸ್ಥಳಕ್ಕೆ ದೊಡ್ಡ ಋತುಮಾನದ ವೈರಲ್ ಎಚ್ಚರಿಕೆ ಕಂಡುಬಂದಿಲ್ಲ.",
        "clear_precautions": "ಸ್ವಚ್ಛ ನೀರು ಕುಡಿಯಿರಿ, ಕೈ ತೊಳೆಯಿರಿ, ಸೊಳ್ಳೆಗಳಿಂದ ತಪ್ಪಿಸಿಕೊಳ್ಳಿ, ಲಕ್ಷಣಗಳು ಗಂಭೀರವಾದರೆ ಕ್ಲಿನಿಕ್‌ಗೆ ಹೋಗಿ.",
    },
    "Tamil": {
        "mosquito_title": "கொசு மூலம் பரவும் நோய் எச்சரிக்கை",
        "mosquito_message": "இந்த பருவத்தில் உங்கள் பகுதியில் டெங்கு அல்லது சிக்குன்குனியா அபாயம் அதிகமாக இருக்கலாம்.",
        "mosquito_precautions": "நின்ற நீரை அகற்றவும், கொசு வலை அல்லது விரட்டி பயன்படுத்தவும், முழு கை ஆடைகள் அணியவும், அதிக காய்ச்சல், உடல் வலி, இரத்தப்போக்கு அல்லது கடும் பலவீனம் இருந்தால் உடனே கிளினிக்கிற்கு செல்லவும்.",
        "respiratory_title": "சுவாச நோய் எச்சரிக்கை",
        "respiratory_message": "கூட்டம் மற்றும் குளிர் காலத்தில் காய்ச்சல் போன்ற நோய் வேகமாக பரவலாம்.",
        "respiratory_precautions": "கூட்டத்தில் முககவசம் அணியவும், கைகளை கழுவவும், அறைக்கு காற்றோட்டம் இருக்கட்டும், மூச்சு விட சிரமம் அல்லது அதிக காய்ச்சல் இருந்தால் மருத்துவரை அணுகவும்.",
        "clear_title": "உள்ளூர் சுகாதார பரிசோதனை",
        "clear_message": "இந்த செயலியின் படி உங்கள் இடத்தில் பெரிய பருவகால வைரஸ் எச்சரிக்கை இல்லை.",
        "clear_precautions": "சுத்தமான தண்ணீர் குடிக்கவும், கைகளை கழுவவும், கொசுக்களிலிருந்து பாதுகாப்பாக இருக்கவும், அறிகுறிகள் கடுமையாக இருந்தால் கிளினிக்கிற்கு செல்லவும்.",
    },
    "Urdu": {
        "mosquito_title": "مچھر سے پھیلنے والی بیماری کا الرٹ",
        "mosquito_message": "اس موسم میں آپ کے علاقے میں ڈینگی یا چکن گنیا کا خطرہ زیادہ ہو سکتا ہے۔",
        "mosquito_precautions": "کھڑا پانی ختم کریں، مچھر دانی یا ریپیلنٹ استعمال کریں، مکمل آستین پہنیں، اور تیز بخار، جسم درد، خون آنا یا شدید کمزوری ہو تو فوراً کلینک جائیں۔",
        "respiratory_title": "سانس کی بیماری کا الرٹ",
        "respiratory_message": "بھیڑ اور ٹھنڈے موسم میں فلو جیسی بیماری تیزی سے پھیل سکتی ہے۔",
        "respiratory_precautions": "بھیڑ میں ماسک پہنیں، ہاتھ دھوئیں، کمرے میں ہوا آنے دیں، اور سانس میں مشکل یا تیز بخار رہے تو ڈاکٹر کو دکھائیں۔",
        "clear_title": "مقامی صحت کی جانچ",
        "clear_message": "اس ایپ کے مطابق آپ کے مقام پر کوئی بڑا موسمی وائرل الرٹ نہیں ملا۔",
        "clear_precautions": "صاف پانی پئیں، ہاتھ دھوئیں، مچھروں سے بچیں، اور علامات شدید ہوں تو کلینک جائیں۔",
    },
}

HIGH_ALERT_WORDS = (
    "severe fever",
    "very high fever",
    "high fever",
    "high dengu",
    "high dengue",
    "severe dengu",
    "severe dengue",
    "suffering from dengu",
    "suffering from dengue",
    "severe malaria",
    "high malaria",
    "malaria with confusion",
    "malaria with breathing",
    "104",
    "105",
    "can't breathe",
    "cannot breathe",
    "breathing problem",
    "shortness of breath",
    "chest pain",
    "heart attack",
    "heart pain",
    "chest burn",
    "burn while inhaling",
    "pain while inhaling",
    "burning while inhaling",
    "severe chest",
    "unconscious",
    "faint",
    "seizure",
    "fits",
    "blood vomit",
    "vomiting blood",
    "blood in stool",
    "severe bleeding",
    "severe pain",
    "worst headache",
    "stiff neck",
    "blue lips",
    "dead patient",
    "patient dead",
    "person died",
    "person is dead",
    "dead person",
    "died",
    "death",
    "not breathing",
    "stopped breathing",
    "no pulse",
    "unresponsive",
    "unconscious",
    "collapsed",
)

COMMON_SPELLINGS = {
    "dengu": "dengue",
    "dengi": "dengue",
    "dangue": "dengue",
    "maleriya": "malaria",
    "maleria": "malaria",
    "feaver": "fever",
    "fiver": "fever",
    "vomitting": "vomiting",
    "loose motions": "loose motion",
}

SYMPTOM_GUIDANCE = {
    "malaria": {
        "keywords": ("malaria",),
        "precaution": "drink ORS or water, rest, use a mosquito net, and avoid self-medicine",
        "watch": "visit a clinic today for a malaria test and proper medicine, and go immediately if fever is high, confusion, breathing trouble, jaundice, or severe weakness appears",
    },
    "typhoid": {
        "keywords": ("typhoid",),
        "precaution": "drink ORS or clean water, eat soft light food, and avoid street food or self-medicine",
        "watch": "visit a clinic today for a test and proper antibiotics, especially if fever continues, stomach pain increases, or weakness is high",
    },
    "jaundice": {
        "keywords": ("jaundice", "yellow eyes", "yellow skin"),
        "precaution": "drink clean water, eat light food, avoid alcohol, and avoid oily food",
        "watch": "visit a clinic today if eyes or skin look yellow, urine is dark, fever is present, or vomiting continues",
    },
    "covid_flu": {
        "keywords": ("covid", "corona", "flu", "influenza"),
        "precaution": "wear a mask, rest away from others, drink warm fluids, and wash hands often",
        "watch": "visit a clinic if breathing is hard, chest hurts, oxygen is low, or fever stays high",
    },
    "asthma": {
        "keywords": ("asthma", "wheezing"),
        "precaution": "sit upright, avoid dust or smoke, and use your prescribed inhaler if you have one",
        "watch": "seek urgent help if breathing is hard, lips look blue, or the inhaler does not help",
    },
    "heart_attack": {
        "keywords": ("heart attack", "heart pain", "heart problem"),
        "precaution": "make the person sit or lie still, loosen tight clothing, and do not give food or drink",
        "watch": "call emergency help immediately or go to the nearest emergency clinic now",
    },
    "uti": {
        "keywords": ("uti", "urine burning", "burning urine", "urinary infection"),
        "precaution": "drink clean water and do not hold urine for long",
        "watch": "visit a clinic if burning continues, fever starts, back pain appears, or urine has blood",
    },
    "chickenpox": {
        "keywords": ("chickenpox", "chicken pox"),
        "precaution": "avoid scratching, keep nails short, stay away from pregnant women and small babies, and rest",
        "watch": "visit a clinic if fever is high, rash gets infected, breathing is hard, or the patient is very weak",
    },
    "dengue": {
        "keywords": ("dengue",),
        "precaution": "take ORS or water often, rest under a mosquito net, and do not take aspirin or ibuprofen",
        "watch": "visit a clinic today for fever check and blood test, especially if weakness, stomach pain, bleeding, or vomiting starts",
    },
    "fever": {
        "keywords": ("fever", "temperature", "viral"),
        "precaution": "drink water, rest, use a cool cloth, and check temperature every few hours",
        "watch": "go to a clinic if fever stays high, lasts more than 2 days, or you feel very weak",
    },
    "cough": {
        "keywords": ("cough", "cold", "throat", "sore throat", "inhaling", "chest burn", "chest burning"),
        "precaution": "drink warm fluids, avoid smoke or dust, and cover your mouth while coughing",
        "watch": "see a doctor if breathing becomes hard, chest hurts, or cough lasts many days",
    },
    "headache": {
        "keywords": ("headache", "migraine", "head pain"),
        "precaution": "rest in a quiet place, drink water, and avoid bright light or loud noise",
        "watch": "visit a clinic if pain is sudden, very severe, or comes with vomiting or fever",
    },
    "stomach": {
        "keywords": ("stomach", "abdomen", "vomit", "vomiting", "diarrhea", "loose motion", "gastric"),
        "precaution": "take ORS or clean water often, eat light food, and avoid oily or street food",
        "watch": "visit a clinic if vomiting continues, stool has blood, or pain is strong",
    },
    "body_pain": {
        "keywords": ("body pain", "joint pain", "body ache", "muscle pain"),
        "precaution": "rest, drink fluids, and avoid heavy work until pain reduces",
        "watch": "see a doctor if pain is severe, with high fever, swelling, or weakness",
    },
    "skin": {
        "keywords": ("rash", "itch", "skin", "allergy", "spots"),
        "precaution": "keep the area clean, avoid scratching, and do not apply unknown creams",
        "watch": "visit a clinic if rash spreads, has swelling, fever, or breathing trouble",
    },
    "dental": {
        "keywords": ("tooth", "teeth", "gum", "dental"),
        "precaution": "rinse with warm salt water and avoid very hot, cold, or sweet food",
        "watch": "see a dentist if swelling, fever, pus, or severe pain is present",
    },
}


def normalize_message(user_message):
    lowered_message = user_message.lower()
    for wrong, correct in COMMON_SPELLINGS.items():
        lowered_message = lowered_message.replace(wrong, correct)
    return lowered_message


def is_high_alert(user_message):
    lowered_message = normalize_message(user_message)
    return any(word in lowered_message for word in HIGH_ALERT_WORDS)


def get_emergency_life_support_reply(user_message):
    lowered_message = normalize_message(user_message)
    death_words = ("dead patient", "patient dead", "person died", "person is dead", "dead person", "died", "death")
    no_breath_words = ("not breathing", "stopped breathing", "no pulse")
    unconscious_words = ("unresponsive", "unconscious", "collapsed", "fainted")

    if any(word in lowered_message for word in death_words):
        return "Call emergency services now on 108 or 112; only a doctor can confirm death, so treat this as an emergency if you are not sure. Check safety, call nearby adults, do not move the person unless unsafe, and if there is no normal breathing start chest compressions if trained until help arrives."

    if any(word in lowered_message for word in no_breath_words):
        return "Call 108 or 112 immediately, put the phone on speaker, and ask someone to bring an AED if available. If the person is not breathing normally, start chest compressions in the center of the chest and continue until ambulance staff arrive or the person starts breathing."

    if any(word in lowered_message for word in unconscious_words):
        return "Call 108 or 112 now, check if the person is breathing normally, and keep the airway clear. If breathing normally, place them on their side in the recovery position; if not breathing normally, start CPR if trained."

    return None


def get_high_alert_reply(user_message):
    lowered_message = normalize_message(user_message)
    emergency_reply = get_emergency_life_support_reply(user_message)
    if emergency_reply:
        return emergency_reply

    if "heart attack" in lowered_message or "heart pain" in lowered_message or "heart problem" in lowered_message:
        return "Call 108 or 112 now for possible heart attack symptoms; keep the person resting, sitting upright if awake, and avoid food or drink. If they collapse or stop breathing normally, start CPR if trained and follow the ambulance operator's instructions."

    if "malaria" in lowered_message:
        return "Malaria with severe signs needs urgent care; drink ORS or water, rest, and do not start random medicine. Visit the nearest clinic immediately for a malaria test and proper treatment."

    if "dengue" in lowered_message:
        return "Dengue with high or severe fever needs same-day care; drink ORS or water, rest, and avoid aspirin or ibuprofen. High alert: visit the nearest clinic immediately for a blood test or call emergency help."

    if "fever" in lowered_message and ("body pain" in lowered_message or "joint" in lowered_message):
        return "High fever with body or joint pain can be serious; drink water or ORS, rest, and avoid self-medicine. High alert: visit the nearest clinic immediately or call emergency help."

    if "fever" in lowered_message:
        return "Severe fever can cause dehydration; drink water or ORS, rest, and use a cool cloth. High alert: visit the nearest clinic immediately if fever is high, severe, or not reducing."

    if (
        "chest pain" in lowered_message
        or "chest burn" in lowered_message
        or "chest burning" in lowered_message
        or "inhaling" in lowered_message
        or "breath" in lowered_message
    ):
        return "Chest burning or pain while breathing can be serious; sit upright, avoid smoke, and do not do heavy work. Visit the nearest clinic immediately or call emergency help if breathing is hard."

    if "bleeding" in lowered_message or "blood" in lowered_message:
        return "Do not take painkillers without a doctor and keep drinking small sips of water. High alert: visit the nearest clinic immediately or call emergency help."

    return "Rest, drink water or ORS, and avoid self-medicine. High alert: visit the nearest clinic immediately or call emergency help."


def get_matched_symptoms(user_message):
    lowered_message = normalize_message(user_message)
    return [
        name for name, guidance in SYMPTOM_GUIDANCE.items()
        if any(keyword in lowered_message for keyword in guidance["keywords"])
    ]


def join_symptom_names(symptom_names):
    display_names = {
        "body_pain": "body pain",
        "dental": "tooth pain",
        "dengue": "suspected dengue",
        "heart_attack": "possible heart attack",
        "covid_flu": "flu or COVID-like illness",
        "malaria": "suspected malaria",
        "stomach": "stomach pain or vomiting",
    }
    readable = [display_names.get(name, name) for name in symptom_names]
    if len(readable) == 1:
        return readable[0]
    if len(readable) == 2:
        return f"{readable[0]} with {readable[1]}"
    return f"{', '.join(readable[:-1])}, and {readable[-1]}"


def get_contextual_reply(user_message):
    matched_symptoms = get_matched_symptoms(user_message)
    if not matched_symptoms:
        return None

    if "malaria" in matched_symptoms:
        return "Malaria needs a clinic test and correct medicine; drink ORS or water, rest under a mosquito net, and avoid self-medicine. Visit a clinic today, and go immediately if fever is high, confusion, breathing trouble, jaundice, or severe weakness appears."

    if "typhoid" in matched_symptoms:
        return "Typhoid needs a clinic test and proper antibiotics; drink ORS or clean water, eat soft light food, and avoid street food. Visit a clinic today, especially if fever continues, stomach pain increases, or weakness is high."

    if "asthma" in matched_symptoms:
        return "If breathing is hard, sit upright, avoid dust or smoke, and use your prescribed inhaler if available. Visit the nearest clinic immediately if wheezing is severe, lips look blue, or the inhaler does not help."

    if "heart_attack" in matched_symptoms:
        return "Call 108 or 112 now for possible heart attack symptoms; keep the person resting, sitting upright if awake, and avoid food or drink. If they collapse or stop breathing normally, start CPR if trained and follow the ambulance operator's instructions."

    if "dengue" in matched_symptoms:
        return "Suspected dengue needs a blood test; drink ORS or water often, rest under a mosquito net, and do not take aspirin or ibuprofen. Visit a clinic today, and go immediately if there is bleeding, severe stomach pain, repeated vomiting, or extreme weakness."

    if "fever" in matched_symptoms and "body_pain" in matched_symptoms:
        return "Fever with body pain may happen in viral fever, dengue, or malaria; drink ORS or water, rest, and avoid mosquito bites. Visit a clinic today if fever is high, pain is severe, or weakness is increasing."

    if "fever" in matched_symptoms and "stomach" in matched_symptoms:
        return "Fever with vomiting or stomach trouble can cause dehydration; take ORS in small sips and eat light food. Visit a clinic if vomiting continues, urine is low, or fever stays high."

    if "cough" in matched_symptoms and "fever" in matched_symptoms:
        return "Fever with cough may spread to others; wear a mask, drink warm fluids, and rest away from family if possible. Visit a clinic if breathing is hard, chest hurts, or fever stays high."

    if "cough" in matched_symptoms and "inhaling" in normalize_message(user_message):
        return "Chest burning while inhaling may be from irritation, infection, or breathing strain; avoid smoke or dust, sit upright, and sip warm water. Visit a clinic today if it continues, and go immediately if breathing is hard or chest pain is strong."

    primary = matched_symptoms[0]
    guidance = SYMPTOM_GUIDANCE[primary]
    symptom_text = join_symptom_names(matched_symptoms)
    return f"For {symptom_text}, {guidance['precaution']}. Please {guidance['watch']}."


def get_safe_fallback_reply(user_message):
    lowered_message = normalize_message(user_message)

    greeting_words = ("hello", "hi", "hey", "good morning", "good evening", "good afternoon", "namaste", "helo", "hii")
    if any(word == lowered_message.strip() or lowered_message.strip().startswith(word) for word in greeting_words):
        return "Hello! I am PulseGuard AI, your health assistant. Please tell me your symptoms and I will help you with guidance and precautions."

    about_phrases = ("tell about yourself", "tell me about yourself", "who are you", "what are you", "about you", "what can you do", "introduce yourself", "your name", "what is your name", "tell about you", "how do you work", "how does this work", "what do you do", "how can you help", "help me")
    if any(phrase in lowered_message for phrase in about_phrases):
        return "I am PulseGuard AI, a health assistant designed to help village users, elderly people, and anyone needing quick health guidance. I can help with symptoms like fever, dengue, malaria, cough, stomach pain, and more. Tell me your symptoms and I will give you precautions and advice on when to see a doctor."

    thanks_words = ("thank", "thanks", "thank you", "ok thanks", "okay", "ok", "great", "good", "nice", "got it", "understood")
    if any(word == lowered_message.strip() or lowered_message.strip().startswith(word) for word in thanks_words):
        return "You are welcome! Stay safe and take care. If you have any symptoms or health questions, feel free to ask anytime."

    emergency_reply = get_emergency_life_support_reply(user_message)
    if emergency_reply:
        return emergency_reply

    if any(word in lowered_message for word in ("heart attack", "heart pain", "heart problem")):
        return "Call 108 or 112 now for possible heart attack symptoms; keep the person resting, sitting upright if awake, and avoid food or drink. If they collapse or stop breathing normally, start CPR if trained and follow the ambulance operator's instructions."

    if any(word in lowered_message for word in ("chest", "breath", "inhaling", "unconscious", "bleeding", "severe")):
        return "This symptom may need urgent checking; rest, avoid self-medicine, and keep the person sitting or lying safely. Visit the nearest clinic immediately or call emergency help."

    if any(word in lowered_message for word in (
        "pain", "fever", "vomit", "diarrhea", "infection", "malaria", "dengue",
        "typhoid", "jaundice", "covid", "flu", "asthma", "uti", "chickenpox",
        "i have", "suffering from", "diagnosed"
    )):
        return "Drink clean water or ORS, rest, and avoid taking random medicines. Visit a clinic today if symptoms are strong, repeated, or not improving."

    return "I am PulseGuard AI and I am here to help with health symptoms and guidance. Please describe what symptoms you or someone else is experiencing, such as fever, cough, stomach pain, or any other health concern, and I will give you precautions and advice."


def get_ai_reply(user_message, language):
    lowered_message = normalize_message(user_message)
    greeting_words = ("hello", "hi", "hey", "good morning", "good evening", "good afternoon", "namaste", "helo", "hii")
    if any(word == lowered_message.strip() or lowered_message.strip().startswith(word) for word in greeting_words):
        return "Hello! I am PulseGuard AI, your health assistant. Please tell me your symptoms and I will help you with guidance and precautions."

    about_phrases = ("tell about yourself", "tell me about yourself", "who are you", "what are you", "about you", "what can you do", "introduce yourself", "your name", "what is your name", "tell about you", "how do you work", "how does this work", "what do you do", "how can you help", "help me")
    if any(phrase in lowered_message for phrase in about_phrases):
        return "I am PulseGuard AI, a health assistant designed to help village users, elderly people, and anyone needing quick health guidance. I can help with symptoms like fever, dengue, malaria, cough, stomach pain, and more. Tell me your symptoms and I will give you precautions and advice on when to see a doctor."

    thanks_words = ("thank", "thanks", "thank you", "ok thanks", "okay", "ok", "great", "good", "nice", "got it", "understood")
    if any(word == lowered_message.strip() or lowered_message.strip().startswith(word) for word in thanks_words):
        return "You are welcome! Stay safe and take care. If you have any symptoms or health questions, feel free to ask anytime."

    alert_level = "HIGH ALERT" if is_high_alert(user_message) else "NORMAL"

    safety_guidance = ""
    if alert_level == "HIGH ALERT":
        safety_guidance = get_high_alert_reply(user_message)
    else:
        safety_guidance = get_contextual_reply(user_message) or ""

    if is_placeholder_key:
        print("[WARNING] Cannot call AI API: no valid API key configured. Using built-in guidance.")
        return safety_guidance or get_safe_fallback_reply(user_message)

    api_url, model_name, provider = get_ai_provider()

    prompt = f'''
PulseGuard AI: friendly simple healthcare assistant.
Audience: village users, elderly people, first-time smartphone users.
Alert level: {alert_level}
{f"Safety Guidance Context: {safety_guidance}" if safety_guidance else ""}

Rules:
1. Answer in {language} when possible, matching the user's input.
2. Use plain text only. No markdown.
3. Keep it short and brief: exactly 2 short sentences.
4. First silently understand all symptoms, disease names, spelling mistakes, and severity together.
5. Sentence 1: give real-world precautions related to those exact symptoms, such as ORS, fluids, rest, mask, mosquito protection, light food, or avoiding unsafe medicines when relevant.
6. Sentence 2: if the symptoms sound severe or Alert level is HIGH ALERT, tell the user to visit the nearest clinic immediately or call emergency help. If not severe, say when to see a doctor if it worsens.
7. Every sentence must be complete. Do not stop mid-sentence.
8. For collapse, death, no breathing, no pulse, unconsciousness, or heart attack words, give immediate real-life steps: call 108 or 112, check breathing, keep airway clear, recovery position if breathing, CPR if not breathing and trained, do not move unless unsafe.
9. Do not diagnose with certainty. Use simple words.

User symptoms:
{user_message}
'''
    payload = json.dumps({
        "model": model_name,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 1000,
    }).encode("utf-8")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "PulseGuard-AI/1.0",
    }
    if provider == "openrouter":
        headers["HTTP-Referer"] = os.getenv("OPENROUTER_SITE_URL", "http://localhost:5173")
        headers["X-Title"] = os.getenv("OPENROUTER_APP_NAME", "PulseGuard AI")

    request = Request(
        api_url,
        data=payload,
        headers=headers,
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
        reply = result["choices"][0]["message"]["content"].strip()
        if reply:
            return reply
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        print(f"ERROR IN {provider.upper()} API:", error.code, details)
        print("[INFO] Falling back to built-in safety guidance.")
    except (URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as error:
        print(f"ERROR IN {provider.upper()} API:", error)
        print("[INFO] Falling back to built-in safety guidance.")

    return safety_guidance or get_safe_fallback_reply(user_message)


def get_outbreak_risk(lat, lon, language):
    copy = OUTBREAK_COPY.get(language, OUTBREAK_COPY["English"])
    month = datetime.now().month
    in_india_region = 6 <= lat <= 38 and 68 <= lon <= 98
    warm_or_monsoon_month = month in (5, 6, 7, 8, 9, 10, 11)
    cool_month = month in (11, 12, 1, 2)

    if in_india_region and warm_or_monsoon_month:
        return {
            "level": "high",
            "title": copy["mosquito_title"],
            "message": copy["mosquito_message"],
            "precautions": copy["mosquito_precautions"],
            "source": "Seasonal location-based risk check"
        }

    if cool_month:
        return {
            "level": "medium",
            "title": copy["respiratory_title"],
            "message": copy["respiratory_message"],
            "precautions": copy["respiratory_precautions"],
            "source": "Seasonal location-based risk check"
        }

    return {
        "level": "low",
        "title": copy["clear_title"],
        "message": copy["clear_message"],
        "precautions": copy["clear_precautions"],
        "source": "Seasonal location-based risk check"
    }


@app.route("/health", methods=["GET"])
def health():
    _, model_name, provider = get_ai_provider()
    return jsonify({
        "status": "ok",
        "ai_configured": not is_placeholder_key,
        "provider": provider if not is_placeholder_key else None,
        "model": model_name if not is_placeholder_key else None,
    })


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = str(data.get("message") or "").strip()
    language = str(data.get("language") or "the user's language")

    if not user_message:
        return jsonify({
            "reply": "Please type your symptoms so I can help.",
            "error": "message is required",
        }), 400

    try:
        return jsonify({
            "reply": get_ai_reply(user_message, language)
        })
    except Exception as e:
        print("ERROR IN CHAT API:", e)
        return jsonify({
            "reply": get_safe_fallback_reply(user_message),
            "error": str(e),
        }), 500


@app.route("/outbreak-alert", methods=["POST"])
def outbreak_alert():
    data = request.get_json(silent=True) or {}
    language = str(data.get("language") or "English")

    try:
        lat = float(data.get("lat"))
        lon = float(data.get("lon"))
    except (TypeError, ValueError):
        return jsonify({
            "level": "unknown",
            "title": "Location needed",
            "message": "Allow location access to check local health alerts.",
            "precautions": "Keep basic hygiene, drink clean water, and avoid mosquito bites.",
            "source": "Location unavailable"
        }), 400

    return jsonify(get_outbreak_risk(lat, lon, language))

if __name__ == "__main__":
    app.run(debug=False, port=5000)
