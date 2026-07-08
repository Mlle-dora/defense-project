import { supabase } from '@/lib/supabase'
import { getRequiredDocuments } from '@/features/declarations/documentRules'
import type {
  BirthDeclaration,
  DeclarationSearchFilters,
  DashboardStats,
  DeclarationStatus,
} from '@/types'

export const declarationsService = {
  buildDeclarationMeta(payload: {
    mother_marital_status: string
    paternity_recognized: boolean
    father?: { full_name?: string } | null
  }) {
    const fatherDeclared = Boolean(payload.father?.full_name?.trim())
    const required_documents = getRequiredDocuments({
      motherMaritalStatus: payload.mother_marital_status as 'married' | 'single' | 'widowed' | 'divorced',
      paternityRecognized: payload.paternity_recognized,
      fatherDeclared,
    })
    return {
      mother_marital_status: payload.mother_marital_status,
      paternity_recognized: payload.paternity_recognized,
      required_documents,
    }
  },

  async list(filters: DeclarationSearchFilters = {}) {
    const page = filters.page ?? 1
    const pageSize = filters.page_size ?? 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('birth_declarations')
      .select(
        `*, hospital:hospitals(name, code), civil_status_center:civil_status_centers(name),
         child:children(full_name, gender, birth_date),
         mother:mothers(full_name, phone)`,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters.workflow_status) query = query.eq('workflow_status', filters.workflow_status)
    if (filters.workflow_statuses?.length) {
      query = query.in('workflow_status', filters.workflow_statuses)
    }
    if (filters.exclude_draft) query = query.neq('workflow_status', 'draft')
    if (filters.hospital_id) query = query.eq('hospital_id', filters.hospital_id)
    if (filters.civil_status_center_id) query = query.eq('civil_status_center_id', filters.civil_status_center_id)
    if (filters.declaration_number) query = query.ilike('declaration_number', `%${filters.declaration_number}%`)
    if (filters.date_from) query = query.gte('created_at', filters.date_from)
    if (filters.date_to) query = query.lte('created_at', filters.date_to)
    if (filters.query?.trim()) {
      const matchingIds = await this.findIdsByQuery(filters.query.trim(), {
        hospital_id: filters.hospital_id,
        civil_status_center_id: filters.civil_status_center_id,
      })
      if (matchingIds.length === 0) {
        return { data: [], total: 0, page, page_size: pageSize, total_pages: 0 }
      }
      query = query.in('id', matchingIds)
    }

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: (data ?? []) as BirthDeclaration[],
      total: count ?? 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count ?? 0) / pageSize),
    }
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('birth_declarations')
      .select(
        `*, hospital:hospitals(*), civil_status_center:civil_status_centers(*),
         child:children(*), mother:mothers(*), father:fathers(*),
         parent_contacts(*), declaration_documents(*)`
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error) throw error
    return data as BirthDeclaration
  },

  async create(payload: {
    hospital_id: string
    civil_status_center_id: string
    mother_marital_status: string
    paternity_recognized: boolean
    required_documents: string[]
    child: Record<string, unknown>
    mother: Record<string, unknown>
    father?: Record<string, unknown> | null
    parent_contacts?: Record<string, unknown>[]
  }) {
    const { data: declaration, error: declError } = await supabase
      .from('birth_declarations')
      .insert({
        hospital_id: payload.hospital_id,
        civil_status_center_id: payload.civil_status_center_id,
        workflow_status: 'draft',
        mother_marital_status: payload.mother_marital_status,
        paternity_recognized: payload.paternity_recognized,
        required_documents: payload.required_documents,
      })
      .select()
      .single()
    if (declError) throw declError

    const declId = declaration.id

    const { error: childError } = await supabase
      .from('children')
      .insert({ ...payload.child, declaration_id: declId })
    if (childError) throw childError

    const { error: motherError } = await supabase
      .from('mothers')
      .insert({ ...payload.mother, declaration_id: declId })
    if (motherError) throw motherError

    if (payload.father?.full_name) {
      const { error: fatherError } = await supabase
        .from('fathers')
        .insert({ ...payload.father, declaration_id: declId })
      if (fatherError) throw fatherError
    }

    if (payload.parent_contacts?.length) {
      const { error: contactError } = await supabase
        .from('parent_contacts')
        .insert(payload.parent_contacts.map((c) => ({ ...c, declaration_id: declId })))
      if (contactError) throw contactError
    }

    return this.getById(declId)
  },

  async update(id: string, payload: {
    civil_status_center_id?: string
    mother_marital_status?: string
    paternity_recognized?: boolean
    required_documents?: string[]
    child?: Record<string, unknown>
    mother?: Record<string, unknown>
    father?: Record<string, unknown> | null
    parent_contacts?: Record<string, unknown>[]
  }) {
    const declPatch: Record<string, unknown> = {}
    if (payload.civil_status_center_id) declPatch.civil_status_center_id = payload.civil_status_center_id
    if (payload.mother_marital_status) declPatch.mother_marital_status = payload.mother_marital_status
    if (payload.paternity_recognized !== undefined) declPatch.paternity_recognized = payload.paternity_recognized
    if (payload.required_documents) declPatch.required_documents = payload.required_documents
    if (Object.keys(declPatch).length > 0) {
      await supabase.from('birth_declarations').update(declPatch).eq('id', id)
    }
    if (payload.parent_contacts?.length) {
      for (const contact of payload.parent_contacts) {
        const contactType = contact.contact_type as string
        const { data: existing } = await supabase
          .from('parent_contacts')
          .select('id')
          .eq('declaration_id', id)
          .eq('contact_type', contactType)
          .maybeSingle()
        if (existing) {
          await supabase.from('parent_contacts').update(contact).eq('id', existing.id)
        } else {
          await supabase.from('parent_contacts').insert({ ...contact, declaration_id: id })
        }
      }
    }
    if (payload.child) {
      await supabase.from('children').update(payload.child).eq('declaration_id', id)
    }
    if (payload.mother) {
      await supabase.from('mothers').update(payload.mother).eq('declaration_id', id)
    }
    if (payload.father) {
      const { data: existing } = await supabase
        .from('fathers')
        .select('id')
        .eq('declaration_id', id)
        .maybeSingle()
      if (existing) {
        await supabase.from('fathers').update(payload.father).eq('declaration_id', id)
      } else if (payload.father.full_name) {
        await supabase.from('fathers').insert({ ...payload.father, declaration_id: id })
      }
    }
    return this.getById(id)
  },

  async findIdsByQuery(
    query: string,
    scope: { hospital_id?: string; civil_status_center_id?: string } = {}
  ) {
    const pattern = `%${query}%`
    const ids = new Set<string>()

    const addRows = (rows: { declaration_id?: string; id?: string }[] | null) => {
      rows?.forEach((row) => {
        const id = row.declaration_id ?? row.id
        if (id) ids.add(id)
      })
    }

    let declQuery = supabase
      .from('birth_declarations')
      .select('id')
      .is('deleted_at', null)
      .or(`declaration_number.ilike.${pattern},registration_number.ilike.${pattern}`)

    if (scope.hospital_id) declQuery = declQuery.eq('hospital_id', scope.hospital_id)
    if (scope.civil_status_center_id) {
      declQuery = declQuery.eq('civil_status_center_id', scope.civil_status_center_id)
    }

    const [childrenRes, mothersRes, fathersRes, declRes] = await Promise.all([
      supabase.from('children').select('declaration_id').ilike('full_name', pattern),
      supabase.from('mothers').select('declaration_id').ilike('full_name', pattern),
      supabase.from('fathers').select('declaration_id').ilike('full_name', pattern),
      declQuery,
    ])

    addRows(childrenRes.data)
    addRows(mothersRes.data)
    addRows(fathersRes.data)
    addRows(declRes.data?.map((d) => ({ id: d.id })) ?? null)

    if (ids.size === 0) return []

    if (scope.hospital_id || scope.civil_status_center_id) {
      let scopeQuery = supabase
        .from('birth_declarations')
        .select('id')
        .is('deleted_at', null)
        .in('id', [...ids])

      if (scope.hospital_id) scopeQuery = scopeQuery.eq('hospital_id', scope.hospital_id)
      if (scope.civil_status_center_id) {
        scopeQuery = scopeQuery.eq('civil_status_center_id', scope.civil_status_center_id)
      }

      const { data, error } = await scopeQuery
      if (error) throw error
      return (data ?? []).map((d) => d.id)
    }

    return [...ids]
  },

  async transitionStatus(
    id: string,
    newStatus: DeclarationStatus,
    metadata: Record<string, unknown> = {}
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('transition_declaration_status', {
      p_declaration_id: id,
      p_new_status: newStatus,
      p_actor_id: user.id,
      p_metadata: metadata,
    })
    if (error) throw error
    return data
  },

  async submitDeclaration(id: string) {
    try {
      return await this.transitionStatus(id, 'submitted')
    } catch (rpcError) {
      const decl = await this.getById(id)
      if (decl.workflow_status !== 'draft' && decl.workflow_status !== 'rejected') throw rpcError

      const { data: declarationNumber, error: numError } = await supabase.rpc(
        'generate_declaration_number',
        { p_hospital_id: decl.hospital_id }
      )
      if (numError) throw numError

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 90)

      const { error: updateError } = await supabase
        .from('birth_declarations')
        .update({
          workflow_status: 'submitted',
          declaration_number: declarationNumber,
          submitted_at: new Date().toISOString(),
          expires_at: decl.child?.birth_date
            ? new Date(
                new Date(decl.child.birth_date).getTime() + 90 * 24 * 60 * 60 * 1000
              ).toISOString()
            : expiresAt.toISOString(),
        })
        .eq('id', id)
        .in('workflow_status', ['draft', 'rejected'])

      if (updateError) throw updateError

      await supabase.rpc('notify_declaration_submitted', { p_declaration_id: id })
      return { success: true }
    }
  },

  async getStats(hospitalId?: string, civilCenterId?: string) {
    const { data, error } = await supabase.rpc('get_declaration_stats', {
      p_hospital_id: hospitalId ?? undefined,
      p_civil_center_id: civilCenterId ?? undefined,
    })
    if (error) {
      console.warn('get_declaration_stats failed:', error.message)
      return null
    }
    return data as DashboardStats
  },

  subscribeToChanges(
    filter: { hospitalId?: string; civilCenterId?: string },
    callback: (payload: unknown) => void
  ) {
    const channel = supabase
      .channel('declarations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'birth_declarations',
          filter: filter.hospitalId
            ? `hospital_id=eq.${filter.hospitalId}`
            : filter.civilCenterId
              ? `civil_status_center_id=eq.${filter.civilCenterId}`
              : undefined,
        },
        callback
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}
