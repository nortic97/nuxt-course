import { firestoreClient } from '../layers/base/server/utils/firebase.client'
import { Timestamp } from 'firebase-admin/firestore'
import { generateId, validateId } from '../layers/base/server/utils/firestore.helpers'

// Tipos para los datos de chat
interface ChatData {
  id?: string
  title: string
  userId: string
  agentId: string
  isActive: boolean
  createdAt: Date | Timestamp
  updatedAt: Date | Timestamp
}

interface MessageData {
  id?: string
  chatId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  metadata?: Record<string, unknown>
  createdAt: Date | Timestamp
}

// Tipos para los datos de inicialización
interface SeedData {
  categories: Array<{
    id?: string
    name: string
    description: string
    icon?: string
    order?: number
  }>
  agents: Array<{
    id?: string
    name: string
    description: string
    price: number
    categoryName: string // Usamos el nombre para referenciar la categoría
    model: string
    capabilities: string[]
    systemPrompt: string
    temperature?: number
    maxTokens?: number
    isFree: boolean
    icon?: string
    tags?: string[]
  }>
}

// Datos de inicialización
const seedData: SeedData = {
  categories: [
    {
      name: 'Asistentes Generales',
      description: 'Asistentes para tareas generales y productividad',
      icon: 'i-heroicons-chat-bubble-left-right',
      order: 1
    },
    {
      name: 'Desarrollo',
      description: 'Asistentes para programación y desarrollo de software',
      icon: 'i-heroicons-code-bracket',
      order: 2
    },
    {
      name: 'Diseño',
      description: 'Asistentes para diseño gráfico y UX/UI',
      icon: 'i-heroicons-paint-brush',
      order: 3
    },
    {
      name: 'Marketing',
      description: 'Asistentes para marketing digital y redes sociales',
      icon: 'i-heroicons-megaphone',
      order: 4
    },
    {
      name: 'Negocios',
      description: 'Asistentes para gestión empresarial y análisis',
      icon: 'i-heroicons-briefcase',
      order: 5
    },
    {
      name: 'Educación',
      description: 'Asistentes para aprendizaje y enseñanza',
      icon: 'i-heroicons-academic-cap',
      order: 6
    },
    {
      name: 'Salud y Bienestar',
      description: 'Asistentes para salud mental y física',
      icon: 'i-heroicons-heart',
      order: 7
    },
    {
      name: 'Creatividad',
      description: 'Asistentes para escritura, arte y generación de ideas',
      icon: 'i-heroicons-sparkles',
      order: 8
    }
  ],
  agents: [
    // Asistentes Generales
    {
      name: 'Asistente Personal',
      description: 'Ayuda con tareas diarias, organización y productividad',
      price: 0,
      categoryName: 'Asistentes Generales',
      model: 'gpt-4-turbo',
      capabilities: ['text', 'planning'],
      systemPrompt: 'Eres un asistente personal útil que ayuda con tareas diarias, organización y productividad.',
      temperature: 0.7,
      maxTokens: 2000,
      isFree: true,
      icon: 'i-heroicons-user',
      tags: ['productividad', 'organización']
    },
    {
      name: 'Traductor Profesional',
      description: 'Traducción precisa entre múltiples idiomas',
      price: 0,
      categoryName: 'Asistentes Generales',
      model: 'gpt-4-turbo',
      capabilities: ['translation', 'languages'],
      systemPrompt: 'Eres un traductor profesional que proporciona traducciones precisas y naturales entre múltiples idiomas.',
      temperature: 0.3,
      maxTokens: 2000,
      isFree: true,
      icon: 'i-heroicons-language',
      tags: ['idiomas', 'traducción']
    },

    // Desarrollo
    {
      name: 'Experto en JavaScript',
      description: 'Especialista en desarrollo con JavaScript, Node.js y frameworks modernos',
      price: 9.99,
      categoryName: 'Desarrollo',
      model: 'gpt-4-turbo',
      capabilities: ['code', 'debugging', 'explanation'],
      systemPrompt: 'Eres un experto desarrollador de JavaScript que ayuda con código, depuración y mejores prácticas.',
      temperature: 0.3,
      maxTokens: 2000,
      isFree: false,
      icon: 'i-logos-javascript',
      tags: ['javascript', 'nodejs', 'frontend']
    },
    {
      name: 'Especialista en Python',
      description: 'Experto en Python, análisis de datos y automatización',
      price: 9.99,
      categoryName: 'Desarrollo',
      model: 'gpt-4-turbo',
      capabilities: ['code', 'data-analysis', 'automation'],
      systemPrompt: 'Eres un experto en Python especializado en análisis de datos, automatización y desarrollo backend.',
      temperature: 0.3,
      maxTokens: 2000,
      isFree: false,
      icon: 'i-logos-python',
      tags: ['python', 'data-science', 'backend']
    },

    // Diseño
    {
      name: 'Diseñador UX/UI',
      description: 'Experto en diseño de interfaces de usuario y experiencia de usuario',
      price: 14.99,
      categoryName: 'Diseño',
      model: 'gpt-4-vision',
      capabilities: ['design', 'feedback', 'wireframing'],
      systemPrompt: 'Eres un diseñador UX/UI experimentado que ayuda a crear interfaces intuitivas y atractivas.',
      temperature: 0.5,
      maxTokens: 2000,
      isFree: false,
      icon: 'i-heroicons-paint-brush',
      tags: ['ux', 'ui', 'diseño']
    },
    {
      name: 'Diseñador Gráfico',
      description: 'Especialista en creación de elementos visuales y branding',
      price: 12.99,
      categoryName: 'Diseño',
      model: 'dall-e-3',
      capabilities: ['graphic-design', 'branding', 'illustration'],
      systemPrompt: 'Eres un diseñador gráfico creativo que ayuda a crear identidades visuales impactantes.',
      temperature: 0.7,
      maxTokens: 1000,
      isFree: false,
      icon: 'i-heroicons-pencil',
      tags: ['diseño-gráfico', 'branding', 'ilustración']
    },

    // Marketing
    {
      name: 'Estratega de Redes',
      description: 'Especialista en estrategias de marketing en redes sociales',
      price: 12.99,
      categoryName: 'Marketing',
      model: 'gpt-4-turbo',
      capabilities: ['content', 'strategy', 'analysis'],
      systemPrompt: 'Eres un estratega de marketing digital experto en redes sociales y crecimiento de audiencia.',
      temperature: 0.6,
      maxTokens: 2000,
      isFree: false,
      icon: 'i-heroicons-share',
      tags: ['marketing', 'redes', 'estrategia']
    },
    {
      name: 'Experto en SEO',
      description: 'Especialista en optimización para motores de búsqueda',
      price: 14.99,
      categoryName: 'Marketing',
      model: 'gpt-4-turbo',
      capabilities: ['seo', 'analysis', 'content-optimization'],
      systemPrompt: 'Eres un experto en SEO que ayuda a mejorar el posicionamiento web y el tráfico orgánico.',
      temperature: 0.4,
      maxTokens: 2000,
      isFree: false,
      icon: 'i-heroicons-magnifying-glass',
      tags: ['seo', 'marketing', 'contenido']
    },

    // Negocios
    {
      name: 'Consultor Empresarial',
      description: 'Asesor experto en estrategias de negocio y crecimiento',
      price: 19.99,
      categoryName: 'Negocios',
      model: 'gpt-4-turbo',
      capabilities: ['analysis', 'planning', 'strategy'],
      systemPrompt: 'Eres un consultor empresarial experimentado que ayuda a las empresas a crecer y optimizar sus operaciones.',
      temperature: 0.4,
      maxTokens: 2000,
      isFree: false,
      icon: 'i-heroicons-chart-bar',
      tags: ['negocios', 'estrategia', 'análisis']
    },

    // Educación
    {
      name: 'Tutor de Matemáticas',
      description: 'Tutor especializado en matemáticas de todos los niveles',
      price: 9.99,
      categoryName: 'Educación',
      model: 'gpt-4-turbo',
      capabilities: ['teaching', 'problem-solving', 'explanation'],
      systemPrompt: 'Eres un tutor de matemáticas paciente que explica conceptos complejos de manera clara y accesible.',
      temperature: 0.3,
      maxTokens: 2000,
      isFree: true,
      icon: 'i-heroicons-calculator',
      tags: ['matemáticas', 'educación', 'tutoría']
    },

    // Salud y Bienestar
    {
      name: 'Entrenador Personal',
      description: 'Guía para rutinas de ejercicio y acondicionamiento físico',
      price: 14.99,
      categoryName: 'Salud y Bienestar',
      model: 'gpt-4-turbo',
      capabilities: ['fitness', 'nutrition', 'planning'],
      systemPrompt: 'Eres un entrenador personal certificado que ayuda a las personas a alcanzar sus objetivos de acondicionamiento físico de manera segura y efectiva.',
      temperature: 0.5,
      maxTokens: 2000,
      isFree: false,
      icon: 'i-heroicons-bolt',
      tags: ['fitness', 'ejercicio', 'salud']
    },

    // Creatividad
    {
      name: 'Escritor Creativo',
      description: 'Asistente para escritura creativa y generación de ideas',
      price: 9.99,
      categoryName: 'Creatividad',
      model: 'gpt-4-turbo',
      capabilities: ['writing', 'storytelling', 'brainstorming'],
      systemPrompt: 'Eres un escritor creativo que ayuda a generar ideas, desarrollar personajes y crear narrativas cautivadoras.',
      temperature: 0.8,
      maxTokens: 2000,
      isFree: true,
      icon: 'i-heroicons-pencil-square',
      tags: ['escritura', 'creatividad', 'historias']
    }
  ]
}

