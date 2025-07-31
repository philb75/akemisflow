import { createClient } from '@supabase/supabase-js'

// Database types
export interface Supplier {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  companyName?: string | null
  vatNumber?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  accountNumber?: string | null
  accountName?: string | null
  bankName?: string | null
  swiftCode?: string | null
  airwallexBeneficiaryId?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  entityType: 'contractor' | 'entity'
  entityId: string
  documentType: 'ID' | 'PROOF_OF_ADDRESS' | 'BANK' | 'OTHER'
  uploadedBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  vatNumber?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Public client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase

// Database operations
export const db = {
  // Suppliers
  suppliers: {
    async findMany(options?: { where?: any; orderBy?: any; take?: number; skip?: number }) {
      let query = supabaseAdmin.from('suppliers').select('*')
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value)
          }
        })
      }
      
      if (options?.orderBy) {
        Object.entries(options.orderBy).forEach(([key, value]) => {
          query = query.order(key, { ascending: value === 'asc' })
        })
      }
      
      if (options?.take) {
        query = query.limit(options.take)
      }
      
      if (options?.skip) {
        query = query.range(options.skip, options.skip + (options.take || 10) - 1)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as Supplier[]
    },
    
    async findUnique(id: string) {
      const { data, error } = await supabaseAdmin
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as Supplier
    },
    
    async findFirst(where: any) {
      let query = supabaseAdmin.from('suppliers').select('*')
      
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.eq(key, value)
        }
      })
      
      const { data, error } = await query.limit(1).single()
      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return data as Supplier | null
    },
    
    async create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
      const { data: created, error } = await supabaseAdmin
        .from('suppliers')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return created as Supplier
    },
    
    async update(id: string, data: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>) {
      const { data: updated, error } = await supabaseAdmin
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return updated as Supplier
    },
    
    async delete(id: string) {
      const { error } = await supabaseAdmin
        .from('suppliers')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    
    async count(where?: any) {
      let query = supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true })
      
      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value)
          }
        })
      }
      
      const { count, error } = await query
      if (error) throw error
      return count || 0
    }
  },
  
  // Documents
  documents: {
    async findMany(options?: { where?: any; orderBy?: any; take?: number }) {
      let query = supabaseAdmin.from('documents').select('*')
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value)
          }
        })
      }
      
      if (options?.orderBy) {
        Object.entries(options.orderBy).forEach(([key, value]) => {
          query = query.order(key, { ascending: value === 'asc' })
        })
      }
      
      if (options?.take) {
        query = query.limit(options.take)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as Document[]
    },
    
    async create(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) {
      const { data: created, error } = await supabaseAdmin
        .from('documents')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return created as Document
    },
    
    async delete(id: string) {
      const { error } = await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    }
  },
  
  // Customers
  customers: {
    async findMany(options?: { orderBy?: any; take?: number }) {
      let query = supabaseAdmin.from('customers').select('*')
      
      if (options?.orderBy) {
        Object.entries(options.orderBy).forEach(([key, value]) => {
          query = query.order(key, { ascending: value === 'asc' })
        })
      }
      
      if (options?.take) {
        query = query.limit(options.take)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as Customer[]
    },
    
    async findUnique(id: string) {
      const { data, error } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as Customer
    }
  }
}