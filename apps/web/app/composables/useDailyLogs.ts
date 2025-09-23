import { ref, computed } from 'vue'

export interface DailyLog {
  id: number
  recordDate: string
  tlpNo: string
  hoursFlownAirframe: string | null
  hoursFlownEngine: string | null
  landings: number | null
  tc: number | null
  noOfStarts: number | null
  ggCycle: number | null
  ftCycle: number | null
  usage: string | null
  totalAirframeHr: string | null
  totalEngineHrTsn: string | null
  totalLandings: number | null
  totalTc: number | null
  totalNoOfStarts: number | null
  totalGgCycleTsn: number | null
  totalFtCycleTsn: number | null
  remarks: string | null
  organizationId: string
  createdBy: string
  status: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DailyLogFilters {
  tlpNo?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface DailyLogResponse {
  success: boolean
  list: DailyLog[]
  totalCount: number
  totalPages: number
}

export interface CreateDailyLogData {
  recordDate: string
  tlpNo: string
  hoursFlownAirframe?: string
  hoursFlownEngine?: string
  landings?: number
  tc?: number
  noOfStarts?: number
  ggCycle?: number
  ftCycle?: number
  usage?: string
  totalAirframeHr?: string
  totalEngineHrTsn?: string
  totalLandings?: number
  totalTc?: number
  totalNoOfStarts?: number
  totalGgCycleTsn?: number
  totalFtCycleTsn?: number
  remarks?: string
}

export const useDailyLogs = () => {
  const { $eden } = useNuxtApp()
  const toast = useToast()
  
  const logs = ref<DailyLog[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)
  const totalPages = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const filters = ref<DailyLogFilters>({})

  const fetchLogs = async (params?: DailyLogFilters) => {
    isLoading.value = true
    error.value = null
    
    try {
      const queryParams = {
        ...filters.value,
        ...params,
        page: currentPage.value,
        pageSize: pageSize.value
      }
      const response = await $eden['daily-logs'].get(queryParams)
      
      if (response.data?.success) {
        logs.value = response.data.list
        totalCount.value = response.data.totalCount
        totalPages.value = response.data.totalPages
      } else {
        throw new Error('Failed to fetch daily logs')
      }
    } catch (err: any) {
      error.value = err.message || 'An error occurred while fetching daily logs'
      toast.add({
        title: 'Error',
        description: error.value || 'An error occurred',
        color: 'error'
      })
    } finally {
      isLoading.value = false
    }
  }

  const fetchLog = async (id: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $eden['daily-logs']({ id }).get()
      
      if (response.data?.success) {
        return response.data.data
      } else {
        throw new Error('Failed to fetch daily log')
      }
    } catch (err: any) {
      error.value = err.message || 'An error occurred while fetching daily log'
      toast.add({
        title: 'Error',
        description: error.value || 'An error occurred',
        color: 'error'
      })
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createLog = async (data: CreateDailyLogData) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $eden['daily-logs'].post(data)
      
      if (response.data?.success) {
        toast.add({
          title: 'Success',
          description: 'Daily log created successfully',
          color: 'success'
        })
        await fetchLogs()
        return response.data.data
      } else {
        throw new Error('Failed to create daily log')
      }
    } catch (err: any) {
      error.value = err.message || 'An error occurred while creating daily log'
      toast.add({
        title: 'Error',
        description: error.value || 'An error occurred',
        color: 'error'
      })
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateLog = async (id: number, data: Partial<CreateDailyLogData>) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $eden['daily-logs']({ id }).put(data)
      
      if (response.data?.success) {
        toast.add({
          title: 'Success',
          description: 'Daily log updated successfully',
          color: 'success'
        })
        await fetchLogs()
        return response.data.data
      } else {
        throw new Error('Failed to update daily log')
      }
    } catch (err: any) {
      error.value = err.message || 'An error occurred while updating daily log'
      toast.add({
        title: 'Error',
        description: error.value || 'An error occurred',
        color: 'error'
      })
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deleteLog = async (id: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $eden['daily-logs']({ id }).delete()
      
      if (response.data?.success) {
        toast.add({
          title: 'Success',
          description: 'Daily log deleted successfully',
          color: 'success'
        })
        await fetchLogs()
        return true
      } else {
        throw new Error('Failed to delete daily log')
      }
    } catch (err: any) {
      error.value = err.message || 'An error occurred while deleting daily log'
      toast.add({
        title: 'Error',
        description: error.value || 'An error occurred',
        color: 'error'
      })
      return false
    } finally {
      isLoading.value = false
    }
  }

  const setFilters = (newFilters: DailyLogFilters) => {
    filters.value = { ...newFilters }
    currentPage.value = 1
    fetchLogs()
  }

  const setPage = (page: number) => {
    currentPage.value = page
    fetchLogs()
  }

  const setPageSize = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
    fetchLogs()
  }

  const clearFilters = () => {
    filters.value = {}
    currentPage.value = 1
    fetchLogs()
  }

  const paginationInfo = computed(() => ({
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    totalCount: totalCount.value,
    pageSize: pageSize.value,
    hasNextPage: currentPage.value < totalPages.value,
    hasPrevPage: currentPage.value > 1
  }))

  return {
    logs: readonly(logs),
    isLoading: readonly(isLoading),
    error: readonly(error),
    totalCount: readonly(totalCount),
    totalPages: readonly(totalPages),
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    filters: readonly(filters),
    paginationInfo,
    fetchLogs,
    fetchLog,
    createLog,
    updateLog,
    deleteLog,
    setFilters,
    setPage,
    setPageSize,
    clearFilters
  }
}
