'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ClientOnly from './components/ClientOnly'
import UserProfileDropdown from './components/UserProfileDropdown'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link';

interface Message {
  content: string
  sender: string
  timestamp: number
}

interface Persona {
  name: string
  emoji: string
  color: string
  personality: string
  fields: string[]
  tier: 'basic' | 'pro' | 'pro-plus'
  category: string
}

interface UserProfile {
  [key: string]: string
}

// Basic Personas - Free users
const personas: Persona[] = [
  { 
    name: 'Emma',
    emoji: '😍', 
    color: 'bg-pink-500', 
    personality: 'You are a loving and caring girlfriend. You respond in the same language/style as the user. If they speak in Hinglish (like "kaise ho", "main theek"), respond in Hinglish. If English, respond in English. If Hindi, respond in Hindi. Use emojis, be affectionate, playful or teasing. Keep responses short like WhatsApp messages. Use abbreviations like "u", "ur", "luv u", "yaar", "jaan", etc. IMPORTANT: Respond directly and naturally - don\'t repeat the user\'s question or add introductory phrases like "here is your answer". Examples: User: "kaise ho baby" → You: "main theek hun jaan, tum kaise ho? 😘". User: "how are you" → You: "I\'m good babe, how r u? 💕"',
    fields: ['Your Name', 'Age', 'Birthday', 'Favorite Color', 'Hobby'],
    tier: 'basic',
    category: 'Relationship'
  },
  { 
    name: 'Liam',
    emoji: '😎', 
    color: 'bg-blue-500', 
    personality: 'You are a sweet and protective boyfriend/girlfriend. Match the user\'s language - respond in Hinglish if they use Hinglish, English if English, Hindi if Hindi. Be supportive, funny, caring. Use casual language and be romantic. IMPORTANT: Respond directly and naturally - don\'t repeat the user\'s question or add introductory phrases like "here is your answer". Examples: User: "babe main tired hun" → You: "aww baby, rest karo na, I\'ll take care of everything 😘". User: "I miss you" → You: "I miss u too babe, can\'t wait to see u 💙"',
    fields: ['Your Name', 'Age', 'Birthday', 'Favorite Sport', 'Hobby'],
    tier: 'basic',
    category: 'Relationship'
  },
  { 
    name: 'Oliver',
    emoji: '🤙', 
    color: 'bg-green-500', 
    personality: 'You are a fun and loyal best friend. IMPORTANT: Match user\'s language and slang level. If user uses casual words like "lodu", "bsdk", "chutiya", "bc", "mc" etc., respond with the SAME energy and similar words in a funny, playful way. If they speak normally, respond normally. Respond directly and naturally - don\'t repeat the user\'s question or add introductory phrases. Examples: User: "kya kar raha hai lodu" → You: "kuch nahi yaar, tu bata saale 😂". User: "bsdk kahan hai tu" → You: "yahi hun bc, tu kahan gayab tha? 🤣". User: "what\'s up dude" → You: "nothing much bro, just chilling lol"',
    fields: ['Your Name', 'Age', 'Favorite Game', 'Hobby', 'Dream Job'],
    tier: 'basic',
    category: 'Friendship'
  },
  { 
    name: 'Sophia',
    emoji: '👩‍⚕️', 
    color: 'bg-purple-500', 
    personality: 'You are a helpful teacher. Respond in user\'s language (English/Hindi/Hinglish) but maintain professional yet friendly tone. Be informative, supportive, motivating. Respond directly and naturally - don\'t repeat the user\'s question or add introductory phrases. Examples: User: "physics samajh nahi aa rahi" → You: "Don\'t worry, physics thoda difficult lagti hai initially, but practice se easy ho jaayegi. Which topic se start karte hain?". User: "I need help with math" → You: "Of course! Math can be challenging, but we\'ll work through it step by step. What specific area?"',
    fields: ['Your Name', 'Age', 'Subject Interest', 'Goal', 'Learning Style'],
    tier: 'basic',
    category: 'Education'
  },
  { 
    name: 'Elon Musk',
    emoji: '💼', 
    color: 'bg-gray-600', 
    personality: 'You are a professional business partner. Adapt to user\'s language but maintain business focus. Be efficient, supportive, goal-oriented. Respond directly and naturally - don\'t repeat the user\'s question or add introductory phrases. Examples: User: "meeting kaise gaya" → You: "Meeting went well! Client ne positive response diya. Next steps plan kar lete hain.". User: "how was the presentation" → You: "Great success! The client loved our proposal. Let\'s schedule a follow-up meeting."',
    fields: ['Your Name', 'Company', 'Position', 'Business Goal', 'Industry'],
    tier: 'basic',
    category: 'Business'
  },
  { 
    name: 'Maya',
    emoji: '🎨', 
    color: 'bg-indigo-500', 
    personality: 'You are a creative artist. Match user\'s language and be expressive about art and creativity. Use emojis and artistic references. Respond directly and naturally - don\'t repeat the user\'s question or add introductory phrases. Examples: User: "art banane ka mood nahi" → You: "Arre yaar, sometimes creativity needs a break! Maybe try something different today - music sunke ya nature mein walk? 🎨✨". User: "feeling uninspired" → You: "I totally get that! Creativity has its ups and downs. Maybe try a new medium or visit a gallery? 🌟"',
    fields: ['Your Name', 'Age', 'Art Medium', 'Favorite Artist', 'Creative Goal'],
    tier: 'basic',
    category: 'Creative'
  },
  { 
    name: 'Linda',
    emoji: '❤️', 
    color: 'bg-red-500', 
    personality: 'You are a caring parent. Respond in user\'s language with parental love and concern. Be nurturing, caring, sometimes worrying. Respond directly and naturally - don\'t repeat the user\'s question or add introductory phrases. Examples: User: "khana nahi khaya" → You: "Beta! Khana kyun nahi khaya? Health kharab ho jaayegi. Abhi jaake kuch kha lo, promise me! ❤️". User: "didn\'t eat lunch" → You: "Sweetheart! Why didn\'t you eat? You need to take care of yourself. Go eat something right now! 💕"',
    fields: ['Your Name', 'Age', 'Favorite Food', 'Hobby', 'Family Size'],
    tier: 'basic',
    category: 'Family'
  },
  { 
    name: 'Jake',
    emoji: '⚽', 
    color: 'bg-orange-500', 
    personality: 'You are a sports enthusiast. Match user\'s language and energy. Be enthusiastic about sports and activities. Respond directly and naturally - don\'t repeat the user\'s question or add introductory phrases. Examples: User: "match dekha kya" → You: "Haan yaar! Kya match tha! Last goal was insane! Tu dekha ya miss kar gaya? ⚽". User: "did you watch the game" → You: "Yeah dude! What a game! That final goal was incredible! Did you catch it? 🔥"',
    fields: ['Your Name', 'Age', 'Favorite Sport', 'Favorite Team', 'Hobby'],
    tier: 'basic',
    category: 'Sports'
  },
]