// Función para verificar si una categoría ya existe
async function findExistingCategory(name: string): Promise<string | null> {
  const snapshot = await firestoreClient
    .collection('agentCategories')
    .where('name', '==', name)
    .limit(1)
    .get()

  return snapshot.empty ? null : snapshot.docs[0].id
}

// Función para verificar si un agente ya existe
async function findExistingAgent(name: string, model: string): Promise<boolean> {
  const snapshot = await firestoreClient
    .collection('agents')
    .where('name', '==', name)
    .where('model', '==', model)
    .limit(1)
    .get()

  return !snapshot.empty
}

// IDs de usuarios para asignar agentes
const USER_IDS = [
  '26ecdc45-a0a3-4048-8535-acfcd10c228c',
  '5547ab2e-0125-4ae3-8055-2d156efc57bd',
  'c11f00cf-33d4-4e2f-a0fd-d6e12c5c56b2'
]

// Función para limpiar colecciones excepto usuarios
async function clearCollections() {
  console.log('\n=== Limpiando colecciones existentes ===')
  const collections = ['agentCategories', 'agents', 'userAgents', 'chats', 'messages']
  
  for (const collection of collections) {
    try {
      const snapshot = await firestoreClient.collection(collection).get()
      const batch = firestoreClient.batch()
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      
      await batch.commit()
      console.log(`✅ Colección ${collection} limpiada`)
    } catch (error) {
      console.error(`❌ Error limpiando ${collection}:`, error)
    }
  }
}

