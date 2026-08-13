import { reactive } from 'vue'
import { useToast } from '@nuxt/ui/composables'

export interface UseCrudFormOptions<TEntity extends { id: number }, TCreate extends object, TUpdate> {
  /** Human-readable name used in toast messages, e.g. "account". */
  entityLabel: string
  /** Fresh field values for a new, empty "create" form. */
  createDefaults: () => TCreate
  /** Maps an existing entity back to editable form values, for "edit" mode. */
  toFormValues: (entity: TEntity) => TCreate
  create: (payload: TCreate) => Promise<TEntity>
  update: (id: number, payload: TUpdate) => Promise<TEntity>
  /** Narrows the create-shaped form down to an update payload. Defaults to using the form as-is. */
  toUpdatePayload?: (form: TCreate) => TUpdate
}

interface CrudFormState<TCreate> {
  open: boolean
  submitting: boolean
  editingId: number | null
  form: TCreate
  readonly isEditing: boolean
}

/**
 * Owns the create-vs-edit state machine shared by every entity form in the app
 * (open/closed, which record is being edited, dispatching to create or update).
 * Field markup and validation stay with the caller — this only decides *which*
 * store method to call and with what payload.
 *
 * Returns a single reactive `state`, mirroring how Pinia setup-stores expose
 * their refs already unwrapped — so callers use `form.state.open` /
 * `form.state.form.name` directly in templates, with no manual `.value`.
 */
export function useCrudForm<TEntity extends { id: number }, TCreate extends object, TUpdate = Partial<TCreate>>(
  options: UseCrudFormOptions<TEntity, TCreate, TUpdate>,
) {
  const { entityLabel, createDefaults, toFormValues, create, update, toUpdatePayload } = options
  const toast = useToast()

  // Cast *after* construction rather than passing CrudFormState<TCreate> as
  // reactive()'s type argument — Vue's reactive() return type always runs
  // through UnwrapNestedRefs<T>, which can't simplify back to a bare generic
  // TCreate, so doing it this way is what actually gets `state.form: TCreate`.
  const state = reactive({
    open: false,
    submitting: false,
    editingId: null as number | null,
    form: createDefaults(),
    get isEditing() {
      return this.editingId !== null
    },
  }) as CrudFormState<TCreate>

  function openCreate() {
    state.editingId = null
    Object.assign(state.form, createDefaults())
    state.open = true
  }

  function openEdit(entity: TEntity) {
    state.editingId = entity.id
    Object.assign(state.form, toFormValues(entity))
    state.open = true
  }

  function close() {
    state.open = false
  }

  async function submit() {
    state.submitting = true
    try {
      if (state.editingId !== null) {
        const payload = toUpdatePayload ? toUpdatePayload(state.form) : (state.form as unknown as TUpdate)
        await update(state.editingId, payload)
      } else {
        await create(state.form)
      }
      state.open = false
      return true
    } catch (error) {
      toast.add({
        title: `Couldn't save ${entityLabel}`,
        description: error instanceof Error ? error.message : undefined,
        color: 'error',
      })
      return false
    } finally {
      state.submitting = false
    }
  }

  return { state, openCreate, openEdit, close, submit }
}
