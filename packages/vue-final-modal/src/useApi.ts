import { isString, tryOnUnmounted } from '@vueuse/core'
import { computed, getCurrentInstance, inject, markRaw, reactive, useAttrs } from 'vue'
import type { Component } from 'vue'
import VueFinalModal from './components/VueFinalModal/VueFinalModal.vue'
import type CoreModal from './components/CoreModal/CoreModal.vue'
import { internalVfmSymbol, vfmSymbol } from './injectionSymbols'

import type { ComponentProps, Constructor, InternalVfm, ModalSlot, ModalSlotOptions, RawProps, UseModalOptions, UseModalOptionsPrivate, UseModalReturnType, Vfm } from './Modal'

/**
 * Returns the vfm instance. Equivalent to using `$vfm` inside
 * templates.
 */
export function useVfm(): Vfm {
  return inject(vfmSymbol)!
}

/**
 * Returns the internalVfm instance.
 */
export function useInternalVfm(): InternalVfm {
  return inject(internalVfmSymbol)!
}

function withMarkRaw<P>(options: Partial<UseModalOptions<P>>, DefaultComponent: Component = VueFinalModal) {
  const { component, slots: innerSlots, ...rest } = options

  const slots = typeof innerSlots === 'undefined'
    ? {}
    : Object.fromEntries<ModalSlot>(Object.entries(innerSlots).map(([name, maybeComponent]) => {
      if (isString(maybeComponent))
        return [name, maybeComponent] as const

      if ('component' in maybeComponent) {
        return [name, {
          ...maybeComponent,
          component: markRaw(maybeComponent.component),
        }]
      }

      return [name, markRaw(maybeComponent)]
    }))

  return {
    ...rest,
    component: markRaw(component || DefaultComponent) as Constructor<P>,
    slots,
  }
}

/**
 * Create a dynamic modal.
 */
export function useModal<P = InstanceType<typeof VueFinalModal>['$props']>(_options: UseModalOptions<P>): UseModalReturnType<P> {
  const options = reactive({
    id: Symbol('useModal'),
    modelValue: !!_options?.defaultModelValue,
    resolveOpened: () => { },
    resolveClosed: () => { },
    attrs: {},
    ...withMarkRaw<P>(_options),
  }) as UseModalOptions<P> & UseModalOptionsPrivate

  if (!options.context) {
    const currentInstance = getCurrentInstance()
    if (currentInstance)
      options.context = useVfm()
    else if (__DEV__)
      console.warn('[Vue Final Modal warn] useModal() can only be used inside setup() or functional components.')
  }

  tryOnUnmounted(() => {
    if (!options.keepAlive)
      destroy()
  })

  if (options.modelValue === true)
    options.context?.dynamicModals.push(options)

  function open(): Promise<string> {
    if (!options?.context)
      return Promise.resolve('[Vue Final Modal] options.context is not exist.')
    if (options.modelValue)
      return Promise.resolve('[Vue Final Modal] modal is already opened.')

    destroy()
    options.modelValue = true
    options.context.dynamicModals.push(options)

    return new Promise((resolve) => {
      options.resolveOpened = () => resolve('opened')
    })
  }

  function close(): Promise<string> {
    if (!options.modelValue)
      return Promise.resolve('[Vue Final Modal] modal is already closed.')

    options.modelValue = false
    return new Promise((resolve) => {
      options.resolveClosed = () => {
        if (!options.keepAlive)
          destroy()
        resolve('closed')
      }
    })
  }

  function patchOptions(_options: Partial<Omit<UseModalOptions<P>, 'defaultModelValue' | 'context'>>) {
    const { slots, ...rest } = withMarkRaw(_options, options.component)

    // patch options.component and options.attrs
    patchComponentOptions(options, rest)

    // patch options.slots
    if (slots) {
      Object.entries(slots).forEach(([name, slot]) => {
        const originSlot = options.slots![name]
        if (isString(originSlot))
          options.slots![name] = slot
        else if (isModalSlotOptions(originSlot) && isModalSlotOptions(slot))
          patchComponentOptions(originSlot, slot)
        else
          options.slots![name] = slot
      })
    }
  }

  function destroy(): void {
    if (!options.context)
      return
    const index = options.context.dynamicModals.indexOf(options)
    if (index !== -1)
      options.context.dynamicModals.splice(index, 1)
  }

  return {
    options,
    open,
    close,
    patchOptions,
    destroy,
  }
}

export function useModalSlot<P>(options: {
  component: Constructor<P>
  attrs?: (RawProps & P) | ({} extends P ? null : never)
}) {
  return options
}

function patchAttrs<T extends Record<string, any>>(attrs: T, newAttrs: Partial<T>): T {
  Object.entries(newAttrs).forEach(([key, value]) => {
    attrs[key as keyof T] = value
  })

  return attrs
}

function patchComponentOptions<P>(
  options: Omit<UseModalOptions<P>, 'defaultModelValue' | 'context'> | ModalSlotOptions,
  newOptions: Partial<Omit<UseModalOptions<P>, 'defaultModelValue' | 'context'>> | ModalSlotOptions,
) {
  if (newOptions.component)
    options.component = newOptions.component

  if (newOptions.attrs)
    patchAttrs(options.attrs!, newOptions.attrs)
}

function isModalSlotOptions(value: any): value is ModalSlotOptions {
  return 'component' in value || 'attrs' in value
}

export function pickModalProps(props: any, modalProps: any) {
  return Object.keys(modalProps).reduce((acc, propName) => {
    acc[propName] = props[propName]
    return acc
  }, {} as Record<string, any>)
}

export function byPassAllModalEvents(emit?: InstanceType<typeof CoreModal>['$emit']) {
  if (!emit)
    return {}
  return {
    'onUpdate:modelValue': (val: boolean) => emit('update:modelValue', val),

    'onBeforeClose': () => emit('beforeClose'),
    'onClosed': () => emit('closed'),
    'onBeforeOpen': () => emit('beforeOpen'),
    'onOpened': () => emit('opened'),

    /** onClickOutside will only be emitted when clickToClose equal to `false` */
    'onClickOutside': () => emit('clickOutside'),
  }
}

export function useVfmAttrs(options: {
  props: ComponentProps
  modalProps: ComponentProps
  emit?: any
}) {
  const { props, modalProps, emit } = options
  const bindProps = computed(() => pickModalProps(props, modalProps))
  const bindEmits = byPassAllModalEvents(emit)
  const attrs = useAttrs()
  const vfmAttrs = computed(() => ({
    ...bindProps.value,
    ...bindEmits,
    ...attrs,
  }))

  return vfmAttrs
}
