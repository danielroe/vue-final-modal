<script setup lang="ts">
import { ref } from 'vue'
import { ModalsContainer, VueFinalModal, useModal, useModalSlot, useVfm } from 'vue-final-modal'
import DefaultSlot from '../DefaultSlot.vue'

const show = ref(false)
const theModalId = Symbol('theModalId')

const { toggle } = useVfm()

const bottomSheet = useModal({
  attrs: {
    background: 'interactive',
    contentStyle: {
      'backgroundColor': '#fff',
      'position': 'absolute',
      'bottom': '0',
      'display': 'flex',
      'flex-direction': 'column',
      'width': '100%',
      'max-height': '90%',
      'overflow-y': 'auto',
    },
    swipeToClose: 'down',
    contentTransition: { name: 'vfm-slide-down' },
  },
  slots: {
    default: useModalSlot({
      component: DefaultSlot,
      attrs: {
        text: '123',
        onCreate() {
          // console.log('onCreated')
        },
      },
    }),
  },
})

function beforeOpen(e: any) {
  console.log('beforeOpen', e)
}
</script>

<template>
  <div style="padding-top: 100px">
    <button @click="show = !show">
      open vfm
    </button>
    <button @click="() => toggle(theModalId)">
      open modal by modal modalId
    </button>
    <button @click="() => bottomSheet.open()">
      create bottom sheet component
    </button>
    <VueFinalModal
      v-model="show"
      :modal-id="theModalId"
      :content-style="{
        'background-color': '#fff',
        'border-top-left-radius': '12px',
        'border-top-right-radius': '12px',
        'position': 'absolute',
        'bottom': '0',
        'display': 'flex',
        'flex-direction': 'column',
        'width': '100%',
        'max-height': '90%',
        'overflow-y': 'auto',
      }"
      swipe-to-close="down"
      content-transition="vfm-slide-down"
      @before-open="beforeOpen"
    >
      <div>Direct use vfm</div>
      <button @click="() => toggle(theModalId)">
        close modal by modal modalId
      </button>
      <button @click="show = false">
        close
      </button>
      <div style="height: 300px">
        Direct use vfm
      </div>
      <!-- <div style="min-height: 500px">
        Direct use vfm
      </div>
      <div style="min-height: 500px">
        Direct use vfm
      </div> -->
    </VueFinalModal>
  </div>

  <div v-for="i in 1000" :key="i">
    test: {{ i }}
  </div>

  <ModalsContainer />
</template>
