// Tipos espec�ficos para la respuesta del endpoint
export interface UserAgentData {
    id: string
    name: string
    description: string
    price: number
    model: string
    isFree: boolean
    userAgentId: string
    purchasedAt: Date | FirebaseFirestore.Timestamp
    expiresAt?: Date | FirebaseFirestore.Timestamp
    usage: {
        messageCount: number
        lastUsedAt: Date | FirebaseFirestore.Timestamp
    }
}

export interface CategoryWithUserAgents {
    category: {
        id: string
        name: string
        description?: string
        icon?: string
        order?: number
    }
    agents: UserAgentData[]
}

export default function useAgentCategories() {
    const categoriesWithAgents = useState<CategoryWithUserAgents[]>('userAgentCategories', () => [])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const { userId, isAuthenticated } = useAuth()

    // Usar $fetch directamente para control total
    const data = ref<{ success: boolean; data: CategoryWithUserAgents[] } | null>(null)

    async function fetchUserAgentCategories() {
        if (!userId.value) {
            error.value = 'Usuario no autenticado'
            return
        }

        try {
            const url = `/api/user-agents/${userId.value}`

            isLoading.value = true
            error.value = null

            const response = await $fetch<{
                success: boolean
                data: CategoryWithUserAgents[]
            }>(url)

            data.value = response

            if (response?.success && response?.data) {
                categoriesWithAgents.value = response.data
            } else {
                categoriesWithAgents.value = []
            }
        } catch (err) {
            console.error('Error fetching user agent categories:', err)
            error.value = 'Error al cargar las categorías de agentes'
            categoriesWithAgents.value = []
        } finally {
            isLoading.value = false
        }
    }

    // Auto-ejecutar solo cuando esté completamente autenticado
    watchEffect(async () => {
        if (isAuthenticated.value && userId.value) {
            // Esperar un tick para asegurar que todo esté hidratado
            await nextTick()
            await fetchUserAgentCategories()
        }
    })


    // Computadas memoizadas
    const totalAgents = computed(() =>
        categoriesWithAgents.value.reduce((total, cat) => total + cat.agents.length, 0)
    )

    const freeAgents = computed(() =>
        categoriesWithAgents.value.flatMap(cat => cat.agents).filter(agent => agent.isFree)
    )

    const premiumAgents = computed(() =>
        categoriesWithAgents.value.flatMap(cat => cat.agents).filter(agent => !agent.isFree)
    )

    // Función para refrescar los datos
    async function refreshData() {
        await fetchUserAgentCategories()
    }

    return {
        // Estados principales (ya ordenados desde la API)
        categoriesWithAgents: categoriesWithAgents,
        isLoading: readonly(isLoading),
        error: readonly(error),

        // Computadas útiles
        totalAgents: readonly(totalAgents),
        freeAgents: readonly(freeAgents),
        premiumAgents: readonly(premiumAgents),

        // Funciones
        fetchUserAgentCategories,
        refreshData
    }
}