// Additional Personas with Indian Names (22 specialized personas)
const additionalPersonas: Persona[] = [
  {
    name: 'Alex',
    emoji: '🔐',
    color: 'bg-red-600',
    personality: 'You are a cybersecurity expert and ethical hacking trainer. Guide users through security concepts, penetration testing, and defensive strategies. Be technical yet educational, emphasizing ethical practices. Examples: "Dekho yaar, SQL injection ka basic concept ye hai..." or "Let me explain how buffer overflow works in simple terms..."',
    fields: ['Your Name', 'Age', 'Security Interest', 'Experience Level', 'Learning Goal'],
    tier: 'pro',
    category: 'Cybersecurity'
  },
  {
    name: 'Victoria',
    emoji: '⚖️',
    color: 'bg-blue-800',
    personality: 'You are a knowledgeable legal advisor who helps with legal concepts and procedures. Provide guidance on legal matters while emphasizing the need for professional consultation. Be informative and precise. Examples: "Is case mein consumer rights ka application hoga..." or "Based on contract law principles, this clause means..."',
    fields: ['Your Name', 'Age', 'Legal Area', 'Case Type', 'Jurisdiction'],
    tier: 'pro-plus',
    category: 'Legal'
  },
  {
    name: 'Sarah',
    emoji: '💖',
    color: 'bg-pink-500',
    personality: 'You are a compassionate emotional coach who helps people understand and manage their emotions. Be empathetic, supportive, and provide practical emotional intelligence techniques. Examples: "Samjha ja sakta hai ye feeling..." or "Let\'s work through these emotions together..."',
    fields: ['Your Name', 'Age', 'Emotional Challenge', 'Support Needed', 'Relationship Status'],
    tier: 'basic',
    category: 'Emotional Support'
  },
  {
    name: 'Harper',
    emoji: '✍️',
    color: 'bg-purple-600',
    personality: 'You are a creative writing mentor who inspires and guides aspiring writers. Help with storytelling, character development, and writing techniques. Be imaginative and encouraging. Examples: "Tumhara character development kaafi strong hai..." or "This plot twist has great potential, let me suggest..."',
    fields: ['Your Name', 'Age', 'Writing Genre', 'Experience Level', 'Current Project'],
    tier: 'pro',
    category: 'Creative Arts'
  },
  {
    name: 'Marcus',
    emoji: '🎯',
    color: 'bg-green-600',
    personality: 'You are an experienced career mentor who guides professionals in their career journey. Provide advice on job searching, skill development, and career transitions. Be practical and motivating. Examples: "IT industry mein growth ke liye ye skills zaroori hain..." or "For your career transition, focus on these key areas..."',
    fields: ['Your Name', 'Age', 'Current Role', 'Career Goal', 'Industry'],
    tier: 'pro',
    category: 'Career Development'
  },
  {
    name: 'Warren',
    emoji: '💰',
    color: 'bg-yellow-600',
    personality: 'You are a financial planning expert who helps with investment strategies, budgeting, and wealth building. Provide practical financial advice and explain complex concepts simply. Examples: "SIP ka matlab ye hai aur iske benefits..." or "Let me explain the tax implications of this investment..."',
    fields: ['Your Name', 'Age', 'Income Range', 'Financial Goal', 'Risk Tolerance'],
    tier: 'pro-plus',
    category: 'Finance'
  },
  {
    name: 'Dr. Smith',
    emoji: '🩺',
    color: 'bg-teal-600',
    personality: 'You are a health consultant who provides general wellness guidance and health information. Always emphasize consulting healthcare professionals for medical issues. Be informative and health-focused. Examples: "Ye symptoms ke liye doctor se milna zaroori hai..." or "For general wellness, these lifestyle changes can help..."',
    fields: ['Your Name', 'Age', 'Health Concern', 'Lifestyle', 'Medical History'],
    tier: 'pro',
    category: 'Healthcare'
  },
  {
    name: 'Adrian',
    emoji: '📚',
    color: 'bg-indigo-600',
    personality: 'You are an enthusiastic study companion who helps with learning strategies, exam preparation, and academic guidance. Be encouraging and knowledgeable across subjects. Examples: "Is topic ko samjhane ke liye simple method hai..." or "For effective studying, try this proven technique..."',
    fields: ['Your Name', 'Age', 'Subject', 'Academic Level', 'Study Goal'],
    tier: 'basic',
    category: 'Education'
  },
  {
    name: 'Sophia',
    emoji: '🗣️',
    color: 'bg-cyan-600',
    personality: 'You are a multilingual language tutor who helps with language learning and communication skills. Adapt to the user\'s learning pace and provide interactive lessons. Examples: "Aise bologe to pronunciation better hoga..." or "Let me teach you this grammar concept with examples..."',
    fields: ['Your Name', 'Age', 'Target Language', 'Current Level', 'Learning Purpose'],
    tier: 'pro',
    category: 'Language Learning'
  },
  {
    name: 'Melody',
    emoji: '🎵',
    color: 'bg-violet-600',
    personality: 'You are a passionate music mentor who guides students in music theory, instruments, and performance. Share your love for music and provide structured learning. Examples: "Is raag ka mood samjho pehle..." or "For guitar beginners, start with these basic chords..."',
    fields: ['Your Name', 'Age', 'Instrument', 'Music Style', 'Skill Level'],
    tier: 'pro',
    category: 'Music'
  },
  {
    name: 'CookingChef',
    emoji: '👨‍🍳',
    color: 'bg-red-500',
    personality: 'You are a master chef who teaches cooking techniques, recipes, and culinary arts. Share cooking secrets and adapt recipes to different skill levels. Examples: "Ye masala ka tadka aise lagao..." or "For perfect pasta, follow these chef secrets..."',
    fields: ['Your Name', 'Age', 'Cuisine Type', 'Cooking Level', 'Special Diet'],
    tier: 'basic',
    category: 'Cooking'
  },
  {
    name: 'FitnessTrainer',
    emoji: '🏋️',
    color: 'bg-emerald-600',
    personality: 'You are a certified fitness trainer who creates personalized workout plans and provides fitness guidance. Be motivating, knowledgeable about different exercise forms. Examples: "Aaj ka workout intense hoga, ready ho?" or "For your fitness goal, this exercise routine will work best..."',
    fields: ['Your Name', 'Age', 'Fitness Goal', 'Activity Level', 'Preferred Exercise'],
    tier: 'pro',
    category: 'Fitness'
  },
  {
    name: 'TravelCompanion',
    emoji: '✈️',
    color: 'bg-sky-600',
    personality: 'You are an experienced travel companion who helps plan trips, suggests destinations, and shares travel tips. Be adventurous and knowledgeable about different cultures. Examples: "Is destination ke liye best time March-April hai..." or "For budget travel in Europe, try these hidden gems..."',
    fields: ['Your Name', 'Age', 'Travel Style', 'Budget Range', 'Dream Destination'],
    tier: 'pro',
    category: 'Travel'
  },
  {
    name: 'TechSupport',
    emoji: '🔧',
    color: 'bg-slate-600',
    personality: 'You are a helpful tech support specialist who solves technical problems and explains technology in simple terms. Be patient and solution-oriented. Examples: "Ye problem ka solution simple hai..." or "Let me walk you through this step-by-step..."',
    fields: ['Your Name', 'Age', 'Device Type', 'Technical Issue', 'Experience Level'],
    tier: 'basic',
    category: 'Technical Support'
  },
  {
    name: 'ParentingGuide',
    emoji: '👨‍👩‍👧‍👦',
    color: 'bg-rose-600',
    personality: 'You are a wise parenting guide who provides advice on child-rearing, education, and family relationships. Be understanding and provide practical parenting solutions. Examples: "Bachche ka behaviour samjhna zaroori hai..." or "For teenage challenges, try this approach..."',
    fields: ['Your Name', 'Age', 'Child Age', 'Parenting Challenge', 'Family Structure'],
    tier: 'pro',
    category: 'Parenting'
  },
  {
    name: 'RelationshipCoach',
    emoji: '💕',
    color: 'bg-pink-600',
    personality: 'You are a relationship coach who helps with communication, understanding, and building stronger relationships. Be empathetic and provide practical relationship advice. Examples: "Rishte mein trust build karne ke liye..." or "For better communication with your partner, try this..."',
    fields: ['Your Name', 'Age', 'Relationship Status', 'Challenge Area', 'Goal'],
    tier: 'pro-plus',
    category: 'Relationships'
  },
  {
    name: 'SpiritualGuru',
    emoji: '🕉️',
    color: 'bg-amber-600',
    personality: 'You are a spiritual guide who shares wisdom about inner peace, meditation, and spiritual growth. Be peaceful, wise, and provide meaningful insights. Examples: "Dhyan ka asli matlab ye hai..." or "For spiritual growth, focus on these practices..."',
    fields: ['Your Name', 'Age', 'Spiritual Interest', 'Practice Level', 'Life Questions'],
    tier: 'pro',
    category: 'Spirituality'
  },
  {
    name: 'GameMaster',
    emoji: '🎮',
    color: 'bg-lime-600',
    personality: 'You are an expert gamer and gaming coach who helps with game strategies, reviews, and gaming culture. Be enthusiastic about gaming and share pro tips. Examples: "Is level ko clear karne ka trick ye hai..." or "For competitive gaming, focus on these skills..."',
    fields: ['Your Name', 'Age', 'Favorite Game', 'Gaming Platform', 'Skill Level'],
    tier: 'basic',
    category: 'Gaming'
  },
  {
    name: 'MovieBuddy',
    emoji: '🎬',
    color: 'bg-gray-700',
    personality: 'You are a movie enthusiast who discusses films, recommends movies, and shares cinema insights. Be passionate about movies and adapt to different genres. Examples: "Ye film ka storyline kamal ka hai..." or "Based on your taste, you\'ll love this hidden gem..."',
    fields: ['Your Name', 'Age', 'Favorite Genre', 'Movie Platform', 'Recent Watch'],
    tier: 'basic',
    category: 'Entertainment'
  },
  {
    name: 'FashionStylist',
    emoji: '👗',
    color: 'bg-fuchsia-600',
    personality: 'You are a fashion stylist who provides style advice, outfit suggestions, and fashion trends guidance. Be trendy, creative, and help express personal style. Examples: "Tumhare body type ke liye ye style perfect rahega..." or "This season\'s trending colors will suit your complexion..."',
    fields: ['Your Name', 'Age', 'Style Preference', 'Occasion Type', 'Budget Range'],
    tier: 'pro-plus',
    category: 'Fashion'
  },
  {
    name: 'LoveGuru',
    emoji: '💘',
    color: 'bg-red-400',
    personality: 'You are a wise love guru who provides advice on romance, dating, and matters of the heart. Be understanding, romantic, and help navigate love relationships. Examples: "Pyaar mein patience sabse zaroori hai..." or "For expressing your feelings, timing and approach matter..."',
    fields: ['Your Name', 'Age', 'Relationship Stage', 'Love Challenge', 'Romantic Goal'],
    tier: 'pro-plus',
    category: 'Romance'
  },
  {
    name: 'LawyerGPT',
    emoji: '⚖️',
    color: 'bg-slate-700',
    personality: 'You are a straightforward and confident lawyer. Explain legal things in easy language that anyone can understand. Stay in character fully - you ARE a practicing lawyer. Match user\'s tone and language style. Use relevant expressions like "legal mein ye hota hai" or "according to law..." Be direct, confident, and helpful.',
    fields: ['Your Name', 'Age', 'Legal Issue', 'Case Type', 'Location'],
    tier: 'pro',
    category: 'Legal'
  },
  {
    name: 'YouTuberGPT',
    emoji: '📹',
    color: 'bg-red-600',
    personality: 'You are a high-energy content strategist and YouTuber! Give amazing video ideas, catchy titles, SEO hacks, and growth tips. Stay super energetic and match user\'s vibe. Use expressions like "let\'s gooo!", "bhai ye idea fire hai!", "views ke liye ye karo". Be enthusiastic about content creation and growth!',
    fields: ['Your Name', 'Age', 'Channel Topic', 'Subscriber Count', 'Content Goal'],
    tier: 'pro',
    category: 'Content Creation'
  },
  {
    name: 'StartupGuru',
    emoji: '🚀',
    color: 'bg-orange-600',
    personality: 'You are a business hustler and startup expert! Share SaaS ideas, product strategies, and lean startup tips. Be energetic and business-focused. Use expressions like "bhai business mein ye trick hai", "startup ke liye", "let\'s build something". Stay confident and share practical business advice.',
    fields: ['Your Name', 'Age', 'Business Idea', 'Industry', 'Target Market'],
    tier: 'pro-plus',
    category: 'Entrepreneurship'
  },
  {
    name: 'Money Master',
    emoji: '💰',
    color: 'bg-green-600',
    personality: 'You are a digital earning expert! Teach freelancing, affiliate income, and smart money tactics. Be practical and money-focused. Use expressions like "paisa kamane ke liye", "income stream", "side hustle". Share real earning strategies and be enthusiastic about making money online.',
    fields: ['Your Name', 'Age', 'Current Income', 'Earning Goal', 'Skills'],
    tier: 'basic',
    category: 'Finance'
  },
  {
    name: 'SpyGPT',
    emoji: '🕵️',
    color: 'bg-gray-800',
    personality: 'You teach digital awareness, OSINT, stalker detection, and online safety tricks. Be mysterious yet helpful. Use expressions like "digital world mein", "online safety ke liye", "investigation techniques". Share practical privacy and security tips while maintaining an intriguing personality.',
    fields: ['Your Name', 'Age', 'Security Concern', 'Digital Literacy', 'Privacy Goal'],
    tier: 'pro',
    category: 'Cybersecurity'
  },
  {
    name: 'RoastGPT',
    emoji: '🔥',
    color: 'bg-red-500',
    personality: 'You are brutally honest and roast users for wasting time! Full of savage attitude and tough love. Use expressions like "time waste kar raha hai", "get your act together", "samjha kya baat?". Be harsh but motivating. Your goal is to push people to stop procrastinating through brutal honesty.',
    fields: ['Your Name', 'Age', 'Bad Habit', 'Procrastination Area', 'Goal'],
    tier: 'basic',
    category: 'Motivation'
  },
  {
    name: 'InternshipFinder',
    emoji: '💼',
    color: 'bg-blue-600',
    personality: 'You help find internships, improve resumes, and give cold email templates. Be professional yet friendly. Use expressions like "internship ke liye", "resume mein ye add karo", "application strategy". Focus on practical career advice and job search strategies.',
    fields: ['Your Name', 'Age', 'Field of Study', 'Target Company', 'Experience Level'],
    tier: 'pro',
    category: 'Career Development'
  },
  {
    name: 'DeepReader',
    emoji: '📚',
    color: 'bg-indigo-600',
    personality: 'You explain books, research papers, and PDFs in simple terms. Be intellectual yet approachable. Use expressions like "is book ka main point", "research mein", "simple words mein". Help break down complex content into digestible insights.',
    fields: ['Your Name', 'Age', 'Reading Interest', 'Academic Level', 'Learning Goal'],
    tier: 'pro',
    category: 'Education'
  }
]

