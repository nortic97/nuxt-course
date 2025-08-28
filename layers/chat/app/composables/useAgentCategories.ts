// Specific types for the endpoint response
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

    // Use $fetch directly for full control
    const data = ref<{ success: boolean; data: CategoryWithUserAgents[] } | null>(null)

    async function fetchUserAgentCategories() {
        if (!userId.value) {
            error.value = 'User not authenticated'
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
            error.value = 'Error loading agent categories'
            categoriesWithAgents.value = []
        } finally {
            isLoading.value = false
        }
    }

    // Auto-execute only when fully authenticated
    watchEffect(async () => {
        if (isAuthenticated.value && userId.value) {
            // Wait for a tick to ensure everything is hydrated
            await nextTick()
            await fetchUserAgentCategories()
        }
    })


    // Memoized computed properties
    const totalAgents = computed(() =>
        categoriesWithAgents.value.reduce((total, cat) => total + cat.agents.length, 0)
    )

    const freeAgents = computed(() =>
        categoriesWithAgents.value.flatMap(cat => cat.agents).filter(agent => agent.isFree)
    )

    const premiumAgents = computed(() =>
        categoriesWithAgents.value.flatMap(cat => cat.agents).filter(agent => !agent.isFree)
    )

    // Function to refresh data
    async function refreshData() {
        await fetchUserAgentCategories()
    }

    return {
        // Main states (already sorted from the API)
        categoriesWithAgents: categoriesWithAgents,
        isLoading: readonly(isLoading),
        error: readonly(error),

        // Useful computed properties
        totalAgents: readonly(totalAgents),
        freeAgents: readonly(freeAgents),
        premiumAgents: readonly(premiumAgents),

        // Functions
        fetchUserAgentCategories,
        refreshData
    }
}