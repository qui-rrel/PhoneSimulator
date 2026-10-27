import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { contentConfig } from '../config/phone.config'

const clone = (value) => JSON.parse(JSON.stringify(value))

function initialState() {
  const locations = clone(contentConfig.mapLocations || [])
  const ordered = [...locations].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  const favoriteIds = ordered.filter((item) => item.favorite).map((item) => item.id)
  const recentIds = ordered.filter((item) => item.recent).map((item) => item.id)
  const savedDates = Object.fromEntries(ordered.filter((item) => item.favorite && item.savedDate).map((item) => [item.id, item.savedDate]))
  return {
    locations,
    favoriteIds,
    recentIds,
    savedDates,
    activeLocationId: favoriteIds[0] || recentIds[0] || ordered[0]?.id || '',
  }
}

export const useMapsStore = defineStore('maps', () => {
  const seed = initialState()
  const locations = ref(seed.locations)
  const favoriteIds = ref(seed.favoriteIds)
  const recentIds = ref(seed.recentIds)
  const savedDates = ref(seed.savedDates)
  const activeLocationId = ref(seed.activeLocationId)

  const locationById = (id) => locations.value.find((item) => item.id === id)
  const activeLocation = computed(() => locationById(activeLocationId.value) || locations.value[0] || null)
  const favorites = computed(() => favoriteIds.value.map(locationById).filter(Boolean))
  const recent = computed(() => recentIds.value.map(locationById).filter(Boolean))

  function selectLocation(id) {
    if (!locationById(id)) return false
    activeLocationId.value = id
    return true
  }

  function isFavorite(id) {
    return favoriteIds.value.includes(id)
  }

  function savedDateFor(id) {
    return savedDates.value[id] || ''
  }

  function addRecentAndSelect(id) {
    if (!selectLocation(id)) return false
    recentIds.value = [id, ...recentIds.value.filter((item) => item !== id)]
    return true
  }

  function reset() {
    const next = initialState()
    locations.value = next.locations
    favoriteIds.value = next.favoriteIds
    recentIds.value = next.recentIds
    savedDates.value = next.savedDates
    activeLocationId.value = next.activeLocationId
  }

  return {
    locations,
    favoriteIds,
    recentIds,
    savedDates,
    activeLocationId,
    activeLocation,
    favorites,
    recent,
    locationById,
    selectLocation,
    isFavorite,
    savedDateFor,
    addRecentAndSelect,
    reset,
  }
})