// Función para crear chats de ejemplo
async function createSampleChats(userId: string, agentId: string): Promise<string> {
  const chatId = generateId()
  const now = Timestamp.now()
  
  const chat: ChatData = {
    id: chatId,
    title: 'Chat de ejemplo',
    userId,
    agentId,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }
  
  await firestoreClient.collection('chats').doc(chatId).set(chat)
  
  // Crear mensajes de ejemplo
  const messages: MessageData[] = [
    {
      chatId,
      content: 'Hola, ¿en qué puedo ayudarte hoy?',
      role: 'assistant',
      createdAt: now
    },
    {
      chatId,
      content: 'Necesito ayuda con un proyecto',
      role: 'user',
      createdAt: Timestamp.fromMillis(now.toMillis() + 1000)
    },
    {
      chatId,
      content: 'Claro, ¿en qué consiste tu proyecto?',
      role: 'assistant',
      createdAt: Timestamp.fromMillis(now.toMillis() + 2000)
    }
  ]
  
  const batch = firestoreClient.batch()
  const messagesRef = firestoreClient.collection('messages')
  
  messages.forEach(message => {
    const messageId = generateId()
    batch.set(messagesRef.doc(messageId), { ...message, id: messageId })
  })
  
  await batch.commit()
  return chatId
}