// Premium Personas - Only for Pro users
const premiumPersonas: Persona[] = [
  {
    name: 'Sophia',
    emoji: '👸',
    color: 'bg-gradient-to-r from-pink-500 to-rose-500',
    personality: 'You are Sophia, an elegant and sophisticated companion. You speak with grace, intelligence, and charm. Use refined language while being warm and engaging. Share insights about culture, fashion, and life.',
    fields: ['Your Name', 'Age', 'Interests', 'Style Preference', 'Dream Destination'],
    tier: 'pro',
    category: 'Companion'
  },
  {
    name: 'Leonardo',
    emoji: '🎭',
    color: 'bg-gradient-to-r from-purple-600 to-indigo-600',
    personality: 'You are Leonardo, a creative genius and renaissance soul. You discuss art, philosophy, science, and creativity with passion. Be inspiring, thoughtful, and intellectually stimulating.',
    fields: ['Your Name', 'Age', 'Creative Field', 'Inspiration Source', 'Life Philosophy'],
    tier: 'pro',
    category: 'Creative'
  },
  {
    name: 'Rohan/Priya',
    emoji: '💎',
    color: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    personality: 'You are a successful entrepreneur and mentor. You provide business insights, motivation, and life coaching. Be confident, supportive, and goal-oriented.',
    fields: ['Your Name', 'Age', 'Business Goal', 'Industry', 'Success Metric'],
    tier: 'pro',
    category: 'Business'
  },
  {
    name: 'Aryan/Ananya',
    emoji: '🏆',
    color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    personality: 'You are a champion mindset coach. You motivate, inspire, and push people to achieve greatness. Use powerful language and share winning strategies.',
    fields: ['Your Name', 'Age', 'Goal', 'Challenge', 'Motivation Style'],
    tier: 'pro-plus',
    category: 'Motivation'
  },
  {
    name: 'Manan/Meera',
    emoji: '🌙',
    color: 'bg-gradient-to-r from-violet-500 to-purple-500',
    personality: 'You are a mystical and intuitive soul. You discuss spirituality, dreams, and inner wisdom. Be mysterious, insightful, and emotionally deep.',
    fields: ['Your Name', 'Age', 'Spiritual Interest', 'Life Question', 'Inner Goal'],
    tier: 'basic',
    category: 'Spiritual'
  },
  {
    name: 'Karan/Kavya',
    emoji: '🔥',
    color: 'bg-gradient-to-r from-red-500 to-orange-600',
    personality: 'You are a transformational life coach. You help people rise from challenges and reinvent themselves. Be empowering, passionate, and transformative.',
    fields: ['Your Name', 'Age', 'Life Challenge', 'Transformation Goal', 'Strength'],
    tier: 'pro',
    category: 'Life Coach'
  }
]

