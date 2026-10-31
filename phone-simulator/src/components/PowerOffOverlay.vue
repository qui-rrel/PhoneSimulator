<script setup>
import { BatteryWarning } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'

const phone = usePhoneStore()
</script>

<template>
  <Transition name="power-off">
    <section
      v-if="phone.powerState !== 'on'"
      class="power-off-overlay"
      :class="`power-off-overlay--${phone.powerState}`"
      role="status"
      aria-live="assertive"
    >
      <div v-if="phone.powerState === 'warning'" class="power-off-warning">
        <BatteryWarning :size="38" :stroke-width="1.8" />
        <strong>电量已耗尽</strong>
        <span>手机即将关机</span>
      </div>
      <i v-else-if="phone.powerState === 'shutting-down'" class="power-off-line" aria-hidden="true"></i>
    </section>
  </Transition>
</template>