// Función para asignar agentes a usuarios
async function assignAgentsToUsers(agentIds: string[]) {
  console.log('\n=== Asignando agentes a usuarios ===')

  for (const userId of USER_IDS) {
    try {
      validateId(userId, 'User ID')

      // Verificar si el usuario ya tiene agentes asignados
      const existingUserAgents = await firestoreClient
        .collection('userAgents')
        .where('userId', '==', userId)
        .limit(1)
        .get()

      if (!existingUserAgents.empty) {
        console.log(`✅ El usuario ${userId} ya tiene agentes asignados`)
        continue
      }

      // Asignar agentes al usuario
      const now = Timestamp.now()
      const userAgents = agentIds.map((agentId, _index) => ({
        id: generateId(),
        userId,
        agentId,
        purchasedAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + (365 * 24 * 60 * 60 * 1000)), // 1 año después
        isActive: true,
        paymentId: `pay_${generateId().substring(0, 8)}`,
        usage: {
          messageCount: 0,
          lastUsedAt: now
        },
        createdAt: now,
        updatedAt: now
      }))

      // Guardar los UserAgents en lote
      const batch = firestoreClient.batch()
      const userAgentsRef = firestoreClient.collection('userAgents')

      userAgents.forEach(userAgent => {
        const docRef = userAgentsRef.doc(userAgent.id)
        batch.set(docRef, userAgent)
      })

      await batch.commit()
      console.log(`✅ Asignados ${agentIds.length} agentes al usuario ${userId}`)
      
      // Crear un chat de ejemplo para el primer agente asignado
      if (agentIds.length > 0) {
        await createSampleChats(userId, agentIds[0])
        console.log(`✅ Chat de ejemplo creado para el usuario ${userId}`)
      }

    } catch (error) {
      console.error(`❌ Error asignando agentes al usuario ${userId}:`, error)
    }
  }
}

// Función para poblar la base de datos
async function seedDatabase() {
  try {
    console.log('Iniciando la carga de datos de prueba...')
    
    // Limpiar colecciones existentes
    await clearCollections()

    // 1. Cargar categorías
    const categoriesRef = firestoreClient.collection('agentCategories')
    const categoriesMap: Record<string, string> = {}

    console.log('\n=== Procesando categorías ===')
    for (const categoryData of seedData.categories) {
      // Verificar si la categoría ya existe
      const existingCategoryId = await findExistingCategory(categoryData.name)

      if (existingCategoryId) {
        console.log(`Categoría ya existe: ${categoryData.name}`)
        categoriesMap[categoryData.name] = existingCategoryId
        continue
      }

      // Crear nueva categoría
      const categoryId = generateId()
      const category = {
        ...categoryData,
        id: categoryId,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      await categoriesRef.doc(categoryId).set(category)
      categoriesMap[categoryData.name] = categoryId
      console.log(`✅ Categoría creada: ${categoryData.name}`)
    }

    // 2. Cargar agentes
    const agentsRef = firestoreClient.collection('agents')
    const createdAgentIds: string[] = []

    console.log('\n=== Procesando agentes ===')
    for (const agentData of seedData.agents) {
      const categoryId = categoriesMap[agentData.categoryName]
      if (!categoryId) {
        console.warn(`⚠️  Categoría no encontrada para el agente: ${agentData.name}`)
        continue
      }

      // Verificar si el agente ya existe
      const agentExists = await findExistingAgent(agentData.name, agentData.model)
      if (agentExists) {
        console.log(`Agente ya existe: ${agentData.name} (${agentData.model})`)
        continue
      }

      // Crear nuevo agente
      const agentId = generateId()
      const agent = {
        ...agentData,
        id: agentId,
        categoryId,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      // Eliminar la propiedad categoryName que no es parte del modelo
      const { categoryName, ...agentWithoutCategoryName } = agent as { categoryName?: string } & typeof agent
      Object.assign(agent, agentWithoutCategoryName)

      await agentsRef.doc(agentId).set(agent)
      createdAgentIds.push(agentId)
      console.log(`✅ Agente creado: ${agentData.name} (${agentData.model})`)
    }

    // 3. Asignar agentes a usuarios
    if (createdAgentIds.length > 0) {
      console.log('\n=== Asignando agentes a usuarios ===')
      // Tomar los primeros 3 agentes para asignar a cada usuario
      const agentsToAssign = createdAgentIds.slice(0, 3)
      await assignAgentsToUsers(agentsToAssign)
    }

    console.log('\n¡Datos de prueba cargados exitosamente! 🎉')
    process.exit(0)
  } catch (error) {
    console.error('Error al cargar datos de prueba:', error)
    process.exit(1)
  }
}

// Ejecutar el script
seedDatabase()