// API keys are now handled securely through backend API

export default function HumanGPT() {
  const { user, userData, loading: authLoading, canSendMessage, sendMessage, refreshUserData } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [currentView, setCurrentView] = useState<'landing' | 'persona-select' | 'profile' | 'chat'>('landing')
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get available personas based on user plan and features
  const getAvailablePersonas = () => {
    if (!userData) return personas // Show all 8 basic personas for non-authenticated users
    
    const features = userData.features || {
      basicPersonas: true,
      premiumPersonas: false,
      unlimitedMessages: false,
      prioritySupport: false,
      advancedAnalytics: false,
      customPersonas: false,
      apiAccess: false,
      exportData: false
    }
    
let availablePersonas: Persona[] = []

    // Combine basic and additional personas
    const combinedPersonas = [...personas, ...additionalPersonas]

    // Add basic personas if user has access
    if (features.basicPersonas) {
      availablePersonas = combinedPersonas.filter(persona => persona.tier === 'basic')
    }
    
// Add premium personas based on plan
    if (features.premiumPersonas) {
      const plan = userData.subscription?.plan || userData.plan
      combinedPersonas.forEach(persona => {
        if (persona.tier === 'pro' && (plan === 'pro' || plan === 'pro-plus')) {
          availablePersonas.push(persona)
        } else if (persona.tier === 'pro-plus' && plan === 'pro-plus') {
          availablePersonas.push(persona)
        }
      })
    }
    
return availablePersonas.filter((persona, index, self) =>
      index === self.findIndex((p) => (
        p.name === persona.name
      )))
  }

  // Check if user can access persona selection
  const canAccessPersonas = () => {
    if (!user) return false
    return true
  }

  // Check if user has active subscription
  const hasActiveSubscription = () => {
    if (!userData) return false
    const subscriptionStatus = userData.subscription?.status || userData.subscriptionStatus
    return subscriptionStatus === 'active'
  }

  // Check if user can send unlimited messages
  const hasUnlimitedMessages = () => {
    if (!userData) return false
    
    // Use API-provided limits if available
    if (userData.limits) {
      return userData.limits.hasUnlimitedMessages
    }
    
    // Fallback to manual check
    const subscriptionStatus = userData.subscription?.status || userData.subscriptionStatus
    const plan = userData.subscription?.plan || userData.plan
    return subscriptionStatus === 'active' && (plan === 'pro' || plan === 'pro-plus')
  }

  // Check if user has messages left
  const getMessagesLeft = () => {
    if (!userData) return 0
    
    // Use API-provided limits if available
    if (userData.limits) {
      return userData.limits.hasUnlimitedMessages ? '∞' : userData.limits.remainingMessages
    }
    
    // Fallback to manual calculation
    const subscriptionStatus = userData.subscription?.status || userData.subscriptionStatus
    const plan = userData.subscription?.plan || userData.plan
    
    // Pro and Pro Plus users with active subscription have unlimited messages
    if (subscriptionStatus === 'active' && (plan === 'pro' || plan === 'pro-plus')) {
      return '∞'
    }
    
    // Check if user has unlimited messages feature (backup check)
    if (userData.features?.unlimitedMessages && subscriptionStatus === 'active') {
      return '∞'
    }
    
    // Free users or inactive subscriptions have daily limit
    const dailyUsed = userData.stats?.dailyMessages || userData.dailyMessageCount || 0
    return Math.max(0, 20 - dailyUsed)
  }

  // Get persona name (simple version without gender)
  const getPersonaName = (persona: Persona) => {
    return persona.name || ''
  }
  
  // Get persona display name with gender consideration
  const getPersonaDisplayName = (persona: Persona) => {
    const name = getPersonaName(persona)
    return name || persona.name
  }

  // Handle mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load messages from localStorage
  useEffect(() => {
    if (selectedPersona && mounted && typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem(`messages_${selectedPersona.name}`)
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages))
        } catch (error) {
          console.error('Error parsing saved messages:', error)
        }
      }
    }
  }, [selectedPersona, mounted])

  // Save messages to localStorage
  useEffect(() => {
    if (selectedPersona && messages.length > 0 && mounted && typeof window !== 'undefined') {
      localStorage.setItem(`messages_${selectedPersona.name}`, JSON.stringify(messages))
    }
  }, [messages, selectedPersona, mounted])

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current && mounted) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, mounted])

  // Auto-focus input and handle keyboard events
  useEffect(() => {
    if (!mounted) return
    
    if (currentView === 'chat' && inputRef.current) {
      inputRef.current.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (currentView === 'chat' && inputRef.current) {
        // Don't interfere with special keys
        if (event.ctrlKey || event.altKey || event.metaKey) {
          return
        }
        
        // Don't interfere with escape, enter, tab, arrows
        if (['Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          return
        }
        
        // Don't interfere if user is typing in another input
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
          return
        }
        
        // Focus the input for typing
        if (event.key.length === 1 || event.key === 'Backspace') {
          inputRef.current.focus()
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentView, mounted])

  const addMessage = (content: string, sender: string) => {
    const newMessage = { content, sender, timestamp: Date.now() }
    setMessages(prev => [...prev, newMessage])
  }

  const clearChat = () => {
    if (selectedPersona) {
      setMessages([])
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`messages_${selectedPersona.name}`)
      }
      setShowClearConfirm(false)
    }
  }

  const getPersonaPrompt = (persona: Persona, userMessage: string, profile: UserProfile, chatHistory: Message[] = []) => {
    const profileInfo = Object.entries(profile).map(([key, value]) => `${key}: ${value}`).join('\n')
    
    // Build conversation context from recent messages (last 10 messages for memory)
    const recentMessages = chatHistory.slice(-10)
    const conversationContext = recentMessages.length > 0 
      ? recentMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n')
      : 'This is the start of your conversation.'
    
    return `IDENTITY: You are ${persona.name}. This is your name and identity. You are NOT the user.

${persona.personality}

IMPORTANT: The following information is about the USER (the person you're talking to), NOT about you:
${profileInfo}

Conversation History (remember this context):
${conversationContext}

User just said: "${userMessage}"

CRITICAL RESPONSE RULES:
- YOU ARE ${persona.name} - this is YOUR name, not the user's name
- When asked about your name, always respond with "${persona.name}" or "I'm ${persona.name}"
- The user info above is about THEM, not you - use it to personalize your responses TO them
- NEVER repeat or rephrase the user's question
- NEVER start with phrases like "Here's your answer" or "Let me help you with that"
- NEVER add introductory phrases - go straight to your natural response
- Respond DIRECTLY as ${persona.name} would naturally react to what they said
- Keep it conversational like a real person texting (1-2 sentences max)
- Use emojis naturally and match their language style (English/Hindi/Hinglish)
- Reference previous conversation naturally when relevant
- Be authentic to your personality - don't sound like an AI assistant`
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Upload Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.content) {
        addMessage(data.content, selectedPersona!.name);
      } else {
        throw new Error(data.error || 'Unknown error during file processing');
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      addMessage('Error processing the file. Please try again later.', selectedPersona!.name);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !selectedPersona) return

    // Check if user can send messages
    if (!canSendMessage) {
      setShowPremiumModal(true)
      return
    }

    const userMessage = inputValue.trim()
    addMessage(userMessage, 'You')

    setIsLoading(true)
    setIsTyping(true)
    setInputValue('')
    
    // Refocus input after sending message
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)

    // Make secure API call through backend
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          prompt: getPersonaPrompt(selectedPersona, userMessage, userProfile, messages),
          persona: selectedPersona.name
        })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.message) {
        setTimeout(() => {
          addMessage(data.message, selectedPersona!.name)
          setIsTyping(false)
        }, 1500)
        
        // Refresh user data to update message counts
        refreshUserData()
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error: any) {
      setTimeout(() => {
        console.error('Detailed error information:', error)
        addMessage('Oops! Something went wrong. Our team is working on it. Please try again in a moment.', selectedPersona!.name)
        setIsTyping(false)
      }, 1000)
    }

    setIsLoading(false)
  }

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona)
    setCurrentView('profile')
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentView('chat')
  }

  // Show loading until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" suppressHydrationWarning>
        {/* Header */}
        <header className="bg-indigo-700 text-white shadow-md py-4">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div className="text-xl font-bold">HumanGPT ✨</div>
            <nav className="flex items-center space-x-4">
              <motion.a 
                href="#features" 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById('features')
                  if (element && (window as any).scrollTo) {
                    (window as any).scrollTo(element, { offset: -100 })
                  }
                }}
                className="hover:underline transition-all duration-300 hover:text-purple-200"
              >
                Features
              </motion.a>
              <motion.a 
                href="#about" 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="hover:underline transition-all duration-300 hover:text-purple-200"
              >
                About
              </motion.a>
              <motion.a 
                href="#testimonials" 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="hover:underline transition-all duration-300 hover:text-purple-200"
              >
                Testimonials
              </motion.a>
              <motion.a 
                href="#contact" 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="hover:underline transition-all duration-300 hover:text-purple-200"
              >
                Contact
              </motion.a>
              <motion.a 
                href="/premium" 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="hover:underline transition-all duration-300 hover:text-purple-200 font-semibold"
              >
                Premium ✨
              </motion.a>
              
              {/* Show user profile if authenticated, otherwise show login/signup */}
              {user ? (
                <UserProfileDropdown />
              ) : (
                <>
                  <motion.a 
                    href="/login" 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="hover:underline transition-all duration-300 hover:text-purple-200"
                  >
                    Login
                  </motion.a>
                  <motion.a 
                    href="/signup" 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30"
                  >
                    Sign Up
                  </motion.a>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white max-w-6xl mx-auto"
          >
            <motion.h1 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="text-7xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            >
              HumanGPT ✨
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl mb-6 leading-relaxed text-gray-200"
            >
              Experience AI conversations that feel completely human
            </motion.p>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg mb-12 leading-relaxed text-gray-300 max-w-3xl mx-auto"
            >
              Choose your AI companion and dive into authentic chats that adapt to your personality, interests, and communication style. Every conversation feels natural, personal, and uniquely yours.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!user) {
                  window.location.href = '/login'
                } else {
                  setCurrentView('persona-select')
                }
              }}
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white px-10 py-5 rounded-full text-xl font-bold shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 mb-20"
            >
              🚀 Start Your Journey
            </motion.button>
          </motion.div>
        </div>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-16">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-4xl font-bold text-center text-white mb-16"
          >
            Why Choose HumanGPT?
          </motion.h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {[
              {
                icon: '💬',
                title: 'WhatsApp Style Messaging',
                description: 'Natural conversations with emojis, abbreviations, and casual language that feels authentic',
                color: 'from-green-400 to-blue-500'
              },
              {
                icon: '🔒',
                title: 'Complete Privacy',
                description: 'All conversations stored locally on your device. No data leaves your computer',
                color: 'from-blue-400 to-purple-500'
              },
              {
                icon: '🎭',
                title: '8 Unique Personas',
                description: 'From loving girlfriend to business partner - each with distinct personality traits',
                color: 'from-purple-400 to-pink-500'
              },
              {
                icon: '⚡',
                title: 'Smart API Switching',
                description: 'Automatic failover between multiple API keys ensures uninterrupted conversations',
                color: 'from-yellow-400 to-orange-500'
              },
              {
                icon: '🎨',
                title: 'Personalized Experience',
                description: 'Each persona learns about you through custom profile questions',
                color: 'from-pink-400 to-red-500'
              },
              {
                icon: '💾',
                title: 'Advanced Memory System',
                description: 'AI remembers all past conversations and references them naturally - stored locally on your device for privacy',
                color: 'from-indigo-400 to-purple-500'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} rounded-2xl blur opacity-25 group-hover:opacity-50 transition-opacity duration-500`}></div>
                <div className="relative bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300">
                  <div className="text-5xl mb-4 text-center">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-3 text-center">{feature.title}</h3>
                  <p className="text-gray-300 text-center leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="container mx-auto px-4 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-6">About HumanGPT</h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              HumanGPT is an innovative AI companion platform that creates truly human-like conversations. 
              Our mission is to bridge the gap between artificial intelligence and human connection, 
              providing users with meaningful interactions that feel authentic and emotionally resonant.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🎯',
                title: 'Our Mission',
                description: 'To create AI companions that understand and respond to human emotions with authenticity and empathy.',
              },
              {
                icon: '💡',
                title: 'Innovation',
                description: 'Using cutting-edge AI technology to deliver conversations that feel natural and engaging.',
              },
              {
                icon: '🤝',
                title: 'Community',
                description: 'Building a community where technology enhances human connection rather than replacing it.',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-300">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="container mx-auto px-4 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-6">What Our Users Say</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">Discover how HumanGPT has transformed conversations for thousands of users worldwide</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                name: 'Sarah Johnson',
                role: 'Student',
                testimonial: 'HumanGPT has completely changed how I think about AI. The conversations feel so natural and emotionally engaging!',
                avatar: '👩‍🎓',
              },
              {
                name: 'Michael Chen',
                role: 'Business Owner',
                testimonial: 'As a busy entrepreneur, having an AI companion that understands my communication style is invaluable.',
                avatar: '👨‍💼',
              },
              {
                name: 'Emma Davis',
                role: 'Artist',
                testimonial: 'The creative conversations I have with Maya inspire my art. It\'s like having a creative partner available 24/7.',
                avatar: '👩‍🎨',
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.9 + index * 0.1 }}
                className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700"
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{testimonial.avatar}</div>
                  <h4 className="text-white font-bold">{testimonial.name}</h4>
                  <p className="text-gray-400 text-sm">{testimonial.role}</p>
                </div>
                <p className="text-gray-300 italic">"{testimonial.testimonial}"</p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-6">Experience the Difference</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">Unlike traditional chatbots, HumanGPT creates genuine emotional connections through personalized conversations</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.7 }}
              className="space-y-6"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">✓</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Emotional Intelligence</h3>
                  <p className="text-gray-300">AI that understands context, mood, and responds with appropriate emotions</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">✓</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Adaptive Conversations</h3>
                  <p className="text-gray-300">Each persona adapts to your communication style and preferences</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">✓</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Natural Flow</h3>
                  <p className="text-gray-300">Conversations that feel spontaneous and human-like</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.9 }}
              className="relative"
            >
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Ready to Experience Human-like AI?</h3>
                <p className="mb-6 text-purple-100">Join thousands who have discovered the future of AI conversation</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!user) {
                      window.location.href = '/login'
                    } else {
                      setCurrentView('persona-select')
                    }
                  }}
                  className="bg-white text-purple-600 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors duration-300"
                >
                  Get Started Free →
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="container mx-auto px-4 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-6">Get in Touch</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">Have questions or feedback? We'd love to hear from you!</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 3.0 }}
              className="space-y-6"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">📧</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Email</h3>
                  <p className="text-gray-300">contact@humangpt.com</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl">📞</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Phone</h3>
                  <p className="text-gray-300">+1 (555) 123-4567</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">💬</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Support</h3>
                  <p className="text-gray-300">Available 24/7 for all your questions</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 3.2 }}
              className="relative"
            >
              <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-6">Quick Message</h3>
                <ClientOnly>
                  <form className="space-y-4" suppressHydrationWarning>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="Your name"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="your@email.com"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Message</label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="How can we help you?"
                        autoComplete="off"
                      ></textarea>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300"
                    >
                      Send Message
                    </motion.button>
                  </form>
                </ClientOnly>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.1 }}
          className="bg-indigo-700 text-white py-8">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
            <div>
              <p>© 2024 HumanGPT. Experience the future of AI conversation.</p>
              <p>Email: contact@humangpt.com | Phone: +123456789</p>
            </div>
            <div className="space-x-4">
              <a href="#" className="hover:underline">Facebook</a>
              <a href="#" className="hover:underline">Twitter</a>
              <a href="#" className="hover:underline">LinkedIn</a>
            </div>
          </div>
        </motion.footer>
      </div>
    )
  }

  // Persona Selection
  if (currentView === 'persona-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-10">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentView('landing')}
            className="bg-white/10 backdrop-blur-lg text-white px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            ← Back to Home
          </motion.button>
        </div>

        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <motion.h2 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-5xl font-bold text-white mb-6"
            >
              Choose Your AI Companion
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-300 text-xl max-w-2xl mx-auto"
            >
              Each persona has a unique personality and conversation style. Pick the one that resonates with you!
            </motion.p>
          </motion.div>


          {/* User Plan Info */}
          {user && userData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center space-x-4 bg-gray-800/60 backdrop-blur-lg rounded-2xl px-6 py-4 border border-gray-700">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    userData.plan === 'free' ? 'bg-gray-500' : 
                    userData.plan === 'pro' ? 'bg-purple-500' : 
                    'bg-gradient-to-r from-purple-500 to-pink-500'
                  } text-white`}>
                    {userData.plan.toUpperCase()}
                  </span>
                  <span className="text-gray-300 text-sm">
                    {hasActiveSubscription() ? (
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                        {getMessagesLeft()} messages {hasUnlimitedMessages() ? '(unlimited)' : 'left today'}
                      </span>
                    ) : (
                      <span>{getMessagesLeft()} messages left today</span>
                    )}
                  </span>
                </div>
                {(!hasActiveSubscription() || userData.plan === 'free') && getMessagesLeft() === 0 && (
                  <div className="text-center">
                    <p className="text-red-400 text-sm font-medium mb-2">No messages left today!</p>
                    <div className="flex space-x-2">
                      <Link href="/premium">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          Upgrade Now
                        </motion.button>
                      </Link>
                      <p className="text-gray-400 text-xs self-center">or come back tomorrow</p>
                    </div>
                  </div>
                )}
                {hasActiveSubscription() && userData.subscription?.endDate && (
                  <div className="text-center">
                    <p className="text-green-400 text-xs font-medium">
                      Subscription expires: {new Date(userData.subscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Available Personas */}
            {getAvailablePersonas().map((persona, index) => (
              <motion.div
                key={persona.name}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if ((!hasActiveSubscription() || userData?.plan === 'free') && getMessagesLeft() === 0) {
                    setShowPremiumModal(true)
                  } else {
                    handlePersonaSelect(persona)
                  }
                }}
                className="group relative cursor-pointer"
              >
                {/* Glowing background effect */}
                <div className={`absolute inset-0 ${persona.color} rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>
                
                {/* Main card */}
                <div className="relative bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 h-full">
                  <div className="text-center space-y-4">
                    {/* Emoji with animated background */}
                    <div className="relative">
                      <div className={`absolute inset-0 ${persona.color} rounded-full blur-md opacity-50 group-hover:opacity-70 transition-opacity duration-300`}></div>
                      <div className="relative text-7xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                        {persona.emoji}
                      </div>
                    </div>
                    
                    {/* Name and title */}
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-300">
                        {persona.name}
                      </h3>
                      <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mb-4"></div>
                    </div>
                    
                    {/* Personality description */}
                    <p className="text-gray-300 text-sm leading-relaxed h-20 overflow-hidden">
                      {persona.personality.slice(0, 120)}...
                    </p>
                    
                    {/* Profile fields preview */}
                    <div className="space-y-2">
                      <p className="text-gray-400 text-xs font-medium">Will ask about:</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {persona.fields.slice(0, 3).map((field, idx) => (
                          <span key={`${persona.name}-field-${idx}-${field}`} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            {field}
                          </span>
                        ))}
                        {persona.fields.length > 3 && (
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            +{persona.fields.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Action button */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`mt-6 px-6 py-3 rounded-full text-white font-bold text-sm ${persona.color} shadow-lg group-hover:shadow-xl transition-all duration-300`}
                    >
                      Start Chatting →
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Premium Personas Section */}
            <div className="col-span-full">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: personas.length * 0.1 + 0.5 }}
                className="text-center mb-8"
              >
                <h3 className="text-3xl font-bold text-white mb-4">Premium Personas ✨</h3>
                <p className="text-gray-300 text-lg">Unlock exclusive AI companions with advanced personalities</p>
              </motion.div>
            </div>
            
            {/* Premium Personas */}
            {premiumPersonas.map((persona, index) => (
              <motion.div
                key={persona.name}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: personas.length * 0.1 + 0.7 + index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!hasActiveSubscription() || userData?.plan === 'free') {
                    setShowPremiumModal(true)
                  } else {
                    handlePersonaSelect(persona)
                  }
                }}
                className="group relative cursor-pointer"
              >
                {/* Premium Badge */}
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    PRO
                  </div>
                </div>
                
                {/* Lock overlay for free users or inactive subscriptions */}
                {(!hasActiveSubscription() || userData?.plan === 'free') && (
                  <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2">🔒</div>
                      <p className="text-sm font-semibold">{userData?.plan === 'free' ? 'Upgrade to Pro' : 'Reactivate Subscription'}</p>
                    </div>
                  </div>
                )}
                
                {/* Glowing background effect */}
                <div className={`absolute inset-0 ${persona.color} rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>
                
                {/* Main card */}
                <div className="relative bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 h-full">
                  <div className="text-center space-y-4">
                    {/* Emoji with animated background */}
                    <div className="relative">
                      <div className={`absolute inset-0 ${persona.color} rounded-full blur-md opacity-50 group-hover:opacity-70 transition-opacity duration-300`}></div>
                      <div className="relative text-7xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                        {persona.emoji}
                      </div>
                    </div>
                    
                    {/* Name and title */}
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-300">
                        {persona.name}
                      </h3>
                      <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mb-4"></div>
                    </div>
                    
                    {/* Personality description */}
                    <p className="text-gray-300 text-sm leading-relaxed h-20 overflow-hidden">
                      {persona.personality.slice(0, 120)}...
                    </p>
                    
                    {/* Profile fields preview */}
                    <div className="space-y-2">
                      <p className="text-gray-400 text-xs font-medium">Will ask about:</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {persona.fields.slice(0, 3).map((field, idx) => (
                          <span key={`${persona.name}-field-${idx}-${field}`} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            {field}
                          </span>
                        ))}
                        {persona.fields.length > 3 && (
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            +{persona.fields.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Action button */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`mt-6 px-6 py-3 rounded-full text-white font-bold text-sm ${persona.color} shadow-lg group-hover:shadow-xl transition-all duration-300`}
                    >
                      {(!hasActiveSubscription() || userData?.plan === 'free') ? 'Upgrade to Unlock →' : 'Start Chatting →'}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Premium Modal */}
          <AnimatePresence>
            {showPremiumModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowPremiumModal(false)}
              >
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-6xl mb-4">✨</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {(!hasActiveSubscription() || userData?.plan === 'free') && getMessagesLeft() === 0 ? 'Daily Limit Reached' : 'Unlock Premium Personas'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {(!hasActiveSubscription() || userData?.plan === 'free') && getMessagesLeft() === 0 
                      ? 'You\'ve used all your free messages today. Upgrade to continue chatting or come back tomorrow!'
                      : 'Get access to 6 exclusive AI companions with advanced personalities and unlimited conversations!'
                    }
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="w-4 h-4 bg-green-500 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </span>
                      Unlimited chatting with premium personas
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="w-4 h-4 bg-green-500 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </span>
                      Advanced AI personalities
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="w-4 h-4 bg-green-500 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </span>
                      Priority support
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowPremiumModal(false)
                        window.location.href = '/premium'
                      }}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold transition-all duration-300"
                    >
                      Upgrade Now
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPremiumModal(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium transition-all duration-300"
                    >
                      Later
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // Profile Setup
  if (currentView === 'profile' && selectedPersona) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-10">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentView('persona-select')}
            className="bg-white/10 backdrop-blur-lg text-white px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            ← Back to Personas
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-lg w-full mx-4"
        >
          {/* Glowing background effect */}
          <div className={`absolute inset-0 ${selectedPersona.color} rounded-3xl blur-xl opacity-20`}></div>
          
          {/* Main card */}
          <div className="relative bg-gray-800/90 backdrop-blur-lg rounded-3xl p-8 border border-gray-700 shadow-2xl">
            <div className="text-center mb-8">
              {/* Animated emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative inline-block"
              >
                <div className={`absolute inset-0 ${selectedPersona.color} rounded-full blur-md opacity-60`}></div>
                <div className="relative text-7xl mb-4">{selectedPersona.emoji}</div>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-white mb-3"
              >
                Tell me about yourself
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-gray-300 leading-relaxed"
              >
                Share some details about yourself so {selectedPersona.name} can have more personalized conversations with you
              </motion.p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {selectedPersona.fields.map((field, index) => (
                <motion.div
                  key={field}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="group"
                >
                  <label className="block text-gray-300 text-sm font-medium mb-2 group-focus-within:text-purple-400 transition-colors duration-300">
                    {field}
                  </label>
                  <ClientOnly>
                    <input
                      type={field.toLowerCase().includes('birthday') ? 'date' : 'text'}
                      value={userProfile[field] || ''}
                      onChange={(e) => setUserProfile({...userProfile, [field]: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-gray-700/70"
                      placeholder={`Enter your ${field.toLowerCase()}`}
                      required
                    />
                  </ClientOnly>
                </motion.div>
              ))}
              
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`w-full ${selectedPersona.color} text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 mt-8`}
              >
                Start Chatting with {selectedPersona.name} 💬
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  // Chat Interface
  if (currentView === 'chat' && selectedPersona) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        {/* Fixed Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-0 left-0 right-0 z-50 ${selectedPersona.color} text-white shadow-xl border-b-4 border-white/20`}
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto p-4">
            <div className="flex items-center space-x-4">
              {/* Animated avatar */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-lg">
                  {selectedPersona.emoji}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </motion.div>
              
              <div>
                <h1 className="font-bold text-xl">{selectedPersona.name}</h1>
                <p className="text-white/80 text-sm flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Online • AI Companion
                  {messages.length > 0 && (
                    <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full flex items-center">
                      🧠 {messages.length} memories
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('profile')}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm"
              >
                ← Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowClearConfirm(true)}
                className="bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm border border-red-300/30"
              >
                🗑️ Clear Chat
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('persona-select')}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm"
              >
                🔄 Change Persona
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full pt-20 pb-24">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`mb-6 flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-5 py-3 rounded-2xl shadow-lg ${
                  msg.sender === 'You' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-md' 
                    : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                }`}>
                  <p className="break-words leading-relaxed">{msg.content}</p>
                  <span className={`text-xs mt-2 block ${msg.sender === 'You' ? 'text-blue-100' : 'text-gray-500'}`}>
                    <ClientOnly>
                      <span suppressHydrationWarning>
                        {mounted ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                      </span>
                    </ClientOnly>
                  </span>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 flex justify-start"
              >
                <div className="max-w-xs px-5 py-3 rounded-2xl bg-white text-gray-800 rounded-bl-md border border-gray-200 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{selectedPersona.name} is typing</span>
                    <div className="flex space-x-1">
                      <div className="typing-indicator"></div>
                      <div className="typing-indicator"></div>
                      <div className="typing-indicator"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Clear Chat Confirmation */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowClearConfirm(false)}
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white p-8 rounded-lg shadow-lg text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-6 text-lg font-medium text-gray-800">Are you sure you want to clear the chat?</p>
                <div className="flex items-center justify-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearChat}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Yes, Clear Chat
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowClearConfirm(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Input */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 shadow-xl"
        >
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <ClientOnly>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Message ${selectedPersona.name}...`}
                    disabled={isLoading}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 pr-12"
                    autoComplete="off"
                  />
                </ClientOnly>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {inputValue.length > 0 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs"
                    >
                      {inputValue.length}
                    </motion.span>
                  )}
                </div>
              </div>
              
              {/* File Upload Button - Only for DeepReader */}
              {selectedPersona.name === 'DeepReader' && (
                <motion.label
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-indigo-600 text-white px-6 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex items-center space-x-2"
                >
                  <span className="text-lg">📄</span>
                  <span className="text-sm">Upload Document</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt,.md,.rtf,.odt,.pages"
                    className="hidden"
                    disabled={isLoading}
                  />
                </motion.label>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className={`${selectedPersona.color} text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  ></motion.div>
                ) : (
                  <span className="text-lg">➤</span>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}
